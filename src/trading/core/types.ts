/**
 * Core Types for Event-Driven Options Auto-Flipper
 *
 * This module defines all TypeScript interfaces and types for the trading system.
 * Following an event-driven architecture for real-time options and futures trading.
 */

// ============================================================================
// MARKET DATA TYPES
// ============================================================================

export type AssetClass = 'equity' | 'option' | 'future' | 'index';
export type OptionType = 'call' | 'put';
export type Side = 'long' | 'short';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderStatus = 'pending' | 'filled' | 'partial' | 'cancelled' | 'rejected';
export type TimeInForce = 'day' | 'gtc' | 'ioc' | 'fok';

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Candle extends OHLCV {
  symbol: string;
  interval: CandleInterval;
  vwap?: number;
  trades?: number;
}

export type CandleInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

// ============================================================================
// OPTIONS-SPECIFIC TYPES
// ============================================================================

export interface Greeks {
  delta: number;      // Price sensitivity to underlying (-1 to 1)
  gamma: number;      // Delta's rate of change
  theta: number;      // Time decay (negative for long positions)
  vega: number;       // Sensitivity to volatility
  rho: number;        // Sensitivity to interest rates
}

export interface OptionContract {
  symbol: string;           // e.g., "AAPL240119C00190000"
  underlying: string;       // e.g., "AAPL"
  optionType: OptionType;
  strike: number;
  expiration: Date;
  daysToExpiration: number;

  // Pricing
  bid: number;
  ask: number;
  last: number;
  mark: number;             // Mid-point

  // Greeks
  greeks: Greeks;

  // Volatility
  impliedVolatility: number;  // IV as decimal (0.25 = 25%)
  historicalVolatility?: number;
  ivRank?: number;            // IV percentile over past year (0-100)
  ivPercentile?: number;

  // Volume & Interest
  volume: number;
  openInterest: number;
  volumeOIRatio?: number;

  // Calculated Fields
  intrinsicValue: number;
  extrinsicValue: number;
  inTheMoney: boolean;

  // Metadata
  lastUpdated: number;
}

export interface OptionChain {
  underlying: string;
  underlyingPrice: number;
  expirations: Date[];
  strikes: number[];
  calls: Map<string, OptionContract>;  // Keyed by "strike_expiration"
  puts: Map<string, OptionContract>;
  lastUpdated: number;
}

// ============================================================================
// FUTURES-SPECIFIC TYPES
// ============================================================================

export interface FuturesContract {
  symbol: string;           // e.g., "ESH24"
  underlying: string;       // e.g., "ES" (S&P 500 E-mini)
  expiration: Date;

  // Pricing
  bid: number;
  ask: number;
  last: number;
  settlement: number;

  // Contract specs
  multiplier: number;       // e.g., 50 for ES
  tickSize: number;         // e.g., 0.25 for ES
  tickValue: number;        // e.g., 12.50 for ES

  // Market Data
  volume: number;
  openInterest: number;

  // Basis
  basis?: number;           // Futures price - Spot price
  basisPercent?: number;

  lastUpdated: number;
}

// ============================================================================
// SIGNAL & ANALYSIS TYPES
// ============================================================================

export type SignalStrength = 'weak' | 'moderate' | 'strong' | 'extreme';
export type SignalDirection = 'bullish' | 'bearish' | 'neutral';

export interface TradingSignal {
  id: string;
  timestamp: number;
  symbol: string;
  direction: SignalDirection;
  strength: SignalStrength;

  // Signal Source
  source: string;           // Which indicator generated this
  confluenceScore: number;  // 0-100, how many indicators agree

  // Technical Levels
  entry: number;
  stopLoss: number;
  takeProfit: number[];     // Multiple targets

  // Risk Metrics
  riskRewardRatio: number;
  maxRiskPercent: number;

  // Option-Specific Recommendations
  optionRecommendation?: OptionRecommendation;

  // Validity
  expiresAt: number;
  isValid: boolean;
  invalidReason?: string;
}

