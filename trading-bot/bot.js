#!/usr/bin/env node
'use strict';

/**
 * Wheel Strategy + ETF Trend Bot v2 — Alpaca Live
 *
 * INCOME ENGINE (Wheel):
 *   1. Sell cash-secured puts (4% OTM, 21-45 DTE) on quality stocks in uptrend
 *   2. Close at 50% profit — capture theta decay, rinse repeat
 *   3. If assigned → sell covered calls (3% above cost basis)
 *   4. Close calls at 50% profit → sell new calls → repeat until called away
 *
 * TREND CORE:
 *   Hold SPY/QQQ when price > SMA50 > SMA200. Exit when trend breaks.
 *
 * RISK:
 *   Weekly -5% drawdown halt | HV panic filter | max 4 wheels | max 70% deployed
 *
 * v2 FIXES:
 *   - S.wheels null guard (fixes CYCLE_FAIL crash on stale state)
 *   - Cheaper symbols (SOFI/PLTR/MARA etc) — works with ~$1k options BP
 *   - GTC orders for options so unfilled orders persist overnight
 *   - Pending order tracking — fill verified before updating state
 *   - Stack traces in error logs
 *   - Skip API calls when market closed + no active positions
 *   - Cumulative P&L tracked and logged every heartbeat
 */

const fs   = require('fs');
const path = require('path');
const axios = require('axios');

