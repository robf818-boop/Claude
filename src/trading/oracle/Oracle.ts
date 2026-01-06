/**
 * The Oracle - Analysis & Anticipation Module
 *
 * Runs EMA logic with confluence filters (RSI, ATR, MACD).
 * Generates trading signals with option-specific recommendations.
 *
 * The Oracle sees patterns and anticipates market moves.
 */

import {
  OracleConfig,
  Candle,
  CandleInterval,
  TradingSignal,
  SignalDirection,
  SignalStrength,
  TechnicalSnapshot,
  OptionRecommendation,
  OptionStrategy,
  ModuleStatus,
  EMAValues,
  RSIValues,
  ATRValues,
  MACDValues,
  TradingEvent,
} from '../core/types';
import { EventBus, getEventBus } from '../events/EventBus';
import {
  calculateEMAValues,
  calculateRSIValues,
  calculateATRValues,
  calculateMACD,
  calculateVolumeAnalysis,
  findSupportResistance,
} from '../utils/indicators';

interface CandleUpdateEvent {
  symbol: string;
  interval: CandleInterval;
  candle: Candle;
  history: Candle[];
}

export class Oracle {
  private config: OracleConfig;
  private eventBus: EventBus;
  private status: ModuleStatus = 'stopped';

  // Technical state
  private snapshots: Map<string, TechnicalSnapshot> = new Map();
  private activeSignals: Map<string, TradingSignal> = new Map();
  private signalIdCounter: number = 0;

  // Event subscription IDs
  private subscriptionIds: string[] = [];

  constructor(config: OracleConfig) {
    this.config = config;
    this.eventBus = getEventBus();
  }

  /**
   * Start the Oracle
   */
  public async start(): Promise<void> {
    if (this.status === 'running') {
      console.warn('[Oracle] Already running');
      return;
    }

    this.status = 'starting';
    console.log('[Oracle] Starting analysis engine...');

    // Subscribe to candle updates from Sentinel
    const candleSubId = this.eventBus.subscribe<CandleUpdateEvent>(
      ['candle_update'],
      (event) => this.onCandleUpdate(event),
      50 // Medium priority
    );
    this.subscriptionIds.push(candleSubId);

    this.status = 'running';
    console.log('[Oracle] Analysis engine active');
    this.emitStatus();
  }

  /**
   * Stop the Oracle
   */
  public stop(): void {
    this.status = 'stopped';

    // Unsubscribe from events
    this.subscriptionIds.forEach((id) => this.eventBus.unsubscribe(id));
    this.subscriptionIds = [];

    // Invalidate all active signals
    this.activeSignals.forEach((signal) => {
      signal.isValid = false;
      signal.invalidReason = 'Oracle stopped';
    });

    console.log('[Oracle] Stopped');
    this.emitStatus();
  }

  /**
   * Get current status
   */
  public getStatus(): ModuleStatus {
    return this.status;
  }

  /**
   * Get technical snapshot for a symbol
   */
  public getSnapshot(symbol: string): TechnicalSnapshot | null {
    return this.snapshots.get(symbol) || null;
  }

  /**
   * Get all active signals
   */
  public getActiveSignals(): TradingSignal[] {
    // Filter out expired signals
    const now = Date.now();
    const valid: TradingSignal[] = [];

    this.activeSignals.forEach((signal, id) => {
      if (signal.expiresAt > now && signal.isValid) {
        valid.push(signal);
      } else {
        this.activeSignals.delete(id);
      }
    });

    return valid;
  }

  /**
   * Get signal by ID
   */
  public getSignal(id: string): TradingSignal | null {
    return this.activeSignals.get(id) || null;
  }

  /**
   * Manually analyze a symbol (can be called externally)
   */
  public analyze(symbol: string, candles: Candle[]): TechnicalSnapshot {
    return this.computeTechnicalSnapshot(symbol, candles);
  }

  // Event Handlers

  private async onCandleUpdate(
    event: TradingEvent<CandleUpdateEvent>
  ): Promise<void> {
    const { symbol, history } = event.data;

    if (history.length < this.config.emaTrendPeriod) {
      console.log(
        `[Oracle] Not enough data for ${symbol} (${history.length} candles)`
      );
      return;
    }

    // Compute technical snapshot
    const snapshot = this.computeTechnicalSnapshot(symbol, history);
    this.snapshots.set(symbol, snapshot);

    // Check for trading signals
    const signal = this.evaluateSignal(symbol, snapshot, history);

    if (signal) {
      this.activeSignals.set(signal.id, signal);
      console.log(
        `[Oracle] Signal generated: ${signal.direction.toUpperCase()} ${symbol} (${signal.strength})`
      );

      // Emit signal event
      this.eventBus.emit('signal_generated', signal, 'oracle');
    }
  }