export interface OptionRecommendation {
  strategy: OptionStrategy;
  preferredDelta: number;           // e.g., 0.70 for ITM calls
  preferredDTE: number;             // Days to expiration target
  maxIVRank?: number;               // Don't buy if IV too high
  minOpenInterest: number;
  maxBidAskSpread: number;          // As percentage
  contracts: number;
}

export type OptionStrategy =
  | 'long_call'
  | 'long_put'
  | 'short_call'
  | 'short_put'
  | 'call_spread'
  | 'put_spread'
  | 'iron_condor'
  | 'straddle'
  | 'strangle'
  | 'butterfly';

// ============================================================================
// TECHNICAL INDICATORS
// ============================================================================

export interface EMAValues {
  fast: number;       // Short-term EMA (e.g., 9)
  slow: number;       // Long-term EMA (e.g., 21)
  trend: number;      // Trend EMA (e.g., 50 or 200)
  crossover: 'bullish' | 'bearish' | 'none';
  distance: number;   // Distance between fast and slow as %
}

export interface RSIValues {
  value: number;      // 0-100
  isOverbought: boolean;
  isOversold: boolean;
  divergence?: 'bullish' | 'bearish' | 'none';
}

export interface ATRValues {
  value: number;
  percent: number;    // ATR as % of price
  expanding: boolean; // Volatility increasing
  contracting: boolean;
}

export interface MACDValues {
  macd: number;
  signal: number;
  histogram: number;
  crossover: 'bullish' | 'bearish' | 'none';
}

export interface VolumeAnalysis {
  current: number;
  average: number;
  ratio: number;      // Current / Average
  isAboveAverage: boolean;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface TechnicalSnapshot {
  symbol: string;
  timestamp: number;
  price: number;

  ema: EMAValues;
  rsi: RSIValues;
  atr: ATRValues;
  macd: MACDValues;
  volume: VolumeAnalysis;

  // Support/Resistance
  support: number[];
  resistance: number[];

  // Overall Assessment
  trend: 'bullish' | 'bearish' | 'sideways';
  momentum: 'accelerating' | 'decelerating' | 'neutral';
  volatility: 'low' | 'normal' | 'high' | 'extreme';
}

// ============================================================================
// ORDER & POSITION TYPES
// ============================================================================

export interface Order {
  id: string;
  clientOrderId: string;
  timestamp: number;

  // Instrument
  symbol: string;
  assetClass: AssetClass;
  optionContract?: OptionContract;

  // Order Details
  side: Side;
  quantity: number;
  filledQuantity: number;
  orderType: OrderType;
  timeInForce: TimeInForce;

  // Pricing
  limitPrice?: number;
  stopPrice?: number;
  avgFillPrice?: number;

  // Status
  status: OrderStatus;
  statusMessage?: string;

  // Timestamps
  submittedAt: number;
  filledAt?: number;
  cancelledAt?: number;
}

export interface Position {
  id: string;
  symbol: string;
  assetClass: AssetClass;

  // Size
  side: Side;
  quantity: number;
  avgEntryPrice: number;

  // P&L
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;

  // Option-Specific
  optionContract?: OptionContract;
  currentGreeks?: Greeks;

  // Risk Levels
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: number;

  // Timestamps
  openedAt: number;
  lastUpdated: number;
}

// ============================================================================
// RISK MANAGEMENT TYPES
// ============================================================================

export type RiskLevel = 'low' | 'elevated' | 'high' | 'critical';
export type CircuitBreakerStatus = 'normal' | 'warning' | 'triggered' | 'cooldown';

export interface RiskMetrics {
  // Portfolio Level
  totalExposure: number;
  netDelta: number;
  netGamma: number;
  netTheta: number;
  netVega: number;

  // Risk Limits
  maxDrawdownPercent: number;
  currentDrawdownPercent: number;
  dailyPnL: number;
  dailyPnLPercent: number;

  // Position Limits
  openPositions: number;
  maxPositions: number;
  positionUtilization: number;

  // Concentration
  largestPosition: number;
  concentrationRisk: number;

  // Overall Assessment
  riskLevel: RiskLevel;
  riskScore: number;  // 0-100
}

export interface CircuitBreaker {
  id: string;
  name: string;
  description: string;

