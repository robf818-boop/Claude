/**
 * Event Bus - The Central Nervous System
 *
 * This module provides the event-driven communication backbone for all trading components.
 * It enables loose coupling between modules while maintaining real-time reactivity.
 */

import {
  EventType,
  TradingEvent,
  EventSubscription,
} from '../core/types';

type EventCallback<T = unknown> = (event: TradingEvent<T>) => void | Promise<void>;

interface QueuedEvent {
  event: TradingEvent;
  retryCount: number;
}

export class EventBus {
  private static instance: EventBus;

  private subscriptions: Map<EventType, EventSubscription[]> = new Map();
  private allEventSubscriptions: EventSubscription[] = [];
  private eventHistory: TradingEvent[] = [];
  private maxHistorySize: number = 1000;
  private eventQueue: QueuedEvent[] = [];
  private isProcessing: boolean = false;
  private maxRetries: number = 3;
  private eventIdCounter: number = 0;

  // Metrics
  private eventCounts: Map<EventType, number> = new Map();
  private lastEventTime: Map<EventType, number> = new Map();

  private constructor() {
    // Initialize event counts for all event types
    const eventTypes: EventType[] = [
      'candle_update',
      'option_chain_update',
      'signal_generated',
      'order_submitted',
      'order_filled',
      'order_cancelled',
      'position_opened',
      'position_closed',
      'position_updated',
      'risk_alert',
      'circuit_breaker_triggered',
      'system_status',
    ];

    eventTypes.forEach((type) => {
      this.subscriptions.set(type, []);
      this.eventCounts.set(type, 0);
    });
  }

  /**
   * Get the singleton instance of EventBus
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Reset the singleton (useful for testing)
   */
  public static reset(): void {
    EventBus.instance = new EventBus();
  }

  /**
   * Subscribe to specific event types
   */
  public subscribe<T = unknown>(
    eventTypes: EventType[],
    callback: EventCallback<T>,
    priority: number = 0
  ): string {
    const subscriptionId = this.generateSubscriptionId();

    const subscription: EventSubscription = {
      id: subscriptionId,
      eventTypes,
      callback: callback as EventCallback,
      priority,
    };

    eventTypes.forEach((type) => {
      const subs = this.subscriptions.get(type) || [];
      subs.push(subscription);
      // Sort by priority (higher priority first)
      subs.sort((a, b) => b.priority - a.priority);
      this.subscriptions.set(type, subs);
    });

    return subscriptionId;
  }

  /**
   * Subscribe to ALL events
   */
  public subscribeAll(
    callback: EventCallback,
    priority: number = 0
  ): string {
    const subscriptionId = this.generateSubscriptionId();

    const subscription: EventSubscription = {
      id: subscriptionId,
      eventTypes: [],
      callback,
      priority,
    };

    this.allEventSubscriptions.push(subscription);
    this.allEventSubscriptions.sort((a, b) => b.priority - a.priority);

    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  public unsubscribe(subscriptionId: string): boolean {
    let found = false;

    // Remove from specific event subscriptions
    this.subscriptions.forEach((subs, eventType) => {
      const filtered = subs.filter((s) => s.id !== subscriptionId);
      if (filtered.length !== subs.length) {
        found = true;
        this.subscriptions.set(eventType, filtered);
      }
    });

    // Remove from all-event subscriptions
    const allFiltered = this.allEventSubscriptions.filter(
      (s) => s.id !== subscriptionId
    );
    if (allFiltered.length !== this.allEventSubscriptions.length) {
      found = true;
      this.allEventSubscriptions = allFiltered;
    }

    return found;
  }

  /**
   * Publish an event (async, non-blocking)
   */
  public emit<T = unknown>(
    type: EventType,
    data: T,
    source: string
  ): string {
    const event = this.createEvent(type, data, source);

    // Add to queue for processing
    this.eventQueue.push({ event, retryCount: 0 });

    // Store in history
    this.addToHistory(event);

    // Update metrics
    this.updateMetrics(type);

    // Process queue if not already processing
    this.processQueue();

    return event.id;
  }

  /**
   * Publish an event and wait for all handlers to complete
   */
  public async emitSync<T = unknown>(
    type: EventType,
    data: T,
    source: string
  ): Promise<void> {
    const event = this.createEvent(type, data, source);

    // Store in history
    this.addToHistory(event);

    // Update metrics
    this.updateMetrics(type);

    // Process immediately
    await this.dispatchEvent(event);
  }

  /**
   * Get recent events of a specific type
   */
  public getRecentEvents(
    type?: EventType,
    limit: number = 100
  ): TradingEvent[] {
    let events = this.eventHistory;

    if (type) {
      events = events.filter((e) => e.type === type);
    }

    return events.slice(-limit);
  }

  /**
   * Get event statistics
   */
  public getStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    queueSize: number;
    lastEventTimes: Record<string, number>;
  } {
    const eventsByType: Record<string, number> = {};
    const lastEventTimes: Record<string, number> = {};

    this.eventCounts.forEach((count, type) => {
      eventsByType[type] = count;
    });

    this.lastEventTime.forEach((time, type) => {
      lastEventTimes[type] = time;
    });

    return {
      totalEvents: this.eventHistory.length,
      eventsByType,
      queueSize: this.eventQueue.length,
      lastEventTimes,
    };
  }

