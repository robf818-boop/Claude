/**
 * The Risk Warden - Monitoring Module
 *
 * Hard-coded circuit breakers to stop trading during "Black Swan" events.
 * Monitors portfolio risk, drawdowns, and market conditions.
 *
 * The Warden stands guard, protecting capital from catastrophic losses.
 */

import {
  WardenConfig,
  Position,
  RiskMetrics,
  RiskLevel,
  CircuitBreaker,
  CircuitBreakerStatus,
  RiskAlert,
  ModuleStatus,
  TradingEvent,
  Greeks,
} from '../core/types';
import { EventBus, getEventBus } from '../events/EventBus';

interface PositionUpdateEvent {
  position: Position;
}

interface PositionClosedEvent {
  position: Position;
  pnl: number;
  reason?: string;
}

export class Warden {
  private config: WardenConfig;
  private eventBus: EventBus;
  private status: ModuleStatus = 'stopped';

  // Risk state
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private alerts: RiskAlert[] = [];
  private alertIdCounter: number = 0;

  // Position tracking (mirrors Executor's positions)
  private positions: Map<string, Position> = new Map();

  // P&L tracking
  private dailyStartingBalance: number = 0;
  private weeklyStartingBalance: number = 0;
  private peakBalance: number = 0;
  private currentBalance: number = 100000;

  // Trading state
  private isTradingPaused: boolean = false;
  private pauseReason: string = '';

  // Event subscriptions
  private subscriptionIds: string[] = [];

  // Monitoring interval
  private monitoringInterval?: NodeJS.Timeout;

  constructor(config: WardenConfig) {
    this.config = config;
    this.eventBus = getEventBus();
    this.initializeCircuitBreakers();
  }

  /**
   * Start the Warden
   */
  public async start(): Promise<void> {
    if (this.status === 'running') {
      console.warn('[Warden] Already running');
      return;
    }

    this.status = 'starting';
    console.log('[Warden] Starting risk monitoring...');

    // Initialize tracking
    this.dailyStartingBalance = this.currentBalance;
    this.weeklyStartingBalance = this.currentBalance;
    this.peakBalance = this.currentBalance;

    // Subscribe to position events
    const posOpenSubId = this.eventBus.subscribe<Position>(
      ['position_opened'],
      (event) => this.onPositionOpened(event),
      80 // High priority - risk first
    );
    this.subscriptionIds.push(posOpenSubId);

    const posUpdateSubId = this.eventBus.subscribe<Position>(
      ['position_updated'],
      (event) => this.onPositionUpdated(event),
      80
    );
    this.subscriptionIds.push(posUpdateSubId);

    const posCloseSubId = this.eventBus.subscribe<PositionClosedEvent>(
      ['position_closed'],
      (event) => this.onPositionClosed(event),
      80
    );
    this.subscriptionIds.push(posCloseSubId);

    // Start continuous monitoring
    this.monitoringInterval = setInterval(() => {
      this.runRiskChecks();
    }, 5000); // Every 5 seconds

    this.status = 'running';
    console.log('[Warden] Risk monitoring active');
    this.emitStatus();
  }

  /**
   * Stop the Warden
   */
  public stop(): void {
    this.status = 'stopped';

    // Unsubscribe from events
    this.subscriptionIds.forEach((id) => this.eventBus.unsubscribe(id));
    this.subscriptionIds = [];

    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log('[Warden] Stopped');
    this.emitStatus();
  }

  /**
   * Get current status
   */
  public getStatus(): ModuleStatus {
    return this.status;
  }

