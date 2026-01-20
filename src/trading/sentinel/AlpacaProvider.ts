/**
 * Alpaca Data Provider
 * Fetches real market data from Alpaca via serverless functions
 * Supports both Netlify and Vercel deployments
 */

import { Candle, CandleInterval, OptionChain } from '../core/types';

// Map our intervals to Alpaca timeframes
const intervalMap: Record<CandleInterval, string> = {
  '1m': '1Min',
  '5m': '5Min',
  '15m': '15Min',
  '30m': '30Min',
  '1h': '1Hour',
  '4h': '4Hour',
  '1d': '1Day',
};

interface AlpacaBar {
  t: string;  // timestamp
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
  n: number;  // trade count
  vw: number; // vwap
}

interface AlpacaSnapshot {
  latestTrade: { p: number; s: number; t: string };
  latestQuote: { ap: number; as: number; bp: number; bs: number };
  minuteBar: AlpacaBar;
  dailyBar: AlpacaBar;
  prevDailyBar: AlpacaBar;
}

export class AlpacaProvider {
  private baseUrl: string;

  constructor() {
    // Use /api/alpaca which works with both Vercel and can fallback to Netlify
    this.baseUrl = '/api/alpaca';
  }

  private async callApi(action: string, params: Record<string, unknown> = {}): Promise<unknown> {
    // Try primary URL first
    let response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...params }),
    });

    // If Vercel fails, try Netlify
    if (!response.ok && this.baseUrl === '/api/alpaca') {
      response = await fetch('/.netlify/functions/alpaca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      });
    }

    if (!response.ok) {
      throw new Error('Alpaca API error: ' + response.status);
    }

    return response.json();
  }

  /**
   * Get account information
   */
  async getAccount(): Promise<{
    equity: number;
    cash: number;
    buyingPower: number;
    portfolioValue: number;
  }> {
    const data = await this.callApi('account') as {
      equity: string;
      cash: string;
      buying_power: string;
      portfolio_value: string;
    };

    return {
      equity: parseFloat(data.equity),
      cash: parseFloat(data.cash),
      buyingPower: parseFloat(data.buying_power),
      portfolioValue: parseFloat(data.portfolio_value),
    };
  }

  /**
   * Get market clock (is market open?)
   */
  async getClock(): Promise<{
    isOpen: boolean;
    nextOpen: Date;
    nextClose: Date;
  }> {
    const data = await this.callApi('clock') as {
      is_open: boolean;
      next_open: string;
      next_close: string;
    };

    return {
      isOpen: data.is_open,
      nextOpen: new Date(data.next_open),
      nextClose: new Date(data.next_close),
    };
  }

  /**
   * Fetch candle/bar data for symbols
   */
  async fetchCandles(
    symbols: string[],
    interval: CandleInterval,
    limit: number = 100
  ): Promise<Map<string, Candle[]>> {
    const timeframe = intervalMap[interval];

    const data = await this.callApi('bars', {
      symbols,
      timeframe,
      limit,
    }) as { bars: Record<string, AlpacaBar[]> };

    const result = new Map<string, Candle[]>();

    if (data.bars) {
      for (const [symbol, bars] of Object.entries(data.bars)) {
        const candles: Candle[] = bars.map((bar) => ({
          symbol,
          interval,
          timestamp: new Date(bar.t).getTime(),
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v,
          vwap: bar.vw,
          trades: bar.n,
        }));
        result.set(symbol, candles);
      }
    }

    return result;
  }

  /**
   * Get latest snapshots for symbols
   */
  async fetchSnapshots(symbols: string[]): Promise<Map<string, {
    price: number;
    bid: number;
    ask: number;
    volume: number;
    change: number;
    changePercent: number;
  }>> {
    const data = await this.callApi('snapshot', { symbols }) as Record<string, AlpacaSnapshot>;

    const result = new Map();

    for (const [symbol, snapshot] of Object.entries(data)) {
      if (snapshot && snapshot.latestTrade) {
        const currentPrice = snapshot.latestTrade.p;
        const prevClose = snapshot.prevDailyBar?.c || currentPrice;
        const change = currentPrice - prevClose;
        const changePercent = (change / prevClose) * 100;

        result.set(symbol, {
          price: currentPrice,
          bid: snapshot.latestQuote?.bp || currentPrice,
          ask: snapshot.latestQuote?.ap || currentPrice,
          volume: snapshot.dailyBar?.v || 0,
          change,
          changePercent,
        });
      }
    }

    return result;
  }

  /**
   * Get latest quotes
   */
  async fetchQuotes(symbols: string[]): Promise<Map<string, { bid: number; ask: number; last: number }>> {
    const data = await this.callApi('quotes', { symbols }) as {
      quotes: Record<string, { bp: number; ap: number; }>
    };

    const result = new Map();

    if (data.quotes) {
      for (const [symbol, quote] of Object.entries(data.quotes)) {
        result.set(symbol, {
          bid: quote.bp,
          ask: quote.ap,
          last: (quote.bp + quote.ap) / 2,
        });
      }
    }

    return result;
  }

  /**
   * Place an order (paper trading)
   */
  async placeOrder(params: {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type?: 'market' | 'limit';
    limitPrice?: number;
  }): Promise<{ orderId: string; status: string }> {
    const data = await this.callApi('order', {
      symbol: params.symbol,
      qty: params.qty,
      side: params.side,
      type: params.type || 'market',
      time_in_force: 'day',
    }) as { id: string; status: string };

    return {
      orderId: data.id,
      status: data.status,
    };
  }

  /**
   * Get open positions
   */
  async getPositions(): Promise<Array<{
    symbol: string;
    qty: number;
    avgEntryPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
  }>> {
    const data = await this.callApi('positions') as Array<{
      symbol: string;
      qty: string;
      avg_entry_price: string;
      current_price: string;
      unrealized_pl: string;
      unrealized_plpc: string;
    }>;

    return data.map((pos) => ({
      symbol: pos.symbol,
      qty: parseInt(pos.qty),
      avgEntryPrice: parseFloat(pos.avg_entry_price),
      currentPrice: parseFloat(pos.current_price),
      unrealizedPnL: parseFloat(pos.unrealized_pl),
      unrealizedPnLPercent: parseFloat(pos.unrealized_plpc) * 100,
    }));
  }

  /**
   * Note: Alpaca doesn't provide options data on free tier
   * This returns a placeholder - you'd need Tradier or similar for full options
   */
  async fetchOptionChain(_underlying: string): Promise<OptionChain | null> {
    console.log('[Alpaca] Options data not available on free tier');
    return null;
  }
}

// Singleton instance
let alpacaInstance: AlpacaProvider | null = null;

export function getAlpacaProvider(): AlpacaProvider {
  if (!alpacaInstance) {
    alpacaInstance = new AlpacaProvider();
  }
  return alpacaInstance;
}