  // Technical Analysis

  private computeTechnicalSnapshot(
    symbol: string,
    candles: Candle[]
  ): TechnicalSnapshot {
    const closes = candles.map((c) => c.close);
    const volumes = candles.map((c) => c.volume);
    const currentPrice = closes[closes.length - 1];

    // Calculate all indicators
    const ema = calculateEMAValues(
      closes,
      this.config.emaFastPeriod,
      this.config.emaSlowPeriod,
      this.config.emaTrendPeriod
    );

    const rsi = calculateRSIValues(
      closes,
      this.config.rsiPeriod,
      this.config.rsiOverbought,
      this.config.rsiOversold
    );

    const atr = calculateATRValues(candles, this.config.atrPeriod);
    const macd = calculateMACD(closes);
    const volume = calculateVolumeAnalysis(volumes);

    // Find support/resistance
    const levels = findSupportResistance(candles);

    // Determine overall trend
    const trend = this.determineTrend(currentPrice, ema, macd);

    // Determine momentum
    const momentum = this.determineMomentum(ema, rsi, macd);

    // Determine volatility regime
    const volatility = this.determineVolatility(atr);

    return {
      symbol,
      timestamp: Date.now(),
      price: currentPrice,
      ema,
      rsi,
      atr,
      macd,
      volume,
      support: levels.support,
      resistance: levels.resistance,
      trend,
      momentum,
      volatility,
    };
  }

  private determineTrend(
    price: number,
    ema: EMAValues,
    macd: MACDValues
  ): 'bullish' | 'bearish' | 'sideways' {
    let bullishPoints = 0;
    let bearishPoints = 0;

    // Price vs EMAs
    if (price > ema.fast && price > ema.slow) bullishPoints += 2;
    else if (price < ema.fast && price < ema.slow) bearishPoints += 2;

    // EMA alignment
    if (ema.fast > ema.slow && ema.slow > ema.trend) bullishPoints += 2;
    else if (ema.fast < ema.slow && ema.slow < ema.trend) bearishPoints += 2;

    // MACD
    if (macd.histogram > 0) bullishPoints += 1;
    else if (macd.histogram < 0) bearishPoints += 1;

    if (bullishPoints >= 4) return 'bullish';
    if (bearishPoints >= 4) return 'bearish';
    return 'sideways';
  }

  private determineMomentum(
    ema: EMAValues,
    rsi: RSIValues,
    macd: MACDValues
  ): 'accelerating' | 'decelerating' | 'neutral' {
    let score = 0;

    // EMA distance expanding
    if (Math.abs(ema.distance) > 1) score += ema.distance > 0 ? 1 : -1;

    // RSI extremes
    if (rsi.value > 60) score += 1;
    else if (rsi.value < 40) score -= 1;

    // MACD histogram trend
    if (macd.histogram > 0 && macd.crossover === 'bullish') score += 1;
    else if (macd.histogram < 0 && macd.crossover === 'bearish') score -= 1;

    if (score >= 2) return 'accelerating';
    if (score <= -2) return 'decelerating';
    return 'neutral';
  }

  private determineVolatility(
    atr: ATRValues
  ): 'low' | 'normal' | 'high' | 'extreme' {
    if (atr.percent < 0.5) return 'low';
    if (atr.percent < 1.5) return 'normal';
    if (atr.percent < 3) return 'high';
    return 'extreme';
  }

  // Signal Generation