  /**
   * Check if trading is allowed
   */
  public isTradingAllowed(): { allowed: boolean; reason?: string } {
    // Check if paused
    if (this.isTradingPaused) {
      return { allowed: false, reason: this.pauseReason };
    }

    // Check trading hours
    if (!this.isWithinTradingHours()) {
      return { allowed: false, reason: 'Outside trading hours' };
    }

    // Check circuit breakers
    for (const [id, breaker] of this.circuitBreakers) {
      if (breaker.status === 'triggered') {
        return {
          allowed: false,
          reason: `Circuit breaker triggered: ${breaker.name}`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get current risk metrics
   */
  public getRiskMetrics(): RiskMetrics {
    // Calculate portfolio-level Greeks
    let netDelta = 0;
    let netGamma = 0;
    let netTheta = 0;
    let netVega = 0;
    let totalExposure = 0;

    this.positions.forEach((position) => {
      const multiplier = position.assetClass === 'option' ? 100 : 1;
      const positionValue = position.currentPrice * position.quantity * multiplier;
      totalExposure += positionValue;

      if (position.currentGreeks) {
        const sign = position.side === 'long' ? 1 : -1;
        netDelta += position.currentGreeks.delta * position.quantity * sign;
        netGamma += position.currentGreeks.gamma * position.quantity * sign;
        netTheta += position.currentGreeks.theta * position.quantity * sign;
        netVega += position.currentGreeks.vega * position.quantity * sign;
      }
    });

    // Calculate drawdowns
    const currentDrawdown = this.peakBalance > 0
      ? ((this.peakBalance - this.currentBalance) / this.peakBalance) * 100
      : 0;

    const dailyPnL = this.currentBalance - this.dailyStartingBalance;
    const dailyPnLPercent = this.dailyStartingBalance > 0
      ? (dailyPnL / this.dailyStartingBalance) * 100
      : 0;

    // Position metrics
    const openPositions = this.positions.size;
    const positionUtilization = (openPositions / this.config.maxOpenPositions) * 100;

    // Concentration risk
    let largestPosition = 0;
    this.positions.forEach((position) => {
      const value = position.currentPrice * position.quantity * (position.assetClass === 'option' ? 100 : 1);
      if (value > largestPosition) {
        largestPosition = value;
      }
    });
    const concentrationRisk = this.currentBalance > 0
      ? (largestPosition / this.currentBalance) * 100
      : 0;

    // Calculate overall risk level
    const riskScore = this.calculateRiskScore(
      currentDrawdown,
      dailyPnLPercent,
      positionUtilization,
      concentrationRisk
    );

    const riskLevel = this.determineRiskLevel(riskScore);

    return {
      totalExposure,
      netDelta,
      netGamma,
      netTheta,
      netVega,
      maxDrawdownPercent: this.config.maxTotalDrawdownPercent,
      currentDrawdownPercent: currentDrawdown,
      dailyPnL,
      dailyPnLPercent,
      openPositions,
      maxPositions: this.config.maxOpenPositions,
      positionUtilization,
      largestPosition,
      concentrationRisk,
      riskLevel,
      riskScore,
    };
  }

  /**
   * Get circuit breakers
   */
  public getCircuitBreakers(): CircuitBreaker[] {
    return Array.from(this.circuitBreakers.values());
  }

  /**
   * Get recent alerts
   */
  public getAlerts(limit: number = 50): RiskAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Manually pause trading
   */
  public pauseTrading(reason: string): void {
    this.isTradingPaused = true;
    this.pauseReason = reason;

    this.createAlert('warning', 'Manual Pause', `Trading paused: ${reason}`);
    console.log(`[Warden] Trading paused: ${reason}`);
  }

  /**
   * Resume trading
   */
  public resumeTrading(): void {
    // Check if any circuit breakers are still triggered
    for (const breaker of this.circuitBreakers.values()) {
      if (breaker.status === 'triggered') {
        console.log(
          `[Warden] Cannot resume - circuit breaker still triggered: ${breaker.name}`
        );
        return;
      }
    }

    this.isTradingPaused = false;
    this.pauseReason = '';

    this.createAlert('info', 'Resume', 'Trading resumed');
    console.log('[Warden] Trading resumed');
  }

  /**
   * Reset daily tracking (call at market open)
   */
  public resetDaily(): void {
    this.dailyStartingBalance = this.currentBalance;

    // Reset circuit breakers that have completed cooldown
    this.circuitBreakers.forEach((breaker) => {
      if (breaker.status === 'cooldown' && Date.now() > (breaker.cooldownUntil || 0)) {
        breaker.status = 'normal';
        breaker.triggeredAt = undefined;
        breaker.cooldownUntil = undefined;
      }
    });

    console.log('[Warden] Daily tracking reset');
  }

  /**
   * Reset weekly tracking (call at week start)
   */
  public resetWeekly(): void {
    this.weeklyStartingBalance = this.currentBalance;
    console.log('[Warden] Weekly tracking reset');
  }

  /**
   * Update account balance
   */
  public updateBalance(newBalance: number): void {
    this.currentBalance = newBalance;

    // Update peak balance
    if (newBalance > this.peakBalance) {
      this.peakBalance = newBalance;
    }
  }

  // Event Handlers

  private onPositionOpened(event: TradingEvent<Position>): void {
    const position = event.data;
    this.positions.set(position.id, position);

    // Check if we're exceeding position limits
    if (this.positions.size > this.config.maxOpenPositions) {
      this.createAlert(
        'warning',
        'Position Limit',
        `Position limit exceeded: ${this.positions.size}/${this.config.maxOpenPositions}`
      );
    }
  }

  private onPositionUpdated(event: TradingEvent<Position>): void {
    const position = event.data;
    this.positions.set(position.id, position);
  }

  private onPositionClosed(event: TradingEvent<PositionClosedEvent>): void {
    const { position, pnl } = event.data;
    this.positions.delete(position.id);

    // Update balance
    this.currentBalance += pnl;
    if (this.currentBalance > this.peakBalance) {
      this.peakBalance = this.currentBalance;
    }
  }

  // Circuit Breakers

  private initializeCircuitBreakers(): void {
    // Daily drawdown breaker
    this.circuitBreakers.set('daily_drawdown', {
      id: 'daily_drawdown',
      name: 'Daily Drawdown Limit',
      description: `Trading stops if daily loss exceeds ${this.config.maxDailyDrawdownPercent}%`,
      triggerType: 'drawdown',
      threshold: this.config.maxDailyDrawdownPercent,
      currentValue: 0,
      status: 'normal',
      action: 'pause_trading',
    });

    // Weekly drawdown breaker
    this.circuitBreakers.set('weekly_drawdown', {
      id: 'weekly_drawdown',
      name: 'Weekly Drawdown Limit',
      description: `Trading stops if weekly loss exceeds ${this.config.maxWeeklyDrawdownPercent}%`,
      triggerType: 'drawdown',
      threshold: this.config.maxWeeklyDrawdownPercent,
      currentValue: 0,
      status: 'normal',
      action: 'pause_trading',
    });

    // Total drawdown breaker
    this.circuitBreakers.set('total_drawdown', {
      id: 'total_drawdown',
      name: 'Total Drawdown Limit',
      description: `Trading stops if total drawdown exceeds ${this.config.maxTotalDrawdownPercent}%`,
      triggerType: 'drawdown',
      threshold: this.config.maxTotalDrawdownPercent,
      currentValue: 0,
      status: 'normal',
      action: 'close_positions',
    });

    // VIX/Volatility breaker
    this.circuitBreakers.set('volatility', {
      id: 'volatility',
      name: 'High Volatility',
      description: `Trading pauses if VIX exceeds ${this.config.maxVIX}`,
      triggerType: 'volatility',
      threshold: this.config.maxVIX,
      currentValue: 0,
      status: 'normal',
      action: 'pause_trading',
    });

    // Concentration breaker
    this.circuitBreakers.set('concentration', {
      id: 'concentration',
      name: 'Position Concentration',
      description: `Alert if single position exceeds ${this.config.maxConcentrationPercent}%`,
      triggerType: 'custom',
      threshold: this.config.maxConcentrationPercent,
      currentValue: 0,
      status: 'normal',
      action: 'alert_only',
    });

    // Add any custom circuit breakers from config
    this.config.circuitBreakers.forEach((cb) => {
      this.circuitBreakers.set(cb.id, {
        ...cb,
        status: 'normal',
        currentValue: 0,
      });
    });
  }

  private runRiskChecks(): void {
    const metrics = this.getRiskMetrics();

    // Check daily drawdown
    const dailyBreaker = this.circuitBreakers.get('daily_drawdown')!;
    dailyBreaker.currentValue = Math.abs(metrics.dailyPnLPercent);
    this.checkAndTriggerBreaker(dailyBreaker);

    // Check weekly drawdown
    const weeklyLoss = this.weeklyStartingBalance > 0
      ? ((this.weeklyStartingBalance - this.currentBalance) / this.weeklyStartingBalance) * 100
      : 0;
    const weeklyBreaker = this.circuitBreakers.get('weekly_drawdown')!;
    weeklyBreaker.currentValue = Math.max(0, weeklyLoss);
    this.checkAndTriggerBreaker(weeklyBreaker);

    // Check total drawdown
    const totalBreaker = this.circuitBreakers.get('total_drawdown')!;
    totalBreaker.currentValue = metrics.currentDrawdownPercent;
    this.checkAndTriggerBreaker(totalBreaker);

    // Check concentration
    const concBreaker = this.circuitBreakers.get('concentration')!;
    concBreaker.currentValue = metrics.concentrationRisk;
    this.checkAndTriggerBreaker(concBreaker);

    // Emit risk metrics
    if (metrics.riskLevel === 'high' || metrics.riskLevel === 'critical') {
      this.eventBus.emit(
        'risk_alert',
        {
          level: metrics.riskLevel,
          metrics,
        },
        'warden'
      );
    }
  }

  private checkAndTriggerBreaker(breaker: CircuitBreaker): void {
    if (breaker.status === 'triggered' || breaker.status === 'cooldown') {
      return; // Already triggered
    }

    if (breaker.currentValue >= breaker.threshold) {
      this.triggerCircuitBreaker(breaker);
    } else if (breaker.currentValue >= breaker.threshold * 0.8) {
      // Warning at 80% of threshold
      if (breaker.status !== 'warning') {
        breaker.status = 'warning';
        this.createAlert(
          'warning',
          breaker.name,
          `Approaching limit: ${breaker.currentValue.toFixed(1)}% / ${breaker.threshold}%`
        );
      }
    } else {
      breaker.status = 'normal';
    }
  }

  private triggerCircuitBreaker(breaker: CircuitBreaker): void {
    breaker.status = 'triggered';
    breaker.triggeredAt = Date.now();

    // Set cooldown (24 hours for drawdown breakers)
    if (breaker.triggerType === 'drawdown') {
      breaker.cooldownUntil = Date.now() + 24 * 60 * 60 * 1000;
    }

    console.log(`[Warden] CIRCUIT BREAKER TRIGGERED: ${breaker.name}`);

    this.createAlert(
      'critical',
      'Circuit Breaker',
      `${breaker.name} triggered at ${breaker.currentValue.toFixed(1)}%`
    );

    // Execute action
    switch (breaker.action) {
      case 'pause_trading':
        this.isTradingPaused = true;
        this.pauseReason = breaker.name;
        break;
      case 'close_positions':
        this.isTradingPaused = true;
        this.pauseReason = breaker.name;
        this.requestCloseAllPositions();
        break;
      case 'reduce_size':
        this.createAlert(
          'danger',
          'Risk Reduction',
          'Position size reduction required'
        );
        break;
      case 'alert_only':
        // Just the alert
        break;
    }

    // Emit circuit breaker event
    this.eventBus.emit('circuit_breaker_triggered', breaker, 'warden');
  }

  private requestCloseAllPositions(): void {
    this.createAlert(
      'critical',
      'Emergency Close',
      'Requesting closure of all positions'
    );

    // Note: In a real system, this would communicate with Executor
    console.log('[Warden] EMERGENCY: Requesting all positions to be closed');
  }

  // Helper Methods

  private isWithinTradingHours(): boolean {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();

    // Check trading days
    if (!this.config.tradingDays.includes(day)) {
      return false;
    }

    // Check trading hours
    return hour >= this.config.tradingStartHour && hour < this.config.tradingEndHour;
  }

  private calculateRiskScore(
    drawdown: number,
    dailyPnL: number,
    positionUtil: number,
    concentration: number
  ): number {
    // Weighted risk score (0-100)
    let score = 0;

    // Drawdown contributes 40%
    score += Math.min(40, (drawdown / this.config.maxTotalDrawdownPercent) * 40);

    // Daily P&L contributes 25%
    if (dailyPnL < 0) {
      score += Math.min(25, (Math.abs(dailyPnL) / this.config.maxDailyDrawdownPercent) * 25);
    }

    // Position utilization contributes 20%
    score += (positionUtil / 100) * 20;

    // Concentration contributes 15%
    score += Math.min(15, (concentration / this.config.maxConcentrationPercent) * 15);

    return Math.min(100, score);
  }

  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'elevated';
    return 'low';
  }

  private createAlert(
    level: 'info' | 'warning' | 'danger' | 'critical',
    category: string,
    message: string,
    data?: Record<string, unknown>
  ): void {
    const alert: RiskAlert = {
      id: `alert_${++this.alertIdCounter}_${Date.now()}`,
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      acknowledged: false,
    };

    this.alerts.push(alert);

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500);
    }

    // Log critical alerts
    if (level === 'critical' || level === 'danger') {
      console.log(`[Warden] ALERT (${level.toUpperCase()}): ${message}`);
    }
  }

  private emitStatus(): void {
    this.eventBus.emit(
      'system_status',
      {
        module: 'warden',
        status: this.status,
      },
      'warden'
    );
  }
}

// Default Warden configuration
export const defaultWardenConfig: WardenConfig = {
  maxDailyDrawdownPercent: 3,
  maxWeeklyDrawdownPercent: 7,
  maxTotalDrawdownPercent: 15,
  maxOpenPositions: 10,
  maxConcentrationPercent: 25,
  tradingStartHour: 9,
  tradingEndHour: 16,
  tradingDays: [1, 2, 3, 4, 5], // Monday-Friday
  maxVIX: 35,
  pauseOnHighVolatility: true,
  circuitBreakers: [],
};