  // Trigger Conditions
  triggerType: 'drawdown' | 'loss' | 'volatility' | 'time' | 'custom';
  threshold: number;
  currentValue: number;

  // Status
  status: CircuitBreakerStatus;
  triggeredAt?: number;
  cooldownUntil?: number;

  // Actions
  action: 'pause_trading' | 'close_positions' | 'reduce_size' | 'alert_only';
}

export interface RiskAlert {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'danger' | 'critical';
  category: string;
  message: string;
  data?: Record<string, unknown>;
  acknowledged: boolean;
}

// ============================================================================
// EVENT SYSTEM TYPES
// ============================================================================

export type EventType =
  | 'candle_update'
  | 'option_chain_update'
  | 'signal_generated'
  | 'order_submitted'
  | 'order_filled'
  | 'order_cancelled'
  | 'position_opened'
  | 'position_closed'
  | 'position_updated'
  | 'risk_alert'
  | 'circuit_breaker_triggered'
  | 'system_status';

export interface TradingEvent<T = unknown> {
  id: string;
  type: EventType;
  timestamp: number;
  source: string;
  data: T;
}

export interface EventSubscription {
  id: string;
  eventTypes: EventType[];
  callback: (event: TradingEvent) => void | Promise<void>;
  priority: number;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface SentinelConfig {
  symbols: string[];
  intervals: CandleInterval[];
  fetchOptionChain: boolean;
  optionChainExpirations: number;  // How many expirations to fetch
  updateIntervalMs: number;
  dataSource: 'mock' | 'alpaca' | 'tradier' | 'tda';
}

export interface OracleConfig {
  // EMA Settings
  emaFastPeriod: number;
  emaSlowPeriod: number;
  emaTrendPeriod: number;

  // RSI Settings
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;

  // ATR Settings
  atrPeriod: number;
  atrMultiplierSL: number;
  atrMultiplierTP: number;

  // Confluence Requirements
  minConfluenceScore: number;
  requiredIndicators: string[];

  // Signal Generation
  signalValidityMinutes: number;
}

export interface ExecutorConfig {
  // Order Settings
  defaultOrderType: OrderType;
  defaultTimeInForce: TimeInForce;
  maxSlippage: number;

  // Position Sizing
  riskPerTradePercent: number;
  maxPositionPercent: number;

  // Option Selection
  targetDelta: number;
  targetDTE: number;
  maxBidAskSpreadPercent: number;
  minOpenInterest: number;

  // Execution
  paperTrading: boolean;
  broker: 'mock' | 'alpaca' | 'tradier' | 'tda';
}

export interface WardenConfig {
  // Drawdown Limits
  maxDailyDrawdownPercent: number;
  maxWeeklyDrawdownPercent: number;
  maxTotalDrawdownPercent: number;

  // Position Limits
  maxOpenPositions: number;
  maxConcentrationPercent: number;

  // Time Limits
  tradingStartHour: number;
  tradingEndHour: number;
  tradingDays: number[];  // 0=Sunday, 6=Saturday

  // Volatility Limits
  maxVIX: number;
  pauseOnHighVolatility: boolean;

  // Circuit Breakers
  circuitBreakers: Omit<CircuitBreaker, 'status' | 'triggeredAt' | 'cooldownUntil' | 'currentValue'>[];
}

export interface AutoFlipperConfig {
  sentinel: SentinelConfig;
  oracle: OracleConfig;
  executor: ExecutorConfig;
  warden: WardenConfig;

  // System Settings
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  persistState: boolean;
  stateFile?: string;
}

// ============================================================================
// SYSTEM STATUS TYPES
// ============================================================================

export type ModuleStatus = 'stopped' | 'starting' | 'running' | 'paused' | 'error';

export interface SystemStatus {
  sentinel: ModuleStatus;
  oracle: ModuleStatus;
  executor: ModuleStatus;
  warden: ModuleStatus;

  isRunning: boolean;
  isPaused: boolean;
  startedAt?: number;
  uptime?: number;

  lastError?: string;
  errorCount: number;
}
