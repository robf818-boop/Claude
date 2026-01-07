/**
 * AutoFlipper - The Main Orchestrator
 *
 * Coordinates all four trading modules:
 * - Sentinel (Data Ingestion)
 * - Oracle (Analysis)
 * - Executor (Order Management)
 * - Warden (Risk Monitoring)
 *
 * Provides unified control and real-time status for the event-driven trading system.
 */

import {
  AutoFlipperConfig,
  SystemStatus,
  ModuleStatus,
  TradingSignal,
  Position,
  Order,
  RiskMetrics,
  CircuitBreaker,
  RiskAlert,
  TechnicalSnapshot,
  Candle,
  CandleInterval,
  OptionChain,
  TradingEvent,
} from './core/types';
import { EventBus, getEventBus } from './events/EventBus';
import { Sentinel } from './sentinel/Sentinel';
import { Oracle, defaultOracleConfig } from './oracle/Oracle';
import { Executor, defaultExecutorConfig } from './executor/Executor';
import { Warden, defaultWardenConfig } from './warden/Warden';

export class AutoFlipper {
  private config: AutoFlipperConfig;
  private eventBus: EventBus;

  // The Four Brains
  private sentinel: Sentinel;
  private oracle: Oracle;
  private executor: Executor;
  private warden: Warden;

  // System state
  private systemStatus: SystemStatus = {
    sentinel: 'stopped',
    oracle: 'stopped',
    executor: 'stopped',
    warden: 'stopped',
    isRunning: false,
    isPaused: false,
    errorCount: 0,
  };

  // Auto-trade state
  private autoTradeEnabled: boolean = false;
  private autoTradeSettings: {
    minConfluenceScore: number;
    minStrength: 'weak' | 'moderate' | 'strong' | 'extreme';
    maxDailyTrades: number;
    maxConcurrentPositions: number;
    tradesToday: number;
  } = {
    minConfluenceScore: 60,
    minStrength: 'moderate',
    maxDailyTrades: 10,
    maxConcurrentPositions: 5,
    tradesToday: 0,
  };

  // Event listeners for external callbacks
  private eventListeners: Map<string, ((event: TradingEvent) => void)[]> = new Map();

  constructor(config: Partial<AutoFlipperConfig>) {
    // Merge with defaults
    this.config = this.mergeWithDefaults(config);

    // Get event bus instance
    this.eventBus = getEventBus();

    // Initialize modules
    this.sentinel = new Sentinel(this.config.sentinel);
    this.oracle = new Oracle(this.config.oracle);
    this.executor = new Executor(this.config.executor);
    this.warden = new Warden(this.config.warden);

    // Setup internal event handling
    this.setupEventHandling();

    console.log('[AutoFlipper] Initialized');
  }

  /**
   * Start the AutoFlipper system
   */
  public async start(): Promise<void> {
    if (this.systemStatus.isRunning) {
      console.warn('[AutoFlipper] Already running');
      return;
    }

    console.log('[AutoFlipper] Starting all modules...');

    try {
      // Start in order: Warden first (risk), then Sentinel (data), Oracle (analysis), Executor (orders)
      await this.warden.start();
      this.systemStatus.warden = this.warden.getStatus();

      await this.sentinel.start();
      this.systemStatus.sentinel = this.sentinel.getStatus();

      await this.oracle.start();
      this.systemStatus.oracle = this.oracle.getStatus();

      await this.executor.start();
      this.systemStatus.executor = this.executor.getStatus();

      this.systemStatus.isRunning = true;
      this.systemStatus.startedAt = Date.now();

      console.log('[AutoFlipper] All modules started successfully');
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    AUTO-FLIPPER ACTIVE                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Sentinel: ${this.pad(this.systemStatus.sentinel, 10)} │ Oracle: ${this.pad(this.systemStatus.oracle, 10)}   ║
║  Executor: ${this.pad(this.systemStatus.executor, 10)} │ Warden: ${this.pad(this.systemStatus.warden, 10)}   ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    } catch (error) {
      this.systemStatus.errorCount++;
      this.systemStatus.lastError = error instanceof Error ? error.message : String(error);
      console.error('[AutoFlipper] Failed to start:', error);
      throw error;
    }
  }

