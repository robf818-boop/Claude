/**
 * The Sentinel - Data Ingestion Module
 *
 * Fetches real-time candles, option chains (Greeks, IV, Open Interest),
 * and futures data. Emits events when new data arrives.
 *
 * The Sentinel is the eyes and ears of the trading system.
 */

import {
  SentinelConfig,
  Candle,
  CandleInterval,
  OptionChain,
  OptionContract,
  FuturesContract,
  Greeks,
  ModuleStatus,
} from '../core/types';
import { EventBus, getEventBus } from '../events/EventBus';

// Data provider interface for abstraction
interface DataProvider {
  fetchCandles(
    symbol: string,
    interval: CandleInterval,
    limit?: number
  ): Promise<Candle[]>;

  fetchOptionChain(
    underlying: string,
    expirations?: number
  ): Promise<OptionChain>;

  fetchFuturesContract(symbol: string): Promise<FuturesContract>;

  subscribeToQuotes?(
    symbols: string[],
    callback: (candle: Candle) => void
  ): void;
}

export class Sentinel {
  private config: SentinelConfig;
  private eventBus: EventBus;
  private status: ModuleStatus = 'stopped';

  // Data storage
  private candleHistory: Map<string, Candle[]> = new Map();
  private optionChains: Map<string, OptionChain> = new Map();

  // Polling intervals
  private candlePollers: Map<string, NodeJS.Timeout> = new Map();
  private optionChainPollers: Map<string, NodeJS.Timeout> = new Map();

  // Data provider
  private dataProvider: DataProvider;

  constructor(config: SentinelConfig) {
    this.config = config;
    this.eventBus = getEventBus();
    this.dataProvider = this.createDataProvider(config.dataSource);
  }

  /**
   * Start the Sentinel
   */
  public async start(): Promise<void> {
    if (this.status === 'running') {
      console.warn('[Sentinel] Already running');
      return;
    }

    this.status = 'starting';
    console.log('[Sentinel] Starting data ingestion...');

    try {
      // Initial data fetch
      await this.fetchAllData();

      // Start polling
      this.startPolling();

      this.status = 'running';
      console.log('[Sentinel] Data ingestion active');

      this.emitStatus();
    } catch (error) {
      this.status = 'error';
      console.error('[Sentinel] Failed to start:', error);
      throw error;
    }
  }

  /**
   * Stop the Sentinel
   */
  public stop(): void {
    this.status = 'stopped';

    // Clear all pollers
    this.candlePollers.forEach((timer) => clearInterval(timer));
    this.candlePollers.clear();

    this.optionChainPollers.forEach((timer) => clearInterval(timer));
    this.optionChainPollers.clear();

    console.log('[Sentinel] Stopped');
    this.emitStatus();
  }

  /**
   * Get current status
   */
  public getStatus(): ModuleStatus {
    return this.status;
  }

  /**
   * Get candle history for a symbol
   */
  public getCandles(symbol: string, interval: CandleInterval): Candle[] {
    const key = `${symbol}_${interval}`;
    return this.candleHistory.get(key) || [];
  }

  /**
   * Get the latest candle for a symbol
   */
  public getLatestCandle(symbol: string, interval: CandleInterval): Candle | null {
    const candles = this.getCandles(symbol, interval);
    return candles.length > 0 ? candles[candles.length - 1] : null;
  }

  /**
   * Get option chain for underlying
   */
  public getOptionChain(underlying: string): OptionChain | null {
    return this.optionChains.get(underlying) || null;
  }

  /**
   * Get specific option contract
   */
  public getOptionContract(
    underlying: string,
    strike: number,
    expiration: Date,
    type: 'call' | 'put'
  ): OptionContract | null {
    const chain = this.optionChains.get(underlying);
    if (!chain) return null;

    const key = `${strike}_${expiration.toISOString().split('T')[0]}`;
    const contracts = type === 'call' ? chain.calls : chain.puts;
    return contracts.get(key) || null;
  }