// ── .env loader ───────────────────────────────────────────────────────────────
(function loadEnv() {
  const p = path.join(process.cwd(), '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
})();

// ── Config ────────────────────────────────────────────────────────────────────
const C = {
  KEY:    process.env.ALPACA_KEY    || '',
  SECRET: process.env.ALPACA_SECRET || '',

  PAPER:      bool(process.env.PAPER,      false),
  DRY_RUN:    bool(process.env.DRY_RUN,    false),
  LIVE_ARMED: bool(process.env.LIVE_ARMED, false),

  LOOP_SECONDS: num(process.env.LOOP_SECONDS, 300),

  TREND_SYMBOLS:  csv(process.env.TREND_SYMBOLS  || 'SPY,QQQ'),
  // Cheaper symbols (~$5-25) so wheel works with ~$1k options buying power
  WHEEL_SYMBOLS:  csv(process.env.WHEEL_SYMBOLS  || 'SOFI,PLTR,MARA,HOOD,SNAP,RIVN,NIO,SOUN'),

  MAX_WHEEL_POSITIONS: num(process.env.MAX_WHEEL_POSITIONS, 4),
  MAX_CAPITAL_PCT:     num(process.env.MAX_CAPITAL_PCT,     0.70),

  PUT_OTM_PCT:  num(process.env.PUT_OTM_PCT,  0.04),
  CALL_OTM_PCT: num(process.env.CALL_OTM_PCT, 0.03),

  DTE_MIN:      num(process.env.DTE_MIN,      21),
  DTE_MAX:      num(process.env.DTE_MAX,      45),
  PROFIT_CLOSE: num(process.env.PROFIT_CLOSE, 0.50),
  STOP_MULT:    num(process.env.STOP_MULT,    2.00),

  HV_PANIC:        num(process.env.HV_PANIC,        0.45),
  WEEKLY_HALT_PCT: num(process.env.WEEKLY_HALT_PCT, 0.05),

  LOG_DIR: process.env.LOG_DIR || path.join(process.cwd(), 'bot_data'),
};

if (!C.KEY || !C.SECRET)         { console.error('ALPACA_KEY / ALPACA_SECRET missing'); process.exit(1); }
if (!C.PAPER && !C.LIVE_ARMED)   { console.error('Live trading requires LIVE_ARMED=true'); process.exit(1); }
if (!fs.existsSync(C.LOG_DIR))   fs.mkdirSync(C.LOG_DIR, { recursive: true });

const BASE_T  = C.PAPER ? 'https://paper-api.alpaca.markets' : 'https://api.alpaca.markets';
const BASE_D  = 'https://data.alpaca.markets';
const LOG_F   = path.join(C.LOG_DIR, C.PAPER ? 'wheel_paper.log'  : 'wheel_live.log');
const STATE_F = path.join(C.LOG_DIR, C.PAPER ? 'state_paper.json' : 'state_live.json');

const ht = axios.create({ baseURL: BASE_T, timeout: 30000, headers: { 'APCA-API-KEY-ID': C.KEY, 'APCA-API-SECRET-KEY': C.SECRET, 'Content-Type': 'application/json' } });
const hd = axios.create({ baseURL: BASE_D, timeout: 30000, headers: { 'APCA-API-KEY-ID': C.KEY, 'APCA-API-SECRET-KEY': C.SECRET } });

// ── State ─────────────────────────────────────────────────────────────────────
// wheels[underlying]       = { phase, optionSymbol, contracts, premiumCollected, costBasis, openedAt }
// pendingOrders[underlying] = { orderId, optionSymbol, contracts, limitPrice, type, openedAt }
let S = loadState();
// Guards: ensure required keys always exist regardless of stale state files
S.wheels        = S.wheels        || {};
S.pendingOrders = S.pendingOrders || {};
S.totalPremiumEarned = S.totalPremiumEarned || 0;
rollWeek();

// ── Boot ──────────────────────────────────────────────────────────────────────
async function main() {
  log(`BOOT mode=${C.PAPER ? 'PAPER' : 'LIVE'} dry_run=${C.DRY_RUN} endpoint=${BASE_T}`);
  log(`WHEELS=${C.WHEEL_SYMBOLS.join(',')} MAX=${C.MAX_WHEEL_POSITIONS} BP_PER_PUT=strike*100`);
  try {
    const [acct, clock] = await Promise.all([getAccount(), getClock()]);
    log(`SELFTEST ok status=${acct.status} options_level=${acct.options_trading_level ?? 'n/a'} market_open=${clock.is_open} equity=${fmt(acct.equity)}`);
    if (!S.weekStartEquity) { S.weekStartEquity = num(acct.equity); saveState(); }
  } catch (e) {
    logErr('BOOT_FAIL', e);
    process.exit(1);
  }
  for (;;) {
    try { rollWeek(); await cycle(); } catch (e) { logErr('CYCLE_FAIL', e); log(`STACK ${e.stack}`); }
    await sleep(C.LOOP_SECONDS * 1000);
  }
}

// ── Cycle ─────────────────────────────────────────────────────────────────────
async function cycle() {
  const [acct, clock, positions, orders] = await Promise.all([
    getAccount(), getClock(), listPositions(), listOpenOrders(),
  ]);

  const equity   = num(acct.equity);
  const weekPnL  = S.weekStartEquity ? (equity - S.weekStartEquity) / S.weekStartEquity : 0;
  const hasActive = Object.keys(S.wheels).length > 0 || Object.keys(S.pendingOrders).length > 0;
  log(`HEARTBEAT equity=${fmt(equity)} week_pnl=${pct(weekPnL)} opts_bp=${fmt(acct.options_buying_power)} total_premium=${fmt(S.totalPremiumEarned)} wheels=${Object.keys(S.wheels).length} pending=${Object.keys(S.pendingOrders).length}`);

  // Skip heavy work when market is closed and nothing to manage
  if (!clock.is_open && !hasActive) {
    log('MARKET_CLOSED no active wheels — sleeping');
    return;
  }

  // Check fill status of any pending orders
  await checkPendingOrders({ orders });

  // Always manage existing positions regardless of halt
  await manageTrend({ acct, positions, orders });
  await manageWheels({ positions, orders });

  if (weekPnL <= -C.WEEKLY_HALT_PCT) {
    log(`HALT week_pnl=${pct(weekPnL)} — no new entries until next week`);
    return;
  }
  if (!clock.is_open) { log('MARKET_CLOSED no new entries'); return; }
  if (num(acct.options_trading_level) < 1) { log('OPTIONS_LEVEL<1 cannot sell options'); return; }

  await openNewWheels({ acct, positions });
}

// ── Check pending orders for fills ───────────────────────────────────────────
async function checkPendingOrders({ orders }) {
  if (!Object.keys(S.pendingOrders).length) return;
  const openIds = new Set(orders.map(o => o.id));

  for (const key of Object.keys(S.pendingOrders)) {
    const p = S.pendingOrders[key];
    if (openIds.has(p.orderId)) continue; // still open

    let od;
    try { const { data } = await ht.get(`/v2/orders/${p.orderId}`); od = data; }
    catch (e) { logErr(`PENDING_CHECK ${key}`, e); continue; }

    if (od.status === 'filled') {
      const filled = num(od.filled_avg_price);
      log(`ORDER_FILLED ${key} type=${p.type} filled=${fmt(filled)} contracts=${p.contracts}`);
      if (p.type === 'put_open') {
        S.wheels[p.underlying] = { phase: 'put', optionSymbol: p.optionSymbol, contracts: p.contracts, premiumCollected: filled * 100 * p.contracts, costBasis: null, openedAt: p.openedAt };
      } else if (p.type === 'call_open' && S.wheels[p.underlying]) {
        S.wheels[p.underlying].optionSymbol = p.optionSymbol;
        S.wheels[p.underlying].premiumCollected += filled * 100 * p.contracts;
      }
      delete S.pendingOrders[key];
      saveState();
    } else if (['cancelled', 'expired', 'rejected'].includes(od.status)) {
      log(`ORDER_${od.status.toUpperCase()} ${key} — removed from pending`);
      if (p.type === 'call_open' && S.wheels[p.underlying]) S.wheels[p.underlying].optionSymbol = null;
      delete S.pendingOrders[key];
      saveState();
    }
  }
}

// ── Trend core ────────────────────────────────────────────────────────────────
async function manageTrend({ acct, positions, orders }) {
  const dk = todayKey();
  if (S.trendDate === dk) return;

  const bars   = await getBars(C.TREND_SYMBOLS, '1Day', 220);
  const posMap = posMap_(positions);
  const openSyms = new Set(orders.map(o => o.symbol));
  const equity = num(acct.equity);
  // Trend allocation = whatever capital is NOT reserved for wheels
  const budget    = equity * (1 - C.MAX_CAPITAL_PCT) * 0.95;
  const perSymbol = budget / C.TREND_SYMBOLS.length;

  for (const sym of C.TREND_SYMBOLS) {
    if (openSyms.has(sym)) continue;
    const series = bars[sym] || [];
    if (series.length < 200) continue;
    const closes = series.map(b => b.c);
    const last   = closes.at(-1);
    const sma50  = SMA(closes, 50);
    const sma200 = SMA(closes, 200);
    const bull   = last > sma50 && sma50 > sma200;
    const pos    = posMap[sym];
    const qty    = num(pos?.qty);
    const val    = qty * last;

    if (!bull && qty > 0) {
      await order({ symbol: sym, qty, side: 'sell', type: 'market', tif: 'day', tag: 'TREND_EXIT' });
    } else if (bull && val < perSymbol * 0.85) {
      const buyQty = Math.floor((perSymbol - val) / last);
      if (buyQty >= 1) await order({ symbol: sym, qty: buyQty, side: 'buy', type: 'market', tif: 'day', tag: 'TREND_ADD' });
    }
  }
  S.trendDate = dk;
  saveState();
}

// ── Wheel management ──────────────────────────────────────────────────────────
async function manageWheels({ positions, orders }) {
  const posMap  = posMap_(positions);
  const openSyms = new Set(orders.map(o => o.symbol));

  for (const underlying of Object.keys(S.wheels)) {
    const wheel = S.wheels[underlying];

    // ── PUT phase ─────────────────────────────────────────────────────────────
    if (wheel.phase === 'put') {
      const optPos   = posMap[wheel.optionSymbol];
      const stockPos = posMap[underlying];
      const stockQty = num(stockPos?.qty);

      if (!optPos) {
        // Option position is gone
        if (stockQty >= wheel.contracts * 100) {
          // Assignment: stock appeared
          const cb = num(stockPos.avg_entry_price);
          log(`ASSIGNED ${underlying} cost_basis=${fmt(cb)} total_premium=${fmt(wheel.premiumCollected)}`);
          wheel.phase        = 'call';
          wheel.costBasis    = cb;
          wheel.optionSymbol = null;
          saveState();
          await sellCoveredCall(underlying, wheel, posMap, openSyms);
        } else {
          // Expired worthless or already closed
          S.totalPremiumEarned += wheel.premiumCollected;
          log(`PUT_GONE ${underlying} expired/closed premium_kept=${fmt(wheel.premiumCollected)} total_earned=${fmt(S.totalPremiumEarned)}`);
          delete S.wheels[underlying];
          saveState();
        }
        continue;
      }

      if (openSyms.has(wheel.optionSymbol)) continue;

      const entry   = num(optPos.avg_entry_price);  // credit received
      const current = num(optPos.current_price);
      if (entry <= 0 || current <= 0) continue;

      // Short put: profit = credit - current value
      const profitPct = (entry - current) / entry;

      if (profitPct >= C.PROFIT_CLOSE) {
        const qty   = Math.abs(num(optPos.qty));
        const limit = roundOption(current * 1.05);
        await order({ symbol: wheel.optionSymbol, qty, side: 'buy', type: 'limit', limitPrice: limit, tif: 'day', tag: 'PUT_CLOSE' });
        const kept = entry * profitPct * 100 * qty;
        S.totalPremiumEarned += kept;
        log(`PUT_CLOSE ${underlying} profit=${pct(profitPct)} kept=${fmt(kept)} total_earned=${fmt(S.totalPremiumEarned)}`);
        delete S.wheels[underlying];
        saveState();
        continue;
      }

      if (current >= entry * C.STOP_MULT) {
        const qty = Math.abs(num(optPos.qty));
        await order({ symbol: wheel.optionSymbol, qty, side: 'buy', type: 'market', tif: 'day', tag: 'PUT_STOP' });
        log(`PUT_STOP ${underlying} current=${fmt(current)} entry=${fmt(entry)}`);
        delete S.wheels[underlying];
        saveState();
      }
    }

    // ── CALL phase ────────────────────────────────────────────────────────────
    else if (wheel.phase === 'call') {
      const stockPos = posMap[underlying];
      const stockQty = num(stockPos?.qty);

      // No stock = called away or manually exited
      if (stockQty < wheel.contracts * 100 && !wheel.optionSymbol) {
        S.totalPremiumEarned += wheel.premiumCollected;
        log(`CALLED_AWAY ${underlying} total_premium=${fmt(wheel.premiumCollected)} total_earned=${fmt(S.totalPremiumEarned)}`);
        delete S.wheels[underlying];
        saveState();
        continue;
      }

      // Need to sell a covered call
      if (!wheel.optionSymbol) {
        await sellCoveredCall(underlying, wheel, posMap, openSyms);
        continue;
      }

      const optPos = posMap[wheel.optionSymbol];

      if (!optPos) {
        // Call disappeared — called away or closed
        if (stockQty < wheel.contracts * 100) {
          S.totalPremiumEarned += wheel.premiumCollected;
          log(`CALLED_AWAY ${underlying} total_premium=${fmt(wheel.premiumCollected)} total_earned=${fmt(S.totalPremiumEarned)}`);
          delete S.wheels[underlying];
        } else {
          // Call expired worthless — sell another
          log(`CALL_GONE ${underlying} selling new call`);
          wheel.optionSymbol = null;
        }
        saveState();
        continue;
      }

      if (openSyms.has(wheel.optionSymbol)) continue;

      const entry   = num(optPos.avg_entry_price);
      const current = num(optPos.current_price);
      if (entry <= 0 || current <= 0) continue;

      const profitPct = (entry - current) / entry;

      if (profitPct >= C.PROFIT_CLOSE) {
        const qty   = Math.abs(num(optPos.qty));
        const limit = roundOption(current * 1.05);
        await order({ symbol: wheel.optionSymbol, qty, side: 'buy', type: 'limit', limitPrice: limit, tif: 'day', tag: 'CALL_CLOSE' });
        const kept = entry * profitPct * 100 * qty;
        S.totalPremiumEarned += kept;
        log(`CALL_CLOSE ${underlying} profit=${pct(profitPct)} kept=${fmt(kept)} total_earned=${fmt(S.totalPremiumEarned)}`);
        wheel.premiumCollected += kept;
        wheel.optionSymbol = null;
        saveState();
        continue;
      }

      if (current >= entry * C.STOP_MULT) {
        const qty = Math.abs(num(optPos.qty));
        await order({ symbol: wheel.optionSymbol, qty, side: 'buy', type: 'market', tif: 'day', tag: 'CALL_STOP' });
        log(`CALL_STOP ${underlying} current=${fmt(current)} entry=${fmt(entry)}`);
        wheel.optionSymbol = null;
        saveState();
      }
    }
  }
}

async function sellCoveredCall(underlying, wheel, posMap, openSyms) {
  if (openSyms.has(underlying)) return;
  if (S.pendingOrders[`${underlying}_call`]) return; // already pending
  const stockPos = posMap[underlying];
  if (!stockPos) { log(`CALL_SKIP ${underlying} no stock position`); return; }

  const shares    = Math.abs(num(stockPos.qty));
  const contracts = Math.floor(shares / 100);
  if (contracts < 1) { log(`CALL_SKIP ${underlying} shares=${shares} < 100`); return; }

  const costBasis    = wheel.costBasis || num(stockPos.avg_entry_price);
  const targetStrike = costBasis * (1 + C.CALL_OTM_PCT);
  const currentPrice = num(stockPos.current_price);

  const contract = await pickOption(underlying, 'call', targetStrike, currentPrice);
  if (!contract) { log(`CALL_SKIP ${underlying} no contract found`); return; }

  const limitPrice = roundOption(contract.midPrice || contract.bidPrice);
  if (!limitPrice || limitPrice <= 0) { log(`CALL_SKIP ${underlying} bad price`); return; }

  // Use GTC so order persists if not filled today
  const result = await order({ symbol: contract.symbol, qty: contracts, side: 'sell', type: 'limit', limitPrice, tif: 'gtc', tag: 'CALL_OPEN' });
  if (!result || result.dry_run) return;

  log(`CALL_OPEN_PENDING ${underlying} strike=${contract.strike} expiry=${contract.expiry} premium=${fmt(limitPrice)} contracts=${contracts} orderId=${result.id}`);
  S.pendingOrders[`${underlying}_call`] = { type: 'call_open', underlying, orderId: result.id, optionSymbol: contract.symbol, contracts, limitPrice, openedAt: new Date().toISOString() };
  saveState();
}

// ── Open new wheel positions ───────────────────────────────────────────────────
async function openNewWheels({ acct, positions }) {
  const pendingPuts = Object.keys(S.pendingOrders).filter(k => !k.endsWith('_call')).length;
  const active = Object.keys(S.wheels).length + pendingPuts;
  const slots  = C.MAX_WHEEL_POSITIONS - active;
  if (slots <= 0) { log(`WHEEL_SKIP max_positions=${C.MAX_WHEEL_POSITIONS} active=${active}`); return; }

  const hv = await computeHV('SPY', 20);
  if (hv > C.HV_PANIC) { log(`WHEEL_SKIP hv=${pct(hv)} > panic=${pct(C.HV_PANIC)}`); return; }

  const inUse    = new Set([...Object.keys(S.wheels), ...Object.keys(S.pendingOrders).map(k => k.replace('_call', ''))]);
  const eligible = C.WHEEL_SYMBOLS.filter(s => !inUse.has(s));
  if (!eligible.length) return;

  const bars   = await getBars(eligible, '1Day', 110);
  const latest = await getLatestBars(eligible);
  const posMap = posMap_(positions);

  const scored = [];
  for (const sym of eligible) {
    if (posMap[sym]) continue;  // already hold stock
    const series = bars[sym] || [];
    const lb     = latest[sym];
    if (series.length < 100 || !lb) continue;

    const closes = series.map(b => b.c);
    const last   = lb.c;
    const sma50  = SMA(closes, 50);
    const sma100 = SMA(closes, 100);
    const rsi    = RSI(closes, 14);

    // Must be in uptrend — we want to own this stock if assigned
    if (!(last > sma50 && sma50 > sma100)) continue;
    if (rsi > 72) continue;  // overbought — skip

    // Score: prefer RSI in 45-65 sweet spot (good momentum, not overbought)
    const rsiScore = rsi >= 45 && rsi <= 65 ? 20 : 0;
    // Prefer stocks closer to SMA50 support (better put support)
    const distScore = Math.max(0, 20 - ((last - sma50) / sma50) * 200);
    scored.push({ sym, score: rsiScore + distScore, price: last, rsi });
  }

  scored.sort((a, b) => b.score - a.score);

  const equity    = num(acct.equity);
  const optionsBP = num(acct.options_buying_power);

  for (const candidate of scored.slice(0, slots)) {
    const targetStrike = candidate.price * (1 - C.PUT_OTM_PCT);
    const contract     = await pickOption(candidate.sym, 'put', targetStrike, candidate.price);
    if (!contract) { log(`PUT_SKIP ${candidate.sym} no contract`); continue; }

    const limitPrice = roundOption(contract.midPrice || contract.askPrice);
    if (!limitPrice || limitPrice <= 0) { log(`PUT_SKIP ${candidate.sym} bad price`); continue; }

    // Cash-secured: need strike * 100 * contracts in buying power
    const bpPerContract = contract.strike * 100;
    const maxByBP       = Math.floor(optionsBP / bpPerContract);
    const maxByEquity   = Math.floor((equity * C.MAX_CAPITAL_PCT / Math.max(slots, 1)) / bpPerContract);
    const contracts     = Math.min(maxByBP, maxByEquity, 5);  // hard cap 5 contracts per position

    if (contracts < 1) { log(`PUT_SKIP ${candidate.sym} insufficient bp need=${fmt(bpPerContract)}`); continue; }

    // GTC so order persists if unfilled today; track as pending until fill confirmed
    const result = await order({ symbol: contract.symbol, qty: contracts, side: 'sell', type: 'limit', limitPrice, tif: 'gtc', tag: 'PUT_OPEN' });
    if (!result || result.dry_run) continue;

    log(`PUT_OPEN_PENDING ${candidate.sym} strike=${contract.strike} expiry=${contract.expiry} premium=${fmt(limitPrice)} contracts=${contracts} rsi=${candidate.rsi.toFixed(1)} hv=${pct(hv)} orderId=${result.id}`);
    S.pendingOrders[candidate.sym] = { type: 'put_open', underlying: candidate.sym, orderId: result.id, optionSymbol: contract.symbol, contracts, limitPrice, openedAt: new Date().toISOString() };
    saveState();
  }
}

// ── Option selection ──────────────────────────────────────────────────────────
async function pickOption(underlying, type, targetStrike, underlyingPrice) {
  const today     = new Date();
  const contracts = await listOptionContracts({
    underlying_symbols: underlying,
    status:                 'active',
    expiration_date_gte:    isoDate(addDays(today, C.DTE_MIN)),
    expiration_date_lte:    isoDate(addDays(today, C.DTE_MAX)),
    type,
    limit: 100,
  });
  if (!contracts.length) return null;

  const candidates = contracts
    .map(c => ({
      ...c,
      strike: num(c.strike_price),
      expiry: c.expiration_date,
      dte:    daysBetween(today, new Date(c.expiration_date)),
    }))
    .filter(c => c.strike > 0 && Math.abs(c.strike - targetStrike) / underlyingPrice <= 0.10)
    .sort((a, b) => {
      const da = Math.abs(a.strike - targetStrike) + Math.abs(a.dte - 35) * 0.05;
      const db = Math.abs(b.strike - targetStrike) + Math.abs(b.dte - 35) * 0.05;
      return da - db;
    })
    .slice(0, 10);

  if (!candidates.length) return null;

  const snaps    = await getOptionSnapshots(candidates.map(c => c.symbol));
  const enriched = candidates.map(c => {
    const snap = snaps[c.symbol] || {};
    const q    = snap.latestQuote || snap.latest_quote || {};
    const t    = snap.latestTrade || snap.latest_trade || {};
    const bid  = num(q.bp ?? q.bid_price);
    const ask  = num(q.ap ?? q.ask_price);
    const last = num(t.p  ?? t.price);
    const mid  = bid > 0 && ask > 0 ? (bid + ask) / 2 : 0;
    const spr  = bid > 0 && ask > 0 ? (ask - bid) / Math.max(mid, 0.01) : 999;
    return { ...c, bidPrice: bid, askPrice: ask, lastPrice: last, midPrice: mid, spreadPct: spr };
  }).filter(c => (c.midPrice || c.lastPrice) > 0.05 && c.spreadPct < 0.30);

  if (!enriched.length) return null;
  enriched.sort((a, b) => a.spreadPct - b.spreadPct);
  return enriched[0];
}

// ── Alpaca API ────────────────────────────────────────────────────────────────
async function getAccount()     { const { data } = await ht.get('/v2/account');                                         return data; }
async function getClock()       { const { data } = await ht.get('/v2/clock');                                           return data; }
async function listPositions()  { const { data } = await ht.get('/v2/positions');                                       return Array.isArray(data) ? data : []; }
async function listOpenOrders() { const { data } = await ht.get('/v2/orders', { params: { status: 'open', limit: 500 } }); return Array.isArray(data) ? data : []; }

async function getBars(symbols, timeframe, limit) {
  const { data } = await hd.get('/v2/stocks/bars', { params: { symbols: symbols.join(','), timeframe, limit, adjustment: 'split', feed: 'sip' } });
  return data.bars || {};
}
async function getLatestBars(symbols) {
  const { data } = await hd.get('/v2/stocks/bars/latest', { params: { symbols: symbols.join(','), feed: 'sip' } });
  return data.bars || {};
}
async function listOptionContracts(params) {
  const { data } = await ht.get('/v2/options/contracts', { params });
  if (Array.isArray(data))                      return data;
  if (Array.isArray(data?.option_contracts))    return data.option_contracts;
  if (Array.isArray(data?.contracts))           return data.contracts;
  return [];
}
async function getOptionSnapshots(symbols) {
  if (!symbols.length) return {};
  const { data } = await hd.get('/v1beta1/options/snapshots', { params: { symbols: symbols.join(',') } });
  return data.snapshots || data || {};
}

async function order({ symbol, qty, side, type, tif, limitPrice, tag }) {
  const payload = { symbol, qty: String(Math.floor(Math.abs(qty))), side, type, time_in_force: tif };
  if (type === 'limit' && limitPrice) payload.limit_price = limitPrice.toFixed(2);
  if (num(payload.qty) <= 0) { log(`ORDER_SKIP ${tag} ${symbol} qty=0`); return null; }
  if (C.DRY_RUN) { log(`DRY_RUN ${tag} ${JSON.stringify(payload)}`); return { dry_run: true }; }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data } = await ht.post('/v2/orders', payload);
      log(`ORDER_OK ${tag} ${symbol} side=${side} qty=${payload.qty}${type === 'limit' ? ` limit=${payload.limit_price}` : ''} id=${data.id}`);
      return data;
    } catch (e) {
      logErr(`ORDER_FAIL attempt=${attempt} ${tag} ${symbol}`, e);
      if (attempt < 3) await sleep(2000 * attempt);
    }
  }
  return null;
}

