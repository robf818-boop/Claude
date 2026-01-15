/**
 * Technical Indicators Library
 *
 * Pure functions for calculating trading indicators.
 * All functions are stateless and suitable for event-driven processing.
 */

import {
  OHLCV,
  EMAValues,
  RSIValues,
  ATRValues,
  MACDValues,
  VolumeAnalysis,
} from '../core/types';

/**
 * Calculate Exponential Moving Average
 */
export function calculateEMA(
  prices: number[],
  period: number
): number {
  if (prices.length < period) {
    // Not enough data, use SMA
    const sum = prices.reduce((a, b) => a + b, 0);
    return sum / prices.length;
  }

  const multiplier = 2 / (period + 1);

  // Start with SMA for the first period
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Calculate EMA for remaining prices
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Calculate multiple EMAs and their relationships
 */
export function calculateEMAValues(
  prices: number[],
  fastPeriod: number = 9,
  slowPeriod: number = 21,
  trendPeriod: number = 50
): EMAValues {
  const fast = calculateEMA(prices, fastPeriod);
  const slow = calculateEMA(prices, slowPeriod);
  const trend = calculateEMA(prices, trendPeriod);

  // Calculate previous values for crossover detection
  const prevPrices = prices.slice(0, -1);
  const prevFast = prevPrices.length >= fastPeriod
    ? calculateEMA(prevPrices, fastPeriod)
    : fast;
  const prevSlow = prevPrices.length >= slowPeriod
    ? calculateEMA(prevPrices, slowPeriod)
    : slow;

  // Detect crossover
  let crossover: 'bullish' | 'bearish' | 'none' = 'none';
  if (prevFast <= prevSlow && fast > slow) {
    crossover = 'bullish';
  } else if (prevFast >= prevSlow && fast < slow) {
    crossover = 'bearish';
  }

  // Calculate distance as percentage
  const distance = slow !== 0 ? ((fast - slow) / slow) * 100 : 0;

  return {
    fast,
    slow,
    trend,
    crossover,
    distance,
  };
}

/**
 * Calculate Simple Moving Average
 */
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  const relevantPrices = prices.slice(-period);
  return relevantPrices.reduce((a, b) => a + b, 0) / relevantPrices.length;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calculateRSI(
  prices: number[],
  period: number = 14
): number {
  if (prices.length < period + 1) {
    return 50; // Neutral when not enough data
  }

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const recentChanges = changes.slice(-period);

  let avgGain = 0;
  let avgLoss = 0;

  for (const change of recentChanges) {
    if (change > 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) {
    return 100;
  }

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Calculate RSI with extended analysis
 */
export function calculateRSIValues(
  prices: number[],
  period: number = 14,
  overboughtThreshold: number = 70,
  oversoldThreshold: number = 30
): RSIValues {
  const value = calculateRSI(prices, period);

  // Check for divergence (simplified - price makes new high/low but RSI doesn't)
  let divergence: 'bullish' | 'bearish' | 'none' = 'none';

  if (prices.length >= period * 2) {
    const recentPrices = prices.slice(-period);
    const olderPrices = prices.slice(-period * 2, -period);

    const recentHigh = Math.max(...recentPrices);
    const olderHigh = Math.max(...olderPrices);

    const recentLow = Math.min(...recentPrices);
    const olderLow = Math.min(...olderPrices);

    // Calculate RSI for older period
    const olderRSI = calculateRSI(prices.slice(0, -period), period);

    // Bearish divergence: price higher high, RSI lower high
    if (recentHigh > olderHigh && value < olderRSI && value > 50) {
      divergence = 'bearish';
    }

    // Bullish divergence: price lower low, RSI higher low
    if (recentLow < olderLow && value > olderRSI && value < 50) {
      divergence = 'bullish';
    }
  }

  return {
    value,
    isOverbought: value >= overboughtThreshold,
    isOversold: value <= oversoldThreshold,
    divergence,
  };
}

/**
 * Calculate ATR (Average True Range)
 */
export function calculateATR(
  candles: OHLCV[],
  period: number = 14
): number {
  if (candles.length < 2) return 0;

  const trueRanges: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );

    trueRanges.push(tr);
  }

  // Use EMA for smoothing
  return calculateEMA(trueRanges, period);
}

/**
 * Calculate ATR with extended analysis
 */
export function calculateATRValues(
  candles: OHLCV[],
  period: number = 14
): ATRValues {
  const value = calculateATR(candles, period);
  const currentPrice = candles[candles.length - 1]?.close || 1;
  const percent = (value / currentPrice) * 100;

  // Check if volatility is expanding or contracting
  let expanding = false;
  let contracting = false;

  if (candles.length >= period * 2) {
    const recentATR = calculateATR(candles.slice(-period - 1), period);
    const olderATR = calculateATR(candles.slice(-period * 2 - 1, -period), period);

    if (recentATR > olderATR * 1.1) {
      expanding = true;
    } else if (recentATR < olderATR * 0.9) {
      contracting = true;
    }
  }

  return {
    value,
    percent,
    expanding,
    contracting,
  };
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDValues {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  const macdLine = fastEMA - slowEMA;

  // Calculate MACD line history for signal line
  const macdHistory: number[] = [];
  for (let i = slowPeriod; i <= prices.length; i++) {
    const subPrices = prices.slice(0, i);
    const subFast = calculateEMA(subPrices, fastPeriod);
    const subSlow = calculateEMA(subPrices, slowPeriod);
    macdHistory.push(subFast - subSlow);
  }

  const signalLine = calculateEMA(macdHistory, signalPeriod);
  const histogram = macdLine - signalLine;

  // Detect crossover
  let crossover: 'bullish' | 'bearish' | 'none' = 'none';
  if (macdHistory.length >= 2) {
    const prevMACD = macdHistory[macdHistory.length - 2];
    const prevSignal = calculateEMA(macdHistory.slice(0, -1), signalPeriod);

    if (prevMACD <= prevSignal && macdLine > signalLine) {
      crossover = 'bullish';
    } else if (prevMACD >= prevSignal && macdLine < signalLine) {
      crossover = 'bearish';
    }
  }

  return {
    macd: macdLine,
    signal: signalLine,
    histogram,
    crossover,
  };
}

/**
 * Calculate Volume Analysis
 */
export function calculateVolumeAnalysis(
  volumes: number[],
  period: number = 20
): VolumeAnalysis {
  if (volumes.length === 0) {
    return {
      current: 0,
      average: 0,
      ratio: 0,
      isAboveAverage: false,
      trend: 'stable',
    };
  }

  const current = volumes[volumes.length - 1];
  const average = calculateSMA(volumes, period);
  const ratio = average > 0 ? current / average : 0;

  // Determine trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (volumes.length >= 5) {
    const recent = volumes.slice(-5);
    const firstHalf = (recent[0] + recent[1]) / 2;
    const secondHalf = (recent[3] + recent[4]) / 2;

    if (secondHalf > firstHalf * 1.2) {
      trend = 'increasing';
    } else if (secondHalf < firstHalf * 0.8) {
      trend = 'decreasing';
    }
  }

  return {
    current,
    average,
    ratio,
    isAboveAverage: ratio > 1,
    trend,
  };
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number; middle: number; lower: number; bandwidth: number } {
  const middle = calculateSMA(prices, period);
  const relevantPrices = prices.slice(-period);

  // Calculate standard deviation
  const squaredDiffs = relevantPrices.map((p) => Math.pow(p - middle, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  const upper = middle + stdDevMultiplier * stdDev;
  const lower = middle - stdDevMultiplier * stdDev;
  const bandwidth = middle > 0 ? ((upper - lower) / middle) * 100 : 0;

  return { upper, middle, lower, bandwidth };
}

/**
 * Calculate VWAP (Volume Weighted Average Price)
 */
export function calculateVWAP(candles: OHLCV[]): number {
  if (candles.length === 0) return 0;

  let cumulativeTPV = 0; // Typical Price * Volume
  let cumulativeVolume = 0;

  for (const candle of candles) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeTPV += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;
  }

  return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : 0;
}

/**
 * Identify support and resistance levels
 */
export function findSupportResistance(
  candles: OHLCV[],
  lookback: number = 50,
  threshold: number = 0.02
): { support: number[]; resistance: number[] } {
  const relevantCandles = candles.slice(-lookback);

  if (relevantCandles.length < 10) {
    return { support: [], resistance: [] };
  }

  const pivots: { price: number; type: 'high' | 'low' }[] = [];

  // Find pivot points (local highs and lows)
  for (let i = 2; i < relevantCandles.length - 2; i++) {
    const current = relevantCandles[i];
    const prev2 = relevantCandles[i - 2];
    const prev1 = relevantCandles[i - 1];
    const next1 = relevantCandles[i + 1];
    const next2 = relevantCandles[i + 2];

    // Local high
    if (
      current.high > prev2.high &&
      current.high > prev1.high &&
      current.high > next1.high &&
      current.high > next2.high
    ) {
      pivots.push({ price: current.high, type: 'high' });
    }

    // Local low
    if (
      current.low < prev2.low &&
      current.low < prev1.low &&
      current.low < next1.low &&
      current.low < next2.low
    ) {
      pivots.push({ price: current.low, type: 'low' });
    }
  }

  // Cluster nearby pivots
  const clusterPivots = (
    prices: number[],
    thresh: number
  ): number[] => {
    if (prices.length === 0) return [];

    const sorted = [...prices].sort((a, b) => a - b);
    const clusters: number[][] = [[sorted[0]]];

    for (let i = 1; i < sorted.length; i++) {
      const lastCluster = clusters[clusters.length - 1];
      const lastPrice = lastCluster[lastCluster.length - 1];

      if (Math.abs(sorted[i] - lastPrice) / lastPrice < thresh) {
        lastCluster.push(sorted[i]);
      } else {
        clusters.push([sorted[i]]);
      }
    }

    // Return average of each cluster
    return clusters
      .filter((c) => c.length >= 2) // Only significant clusters
      .map((c) => c.reduce((a, b) => a + b, 0) / c.length);
  };

  const highPrices = pivots.filter((p) => p.type === 'high').map((p) => p.price);
  const lowPrices = pivots.filter((p) => p.type === 'low').map((p) => p.price);

  const resistance = clusterPivots(highPrices, threshold);
  const support = clusterPivots(lowPrices, threshold);

  return { support, resistance };
}

/**
 * Calculate Stochastic Oscillator
 */
export function calculateStochastic(
  candles: OHLCV[],
  kPeriod: number = 14,
  dPeriod: number = 3
): { k: number; d: number } {
  if (candles.length < kPeriod) {
    return { k: 50, d: 50 };
  }

  const recentCandles = candles.slice(-kPeriod);
  const highestHigh = Math.max(...recentCandles.map((c) => c.high));
  const lowestLow = Math.min(...recentCandles.map((c) => c.low));
  const currentClose = candles[candles.length - 1].close;

  const k =
    highestHigh !== lowestLow
      ? ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100
      : 50;

  // Calculate %D (SMA of %K)
  const kValues: number[] = [];
  for (let i = dPeriod - 1; i >= 0; i--) {
    const subCandles = candles.slice(0, candles.length - i);
    if (subCandles.length >= kPeriod) {
      const subRecent = subCandles.slice(-kPeriod);
      const subHigh = Math.max(...subRecent.map((c) => c.high));
      const subLow = Math.min(...subRecent.map((c) => c.low));
      const subClose = subCandles[subCandles.length - 1].close;
      const subK =
        subHigh !== subLow
          ? ((subClose - subLow) / (subHigh - subLow)) * 100
          : 50;
      kValues.push(subK);
    }
  }

  const d = kValues.length > 0 ? calculateSMA(kValues, dPeriod) : k;

  return { k, d };
}