  /**
   * Stop the AutoFlipper system
   */
  public async stop(): Promise<void> {
    if (!this.systemStatus.isRunning) {
      console.warn('[AutoFlipper] Already stopped');
      return;
    }

    console.log('[AutoFlipper] Stopping all modules...');

    // Stop in reverse order
    this.executor.stop();
    this.systemStatus.executor = this.executor.getStatus();

    this.oracle.stop();
    this.systemStatus.oracle = this.oracle.getStatus();

    this.sentinel.stop();
    this.systemStatus.sentinel = this.sentinel.getStatus();

    this.warden.stop();
    this.systemStatus.warden = this.warden.getStatus();

    this.systemStatus.isRunning = false;
    this.systemStatus.isPaused = false;
    this.systemStatus.uptime = this.systemStatus.startedAt
      ? Date.now() - this.systemStatus.startedAt
      : 0;

    console.log('[AutoFlipper] All modules stopped');
  }

  /**
   * Pause trading (keeps data flowing, stops execution)
   */
  public pause(reason: string = 'Manual pause'): void {
    this.warden.pauseTrading(reason);
    this.systemStatus.isPaused = true;
    console.log(`[AutoFlipper] Paused: ${reason}`);
  }

  /**
   * Resume trading
   */
  public resume(): void {
    this.warden.resumeTrading();
    this.systemStatus.isPaused = false;
    console.log('[AutoFlipper] Resumed');
  }

  /**
   * Get system status
   */
  public getStatus(): SystemStatus {
    this.systemStatus.sentinel = this.sentinel.getStatus();
    this.systemStatus.oracle = this.oracle.getStatus();
    this.systemStatus.executor = this.executor.getStatus();
    this.systemStatus.warden = this.warden.getStatus();

    if (this.systemStatus.startedAt) {
      this.systemStatus.uptime = Date.now() - this.systemStatus.startedAt;
    }

    return { ...this.systemStatus };
  }

  /**
   * Check if trading is allowed
   */
  public canTrade(): { allowed: boolean; reason?: string } {
    return this.warden.isTradingAllowed();
  }

  // ============================================================================
  // DATA ACCESS METHODS
  // ============================================================================

  /**
   * Get candle history for a symbol
   */
  public getCandles(symbol: string, interval: CandleInterval): Candle[] {
    return this.sentinel.getCandles(symbol, interval);
  }

  /**
   * Get option chain for underlying
   */
  public getOptionChain(underlying: string): OptionChain | null {
    return this.sentinel.getOptionChain(underlying);
  }

  /**
   * Get technical snapshot for a symbol
   */
  public getTechnicalSnapshot(symbol: string): TechnicalSnapshot | null {
    return this.oracle.getSnapshot(symbol);
  }

  /**
   * Get all active signals
   */
  public getActiveSignals(): TradingSignal[] {
    return this.oracle.getActiveSignals();
  }

  /**
   * Get all orders
   */
  public getOrders(): Order[] {
    return this.executor.getOrders();
  }

  /**
   * Get all positions
   */
  public getPositions(): Position[] {
    return this.executor.getPositions();
  }

  /**
   * Get account information
   */
  public getAccountInfo(): {
    balance: number;
    buyingPower: number;
    equity: number;
    openPnL: number;
  } {
    return this.executor.getAccountInfo();
  }

  /**
   * Get risk metrics
   */
  public getRiskMetrics(): RiskMetrics {
    return this.warden.getRiskMetrics();
  }

  /**
   * Get circuit breakers
   */
  public getCircuitBreakers(): CircuitBreaker[] {
    return this.warden.getCircuitBreakers();
  }

  /**
   * Get risk alerts
   */
  public getAlerts(limit?: number): RiskAlert[] {
    return this.warden.getAlerts(limit);
  }

  // ============================================================================
  // ACTION METHODS
  // ============================================================================

  /**
   * Manually execute a signal
   */
  public async executeSignal(signalId: string): Promise<{
    success: boolean;
    order?: Order;
    error?: string;
  }> {
    const signal = this.oracle.getSignal(signalId);
    if (!signal) {
      return { success: false, error: 'Signal not found' };
    }

    // Check if trading is allowed
    const canTrade = this.canTrade();
    if (!canTrade.allowed) {
      return { success: false, error: canTrade.reason };
    }

    // Get option chain if needed
    const optionChain = this.sentinel.getOptionChain(signal.symbol);

    return this.executor.executeSignal(signal, optionChain || undefined);
  }