  /**
   * Wait for specific event type to occur
   */
  public waitForEvent<T = unknown>(
    type: EventType,
    timeout: number = 30000,
    predicate?: (data: T) => boolean
  ): Promise<TradingEvent<T>> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.unsubscribe(subId);
        reject(new Error(`Timeout waiting for event: ${type}`));
      }, timeout);

      const subId = this.subscribe<T>(
        [type],
        (event) => {
          if (!predicate || predicate(event.data)) {
            clearTimeout(timeoutId);
            this.unsubscribe(subId);
            resolve(event);
          }
        },
        100 // High priority for wait handlers
      );
    });
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.eventHistory = [];
  }

  // Private Methods

  private createEvent<T>(
    type: EventType,
    data: T,
    source: string
  ): TradingEvent<T> {
    return {
      id: `evt_${Date.now()}_${++this.eventIdCounter}`,
      type,
      timestamp: Date.now(),
      source,
      data,
    };
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToHistory(event: TradingEvent): void {
    this.eventHistory.push(event);

    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize / 2);
    }
  }

  private updateMetrics(type: EventType): void {
    const currentCount = this.eventCounts.get(type) || 0;
    this.eventCounts.set(type, currentCount + 1);
    this.lastEventTime.set(type, Date.now());
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const item = this.eventQueue.shift();
      if (!item) continue;

      try {
        await this.dispatchEvent(item.event);
      } catch (error) {
        console.error(`Error dispatching event ${item.event.id}:`, error);

        // Retry logic
        if (item.retryCount < this.maxRetries) {
          item.retryCount++;
          this.eventQueue.push(item);
        } else {
          console.error(
            `Event ${item.event.id} failed after ${this.maxRetries} retries`
          );
        }
      }
    }

    this.isProcessing = false;
  }

  private async dispatchEvent(event: TradingEvent): Promise<void> {
    const typeSubscriptions = this.subscriptions.get(event.type) || [];
    const allSubscriptions = [...typeSubscriptions, ...this.allEventSubscriptions];

    // De-duplicate subscriptions (in case same subscription is in both)
    const uniqueSubscriptions = allSubscriptions.filter(
      (sub, index, self) => index === self.findIndex((s) => s.id === sub.id)
    );

    // Sort by priority
    uniqueSubscriptions.sort((a, b) => b.priority - a.priority);

    // Dispatch to all subscribers
    await Promise.all(
      uniqueSubscriptions.map(async (sub) => {
        try {
          await sub.callback(event);
        } catch (error) {
          console.error(
            `Subscriber ${sub.id} error for event ${event.type}:`,
            error
          );
        }
      })
    );
  }
}

// Export singleton getter for convenience
export const getEventBus = (): EventBus => EventBus.getInstance();