  private evaluateSignal(
    symbol: string,
    snapshot: TechnicalSnapshot,
    candles: Candle[]
  ): TradingSignal | null {
    // Calculate confluence score
    const confluenceFactors = this.calculateConfluence(snapshot);

    if (confluenceFactors.score < this.config.minConfluenceScore) {
      return null; // Not enough confluence
    }

    // Determine direction and strength
    const direction = confluenceFactors.direction;
    const strength = this.determineStrength(confluenceFactors.score);

    if (direction === 'neutral') {
      return null; // No clear direction
    }

    // Calculate entry, stop, and targets
    const { entry, stopLoss, takeProfit, riskRewardRatio } =
      this.calculateLevels(snapshot, direction, candles);

    // Generate option recommendation
    const optionRec = this.generateOptionRecommendation(
      direction,
      strength,
      snapshot
    );

    const signal: TradingSignal = {
      id: `sig_${++this.signalIdCounter}_${Date.now()}`,
      timestamp: Date.now(),
      symbol,
      direction,
      strength,
      source: 'oracle',
      confluenceScore: confluenceFactors.score,
      entry,
      stopLoss,
      takeProfit,
      riskRewardRatio,
      maxRiskPercent: 2, // Default 2% risk per trade
      optionRecommendation: optionRec,
      expiresAt: Date.now() + this.config.signalValidityMinutes * 60 * 1000,
      isValid: true,
    };

    return signal;
  }

  private calculateConfluence(snapshot: TechnicalSnapshot): {
    score: number;
    direction: SignalDirection;
    factors: string[];
  } {
    let bullishScore = 0;
    let bearishScore = 0;
    const factors: string[] = [];

    // EMA Crossover (strongest signal)
    if (snapshot.ema.crossover === 'bullish') {
      bullishScore += 30;
      factors.push('EMA bullish crossover');
    } else if (snapshot.ema.crossover === 'bearish') {
      bearishScore += 30;
      factors.push('EMA bearish crossover');
    }

    // Price vs EMAs
    if (
      snapshot.price > snapshot.ema.fast &&
      snapshot.price > snapshot.ema.slow
    ) {
      bullishScore += 15;
      factors.push('Price above EMAs');
    } else if (
      snapshot.price < snapshot.ema.fast &&
      snapshot.price < snapshot.ema.slow
    ) {
      bearishScore += 15;
      factors.push('Price below EMAs');
    }

    // RSI conditions
    if (snapshot.rsi.isOversold) {
      bullishScore += 20;
      factors.push('RSI oversold');
    } else if (snapshot.rsi.isOverbought) {
      bearishScore += 20;
      factors.push('RSI overbought');
    }

    // RSI divergence
    if (snapshot.rsi.divergence === 'bullish') {
      bullishScore += 25;
      factors.push('RSI bullish divergence');
    } else if (snapshot.rsi.divergence === 'bearish') {
      bearishScore += 25;
      factors.push('RSI bearish divergence');
    }

    // MACD
    if (snapshot.macd.crossover === 'bullish') {
      bullishScore += 20;
      factors.push('MACD bullish crossover');
    } else if (snapshot.macd.crossover === 'bearish') {
      bearishScore += 20;
      factors.push('MACD bearish crossover');
    }

    if (snapshot.macd.histogram > 0) {
      bullishScore += 10;
    } else if (snapshot.macd.histogram < 0) {
      bearishScore += 10;
    }

    // Volume confirmation
    if (snapshot.volume.isAboveAverage && snapshot.volume.trend === 'increasing') {
      // Volume confirms the move
      if (bullishScore > bearishScore) bullishScore += 15;
      else if (bearishScore > bullishScore) bearishScore += 15;
      factors.push('Volume confirmation');
    }

    // Support/Resistance proximity
    const nearestSupport = snapshot.support[snapshot.support.length - 1];
    const nearestResistance = snapshot.resistance[0];

    if (nearestSupport) {
      const distToSupport =
        ((snapshot.price - nearestSupport) / snapshot.price) * 100;
      if (distToSupport < 1 && distToSupport > 0) {
        bullishScore += 15;
        factors.push('Near support');
      }
    }

    if (nearestResistance) {
      const distToResistance =
        ((nearestResistance - snapshot.price) / snapshot.price) * 100;
      if (distToResistance < 1 && distToResistance > 0) {
        bearishScore += 15;
        factors.push('Near resistance');
      }
    }

    // Determine direction
    let direction: SignalDirection = 'neutral';
    let score = 0;

    if (bullishScore > bearishScore && bullishScore >= 50) {
      direction = 'bullish';
      score = bullishScore;
    } else if (bearishScore > bullishScore && bearishScore >= 50) {
      direction = 'bearish';
      score = bearishScore;
    }

    return { score, direction, factors };
  }