  /**
   * Close a position
   */
  public async closePosition(positionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    return this.executor.closePosition(positionId, 'Manual close');
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(orderId: string): Promise<boolean> {
    return this.executor.cancelOrder(orderId);
  }

  /**
   * Acknowledge a risk alert
   */
  public acknowledgeAlert(alertId: string): boolean {
    return this.warden.acknowledgeAlert(alertId);
  }

  // ============================================================================
  // AUTO-TRADE METHODS
  // ============================================================================

  /**
   * Enable or disable auto-trading
   */
  public setAutoTrade(enabled: boolean): void {
    this.autoTradeEnabled = enabled;
    console.log(`[AutoFlipper] Auto-trade ${enabled ? 'ENABLED' : 'DISABLED'}`);

    // Reset daily counter at start of day
    if (enabled) {
      this.autoTradeSettings.tradesToday = 0;
    }
  }

  /**
   * Check if auto-trade is enabled
   */
  public isAutoTradeEnabled(): boolean {
    return this.autoTradeEnabled;
  }

  /**
   * Get auto-trade settings
   */
  public getAutoTradeSettings(): typeof this.autoTradeSettings {
    return { ...this.autoTradeSettings };
  }

  /**
   * Update auto-trade settings
   */
  public updateAutoTradeSettings(settings: Partial<typeof this.autoTradeSettings>): void {
    this.autoTradeSettings = { ...this.autoTradeSettings, ...settings };
    console.log('[AutoFlipper] Auto-trade settings updated:', this.autoTradeSettings);
  }

  /**
   * Handle automatic signal execution
   */
  private async handleAutoTrade(signal: TradingSignal): Promise<void> {
    // Check if auto-trade is enabled
    if (!this.autoTradeEnabled) {
      return;
    }

    // Check if system is paused
    if (this.systemStatus.isPaused) {
      console.log('[AutoFlipper] Auto-trade skipped: System paused');
      return;
    }

    // Check daily trade limit
    if (this.autoTradeSettings.tradesToday >= this.autoTradeSettings.maxDailyTrades) {
      console.log('[AutoFlipper] Auto-trade skipped: Daily trade limit reached');
      return;
    }

    // Check concurrent positions limit
    const positions = this.executor.getPositions();
    if (positions.length >= this.autoTradeSettings.maxConcurrentPositions) {
      console.log('[AutoFlipper] Auto-trade skipped: Max concurrent positions reached');
      return;
    }

    // Check if we already have a position in this symbol
    const existingPosition = positions.find(p => p.symbol === signal.symbol);
    if (existingPosition) {
      console.log(`[AutoFlipper] Auto-trade skipped: Already have position in ${signal.symbol}`);
      return;
    }

    // Check confluence score
    if (signal.confluenceScore < this.autoTradeSettings.minConfluenceScore) {
      console.log(`[AutoFlipper] Auto-trade skipped: Confluence ${signal.confluenceScore} below minimum ${this.autoTradeSettings.minConfluenceScore}`);
      return;
    }

    // Check signal strength
    const strengthOrder = ['weak', 'moderate', 'strong', 'extreme'];
    const signalStrengthIndex = strengthOrder.indexOf(signal.strength);
    const minStrengthIndex = strengthOrder.indexOf(this.autoTradeSettings.minStrength);
    if (signalStrengthIndex < minStrengthIndex) {
      console.log(`[AutoFlipper] Auto-trade skipped: Strength ${signal.strength} below minimum ${this.autoTradeSettings.minStrength}`);
      return;
    }

    // Check if trading is allowed (risk checks)
    const canTrade = this.canTrade();
    if (!canTrade.allowed) {
      console.log(`[AutoFlipper] Auto-trade skipped: ${canTrade.reason}`);
      return;
    }

    // Execute the trade!
    console.log(`[AutoFlipper] AUTO-EXECUTING: ${signal.direction.toUpperCase()} ${signal.symbol} (confluence: ${signal.confluenceScore}, strength: ${signal.strength})`);

    const result = await this.executeSignal(signal.id);

    if (result.success) {
      this.autoTradeSettings.tradesToday++;
      console.log(`[AutoFlipper] Auto-trade SUCCESS: Order ${result.order?.id} | Trades today: ${this.autoTradeSettings.tradesToday}`);
    } else {
      console.log(`[AutoFlipper] Auto-trade FAILED: ${result.error}`);
    }
  }

  // ============================================================================
  // EVENT SUBSCRIPTION
  // ============================================================================

  /**
   * Subscribe to AutoFlipper events
   */
  public on(
    eventType: string,
    callback: (event: TradingEvent) => void
  ): string {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);

    // Return unsubscribe function identifier
    return `${eventType}_${this.eventListeners.get(eventType)!.length - 1}`;
  }