  /**
   * Find option contracts by delta
   */
  public findOptionsByDelta(
    underlying: string,
    targetDelta: number,
    type: 'call' | 'put',
    expiration?: Date
  ): OptionContract[] {
    const chain = this.optionChains.get(underlying);
    if (!chain) return [];

    const contracts = type === 'call' ? chain.calls : chain.puts;
    const matches: OptionContract[] = [];

    contracts.forEach((contract) => {
      // Filter by expiration if specified
      if (expiration && contract.expiration.getTime() !== expiration.getTime()) {
        return;
      }

      // Check delta proximity (within 0.1)
      const deltaDiff = Math.abs(Math.abs(contract.greeks.delta) - Math.abs(targetDelta));
      if (deltaDiff <= 0.1) {
        matches.push(contract);
      }
    });

    // Sort by delta proximity
    matches.sort((a, b) => {
      const diffA = Math.abs(Math.abs(a.greeks.delta) - Math.abs(targetDelta));
      const diffB = Math.abs(Math.abs(b.greeks.delta) - Math.abs(targetDelta));
      return diffA - diffB;
    });

    return matches;
  }

  // Private Methods

  private createDataProvider(_source: string): DataProvider {
    // For now, use mock provider - can be extended for real brokers
    return new MockDataProvider();
  }

  private async fetchAllData(): Promise<void> {
    const promises: Promise<void>[] = [];

    // Fetch candles for all symbols and intervals
    for (const symbol of this.config.symbols) {
      for (const interval of this.config.intervals) {
        promises.push(this.fetchAndStoreCandles(symbol, interval));
      }

      // Fetch option chain if enabled
      if (this.config.fetchOptionChain) {
        promises.push(this.fetchAndStoreOptionChain(symbol));
      }
    }

    await Promise.all(promises);
  }

  private async fetchAndStoreCandles(
    symbol: string,
    interval: CandleInterval
  ): Promise<void> {
    try {
      const candles = await this.dataProvider.fetchCandles(symbol, interval, 200);
      const key = `${symbol}_${interval}`;
      this.candleHistory.set(key, candles);

      // Emit event for new candle data
      if (candles.length > 0) {
        this.eventBus.emit(
          'candle_update',
          {
            symbol,
            interval,
            candle: candles[candles.length - 1],
            history: candles,
          },
          'sentinel'
        );
      }
    } catch (error) {
      console.error(`[Sentinel] Failed to fetch candles for ${symbol}:`, error);
    }
  }

  private async fetchAndStoreOptionChain(underlying: string): Promise<void> {
    try {
      const chain = await this.dataProvider.fetchOptionChain(
        underlying,
        this.config.optionChainExpirations
      );

      this.optionChains.set(underlying, chain);

      // Emit event for option chain update
      this.eventBus.emit(
        'option_chain_update',
        {
          underlying,
          chain,
        },
        'sentinel'
      );
    } catch (error) {
      console.error(
        `[Sentinel] Failed to fetch option chain for ${underlying}:`,
        error
      );
    }
  }

  private startPolling(): void {
    const interval = this.config.updateIntervalMs;

    // Start candle polling for each symbol/interval combo
    for (const symbol of this.config.symbols) {
      for (const candleInterval of this.config.intervals) {
        const key = `${symbol}_${candleInterval}`;
        const timer = setInterval(async () => {
          await this.fetchAndStoreCandles(symbol, candleInterval);
        }, interval);
        this.candlePollers.set(key, timer);
      }

      // Start option chain polling if enabled
      if (this.config.fetchOptionChain) {
        // Option chains update less frequently
        const optionTimer = setInterval(async () => {
          await this.fetchAndStoreOptionChain(symbol);
        }, interval * 2);
        this.optionChainPollers.set(symbol, optionTimer);
      }
    }
  }