  private determineStrength(score: number): SignalStrength {
    if (score >= 90) return 'extreme';
    if (score >= 75) return 'strong';
    if (score >= 60) return 'moderate';
    return 'weak';
  }

  private calculateLevels(
    snapshot: TechnicalSnapshot,
    direction: SignalDirection,
    candles: Candle[]
  ): {
    entry: number;
    stopLoss: number;
    takeProfit: number[];
    riskRewardRatio: number;
  } {
    const entry = snapshot.price;
    const atrValue = snapshot.atr.value;

    let stopLoss: number;
    let takeProfit: number[];

    if (direction === 'bullish') {
      // Stop below recent low or ATR multiple
      const recentLow = Math.min(...candles.slice(-5).map((c) => c.low));
      stopLoss = Math.min(
        recentLow - atrValue * 0.5,
        entry - atrValue * this.config.atrMultiplierSL
      );

      // Multiple take profit targets
      takeProfit = [
        entry + atrValue * this.config.atrMultiplierTP,
        entry + atrValue * this.config.atrMultiplierTP * 1.5,
        entry + atrValue * this.config.atrMultiplierTP * 2,
      ];
    } else {
      // Stop above recent high or ATR multiple
      const recentHigh = Math.max(...candles.slice(-5).map((c) => c.high));
      stopLoss = Math.max(
        recentHigh + atrValue * 0.5,
        entry + atrValue * this.config.atrMultiplierSL
      );

      // Multiple take profit targets
      takeProfit = [
        entry - atrValue * this.config.atrMultiplierTP,
        entry - atrValue * this.config.atrMultiplierTP * 1.5,
        entry - atrValue * this.config.atrMultiplierTP * 2,
      ];
    }

    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(takeProfit[0] - entry);
    const riskRewardRatio = reward / risk;

    return { entry, stopLoss, takeProfit, riskRewardRatio };
  }

  private generateOptionRecommendation(
    direction: SignalDirection,
    strength: SignalStrength,
    snapshot: TechnicalSnapshot
  ): OptionRecommendation {
    // Determine strategy based on direction and volatility
    let strategy: OptionStrategy;
    let preferredDelta: number;
    let preferredDTE: number;

    if (direction === 'bullish') {
      if (snapshot.volatility === 'high' || snapshot.volatility === 'extreme') {
        // High IV - sell puts or use spreads
        strategy = 'put_spread';
        preferredDelta = 0.30; // OTM puts to sell
        preferredDTE = 30; // Longer DTE for premium collection
      } else {
        // Normal/low IV - buy calls
        strategy = 'long_call';
        preferredDelta = strength === 'strong' || strength === 'extreme' ? 0.70 : 0.50;
        preferredDTE = strength === 'strong' ? 14 : 7; // Shorter for strong signals
      }
    } else {
      // Bearish
      if (snapshot.volatility === 'high' || snapshot.volatility === 'extreme') {
        // High IV - sell calls or use spreads
        strategy = 'call_spread';
        preferredDelta = -0.30;
        preferredDTE = 30;
      } else {
        // Normal/low IV - buy puts
        strategy = 'long_put';
        preferredDelta = strength === 'strong' || strength === 'extreme' ? -0.70 : -0.50;
        preferredDTE = strength === 'strong' ? 14 : 7;
      }
    }

    // Adjust for signal strength
    const contracts =
      strength === 'extreme'
        ? 5
        : strength === 'strong'
          ? 3
          : strength === 'moderate'
            ? 2
            : 1;

    return {
      strategy,
      preferredDelta,
      preferredDTE,
      maxIVRank: 70, // Don't buy options if IV rank > 70
      minOpenInterest: 500,
      maxBidAskSpread: 0.05, // 5% max spread
      contracts,
    };
  }

  private emitStatus(): void {
    this.eventBus.emit(
      'system_status',
      {
        module: 'oracle',
        status: this.status,
      },
      'oracle'
    );
  }
}

// Default Oracle configuration
export const defaultOracleConfig: OracleConfig = {
  emaFastPeriod: 9,
  emaSlowPeriod: 21,
  emaTrendPeriod: 50,
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  atrPeriod: 14,
  atrMultiplierSL: 1.5,
  atrMultiplierTP: 2.5,
  minConfluenceScore: 50,
  requiredIndicators: ['ema', 'rsi'],
  signalValidityMinutes: 30,
};