// ── Indicators ────────────────────────────────────────────────────────────────
function SMA(values, length) {
  if (values.length < length) return NaN;
  const s = values.slice(-length);
  return s.reduce((a, b) => a + b, 0) / length;
}

function RSI(closes, period = 14) {
  // Wilder's smoothed RSI
  if (closes.length <= period + 1) return NaN;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

async function computeHV(symbol, days = 20) {
  try {
    const bars   = await getBars([symbol], '1Day', days + 2);
    const series = (bars[symbol] || []).slice(-(days + 1));
    if (series.length < days) return 0;
    const returns = [];
    for (let i = 1; i < series.length; i++) returns.push(Math.log(series[i].c / series[i - 1].c));
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
    return Math.sqrt(variance * 252);
  } catch (e) {
    logErr('computeHV', e);
    return 0;
  }
}

// ── State helpers ─────────────────────────────────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(STATE_F)) {
      const s = JSON.parse(fs.readFileSync(STATE_F, 'utf8'));
      // Ensure all required keys exist (handles upgrades from older state files)
      s.wheels             = s.wheels             || {};
      s.pendingOrders      = s.pendingOrders      || {};
      s.totalPremiumEarned = s.totalPremiumEarned || 0;
      return s;
    }
  } catch (e) { logErr('LOAD_STATE', e); }
  return { weekKey: weekKey(), weekStartEquity: null, trendDate: null, wheels: {}, pendingOrders: {}, totalPremiumEarned: 0 };
}
function saveState() { fs.writeFileSync(STATE_F, JSON.stringify(S, null, 2)); }
function rollWeek() {
  const wk = weekKey();
  if (S.weekKey !== wk) {
    log(`NEW_WEEK ${wk} prev_equity=${fmt(S.weekStartEquity)} total_premium_earned=${fmt(S.totalPremiumEarned)}`);
    S.weekKey = wk;
    S.weekStartEquity = null;
    saveState();
  }
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function log(msg)  { const l = `[${new Date().toISOString()}] ${msg}`; console.log(l); fs.appendFileSync(LOG_F, l + '\n'); }
function logErr(p, e) { const s = e?.response?.status ?? ''; const d = e?.response?.data ? JSON.stringify(e.response.data) : ''; log(`ERROR ${p} status=${s} ${e.message}${d ? ' ' + d : ''}`); }
function fmt(n)     { return `$${num(n).toFixed(2)}`; }
function pct(n)     { return `${(num(n) * 100).toFixed(2)}%`; }
function csv(s)     { return String(s || '').split(',').map(x => x.trim()).filter(Boolean); }
function bool(v, fb = false) { if (v === undefined || v === null || v === '') return fb; return ['1', 'true', 'yes', 'y', 'on'].includes(String(v).toLowerCase()); }
function num(v, fb = 0)      { const n = Number(v); return Number.isFinite(n) ? n : fb; }
function sleep(ms)  { return new Promise(r => setTimeout(r, ms)); }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function weekKey()  {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return `${d.getFullYear()}-W${String(Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7)).padStart(2, '0')}`;
}
function addDays(d, n)       { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function isoDate(d)          { return d.toISOString().slice(0, 10); }
function daysBetween(a, b)   { return Math.round((b - a) / 86400000); }
function posMap_(positions)  { const m = {}; for (const p of positions) m[p.symbol] = p; return m; }
function roundOption(price)  { return Math.round(num(price) * 20) / 20; }  // nearest $0.05

// ── Signals ───────────────────────────────────────────────────────────────────
process.on('SIGINT',  () => { log('SIGINT shutdown'); process.exit(0); });
process.on('SIGTERM', () => { log('SIGTERM shutdown'); process.exit(0); });

main().catch(e => { logErr('FATAL', e); process.exit(1); });