  private emitStatus(): void {
    this.eventBus.emit(
      'system_status',
      {
        module: 'sentinel',
        status: this.status,
      },
      'sentinel'
    );
  }
}

/**
 * Mock Data Provider for Testing and Simulation
 * Generates realistic-looking market data
 */
class MockDataProvider implements DataProvider {
  private priceState: Map<string, number> = new Map();

  async fetchCandles(
    symbol: string,
    interval: CandleInterval,
    limit: number = 200
  ): Promise<Candle[]> {
    // Initialize price if not exists
    if (!this.priceState.has(symbol)) {
      this.priceState.set(symbol, this.getBasePrice(symbol));
    }

    const candles: Candle[] = [];
    const intervalMs = this.getIntervalMs(interval);
    const now = Date.now();

    let price = this.priceState.get(symbol)!;

    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = now - i * intervalMs;

      // Generate realistic OHLCV with random walk
      const volatility = 0.002; // 0.2% per candle
      const change = price * volatility * (Math.random() * 2 - 1);
      const open = price;
      price += change;
      const close = price;
      const high = Math.max(open, close) * (1 + Math.random() * 0.001);
      const low = Math.min(open, close) * (1 - Math.random() * 0.001);
      const volume = Math.floor(100000 + Math.random() * 500000);

      candles.push({
        symbol,
        interval,
        timestamp,
        open,
        high,
        low,
        close,
        volume,
      });
    }

    // Update stored price
    this.priceState.set(symbol, price);