  /**
   * Unsubscribe from events
   */
  public off(subscriptionId: string): void {
    const [eventType, indexStr] = subscriptionId.split('_');
    const index = parseInt(indexStr, 10);

    const listeners = this.eventListeners.get(eventType);
    if (listeners && listeners[index]) {
      listeners.splice(index, 1);
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private setupEventHandling(): void {
    // Subscribe to all events and forward to listeners
    this.eventBus.subscribeAll((event) => {
      const listeners = this.eventListeners.get(event.type);
      if (listeners) {
        listeners.forEach((callback) => callback(event));
      }

      // Also notify 'all' listeners
      const allListeners = this.eventListeners.get('all');
      if (allListeners) {
        allListeners.forEach((callback) => callback(event));
      }
    });

    // Handle system status updates
    this.eventBus.subscribe<{ module: string; status: ModuleStatus }>(
      ['system_status'],
      (event) => {
        const { module, status } = event.data;
        switch (module) {
          case 'sentinel':
            this.systemStatus.sentinel = status;
            break;
          case 'oracle':
            this.systemStatus.oracle = status;
            break;
          case 'executor':
            this.systemStatus.executor = status;
            break;
          case 'warden':
            this.systemStatus.warden = status;
            break;
        }
      }
    );

    // Handle auto-trading on new signals
    this.eventBus.subscribe<TradingSignal>(
      ['signal_generated'],
      (event) => {
        this.handleAutoTrade(event.data);
      },
      100 // High priority - execute quickly
    );
  }

  private mergeWithDefaults(config: Partial<AutoFlipperConfig>): AutoFlipperConfig {
    return {
      sentinel: config.sentinel || {
        symbols: ['SPY', 'QQQ'],
        intervals: ['5m', '15m'],
        fetchOptionChain: true,
        optionChainExpirations: 4,
        updateIntervalMs: 60000, // 1 minute
        dataSource: 'mock',
      },
      oracle: config.oracle || defaultOracleConfig,
      executor: config.executor || defaultExecutorConfig,
      warden: config.warden || defaultWardenConfig,
      logLevel: config.logLevel || 'info',
      persistState: config.persistState || false,
      stateFile: config.stateFile,
    };
  }

  private pad(str: string, length: number): string {
    return str.padEnd(length);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create an AutoFlipper instance with sensible defaults
 */
export function createAutoFlipper(
  symbols: string[] = ['SPY', 'QQQ'],
  options: {
    paperTrading?: boolean;
    updateIntervalMs?: number;
    fetchOptions?: boolean;
  } = {}
): AutoFlipper {
  const {
    paperTrading = true,
    updateIntervalMs = 60000,
    fetchOptions = true,
  } = options;

  return new AutoFlipper({
    sentinel: {
      symbols,
      intervals: ['5m', '15m', '1h'],
      fetchOptionChain: fetchOptions,
      optionChainExpirations: 4,
      updateIntervalMs,
      dataSource: 'mock',
    },
    executor: {
      ...defaultExecutorConfig,
      paperTrading,
    },
  });
}

// ============================================================================
// EXPORT ALL MODULES
// ============================================================================

export { Sentinel } from './sentinel/Sentinel';
export { Oracle, defaultOracleConfig } from './oracle/Oracle';
export { Executor, defaultExecutorConfig } from './executor/Executor';
export { Warden, defaultWardenConfig } from './warden/Warden';
export { EventBus, getEventBus } from './events/EventBus';
export * from './core/types';
export * from './utils/indicators';