    return candles;
  }

  async fetchOptionChain(
    underlying: string,
    expirations: number = 4
  ): Promise<OptionChain> {
    const underlyingPrice = this.priceState.get(underlying) || this.getBasePrice(underlying);
    this.priceState.set(underlying, underlyingPrice);

    // Generate expiration dates (weekly for next N weeks)
    const expDates: Date[] = [];
    const today = new Date();
    for (let i = 1; i <= expirations; i++) {
      const exp = new Date(today);
      exp.setDate(exp.getDate() + i * 7); // Weekly expirations
      expDates.push(exp);
    }

    // Generate strikes around current price
    const strikes: number[] = [];
    const strikeWidth = underlyingPrice * 0.025; // 2.5% strike spacing
    for (let i = -10; i <= 10; i++) {
      strikes.push(Math.round((underlyingPrice + i * strikeWidth) * 100) / 100);
    }

    const calls = new Map<string, OptionContract>();
    const puts = new Map<string, OptionContract>();

    for (const exp of expDates) {
      const daysToExpiration = Math.ceil(
        (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      for (const strike of strikes) {
        const callContract = this.generateOptionContract(
          underlying,
          underlyingPrice,
          strike,
          exp,
          daysToExpiration,
          'call'
        );

        const putContract = this.generateOptionContract(
          underlying,
          underlyingPrice,
          strike,
          exp,
          daysToExpiration,
          'put'
        );

        const key = `${strike}_${exp.toISOString().split('T')[0]}`;
        calls.set(key, callContract);
        puts.set(key, putContract);
      }
    }

    return {
      underlying,
      underlyingPrice,
      expirations: expDates,
      strikes,
      calls,
      puts,
      lastUpdated: Date.now(),
    };
  }

  async fetchFuturesContract(symbol: string): Promise<FuturesContract> {
    const price = this.priceState.get(symbol) || this.getBasePrice(symbol);
    this.priceState.set(symbol, price);

    const expiration = new Date();
    expiration.setMonth(expiration.getMonth() + 3);

    return {
      symbol,
      underlying: symbol.slice(0, 2),
      expiration,
      bid: price - 0.25,
      ask: price + 0.25,
      last: price,
      settlement: price,
      multiplier: 50, // E-mini S&P
      tickSize: 0.25,
      tickValue: 12.5,
      volume: Math.floor(Math.random() * 1000000),
      openInterest: Math.floor(Math.random() * 500000),
      lastUpdated: Date.now(),
    };
  }

  private generateOptionContract(
    underlying: string,
    underlyingPrice: number,
    strike: number,
    expiration: Date,
    daysToExpiration: number,
    type: 'call' | 'put'
  ): OptionContract {
    const moneyness = underlyingPrice / strike;
    const inTheMoney =
      type === 'call' ? underlyingPrice > strike : underlyingPrice < strike;

    // Simplified Black-Scholes approximation for Greeks
    const iv = 0.20 + Math.random() * 0.15; // 20-35% IV
    const sqrtT = Math.sqrt(daysToExpiration / 365);

    // Delta approximation
    let delta: number;
    if (type === 'call') {
      delta = inTheMoney
        ? 0.5 + (moneyness - 1) * 2
        : 0.5 - (1 - moneyness) * 2;
      delta = Math.max(0.01, Math.min(0.99, delta));
    } else {
      delta = inTheMoney
        ? -0.5 - (1 - moneyness) * 2
        : -0.5 + (moneyness - 1) * 2;
      delta = Math.max(-0.99, Math.min(-0.01, delta));
    }

    // Other Greeks
    const gamma = Math.exp(-Math.pow(moneyness - 1, 2) / (2 * iv * iv * sqrtT * sqrtT)) / (underlyingPrice * iv * sqrtT * Math.sqrt(2 * Math.PI));
    const theta = -underlyingPrice * iv / (2 * sqrtT * Math.sqrt(365)) * gamma / 100;
    const vega = underlyingPrice * sqrtT * gamma * 100;
    const rho = type === 'call' ? strike * daysToExpiration / 365 * Math.abs(delta) / 100 : -strike * daysToExpiration / 365 * Math.abs(delta) / 100;

    const greeks: Greeks = {
      delta,
      gamma,
      theta,
      vega,
      rho,
    };

    // Calculate option price
    const intrinsicValue = inTheMoney
      ? type === 'call'
        ? underlyingPrice - strike
        : strike - underlyingPrice
      : 0;

    const timeValue = underlyingPrice * iv * sqrtT * 0.4; // Simplified
    const optionPrice = intrinsicValue + timeValue;

    const spread = optionPrice * 0.02; // 2% spread

    return {
      symbol: `${underlying}${expiration.toISOString().slice(2, 10).replace(/-/g, '')}${type === 'call' ? 'C' : 'P'}${String(Math.round(strike * 1000)).padStart(8, '0')}`,
      underlying,
      optionType: type,
      strike,
      expiration,
      daysToExpiration,
      bid: Math.max(0.01, optionPrice - spread / 2),
      ask: optionPrice + spread / 2,
      last: optionPrice,
      mark: optionPrice,
      greeks,
      impliedVolatility: iv,
      ivRank: Math.random() * 100,
      ivPercentile: Math.random() * 100,
      volume: Math.floor(Math.random() * 10000),
      openInterest: Math.floor(Math.random() * 50000),
      volumeOIRatio: Math.random(),
      intrinsicValue,
      extrinsicValue: timeValue,
      inTheMoney,
      lastUpdated: Date.now(),
    };
  }

  private getBasePrice(symbol: string): number {
    // Return realistic base prices for common symbols
    const basePrices: Record<string, number> = {
      SPY: 475.50,
      QQQ: 415.25,
      AAPL: 195.50,
      MSFT: 385.75,
      NVDA: 495.00,
      TSLA: 245.50,
      AMD: 145.25,
      META: 350.00,
      GOOGL: 142.50,
      AMZN: 155.75,
      ES: 4800.00,
      NQ: 16500.00,
    };

    return basePrices[symbol] || 100 + Math.random() * 200;
  }

  private getIntervalMs(interval: CandleInterval): number {
    const intervals: Record<CandleInterval, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };
    return intervals[interval];
  }
}
