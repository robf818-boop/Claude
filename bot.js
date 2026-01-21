// bot.js
require("dotenv").config();
const Alpaca = require("@alpacahq/alpaca-trade-api");
const fs = require("fs");

const alpaca = new Alpaca({
  keyId: process.env.ALPACA_KEY,
  secretKey: process.env.ALPACA_SECRET,
  paper: (process.env.ALPACA_PAPER || "true").toLowerCase() === "true",
});

// =====================
// CONFIG (EDIT THESE)
// =====================
const SYMBOLS = ["SPY", "QQQ"];

// TESTING MODE: run all day (paper only recommended)
const RUN_ALL_DAY_TEST = true;

// If RUN_ALL_DAY_TEST=false, enforce 9:30–11:00 ET
const TRADE_START_ET = "09:30:30";
const TRADE_END_ET = "11:00:00";

const SHARES_OPEN = 100;       // open session size
const SHARES_MIDDAY = 50;      // if you later add regimes
const USE_ONLY_PULLBACK = true; // keep simple for first test

const RSI_LEN = 14;
const VWAP_NO_TRADE_BAND_PCT = 0.0003; // 0.03%
const MAX_SPREAD = 0.02;

const TP1 = 0.10; // dollars per share
const TP2 = 0.25;
const STOP = 0.08;
const TRAIL = 0.06;
const TIME_STOP_SEC = 180;

const ENTRY_TIMEOUT_MS = 3000;
const COOLDOWN_SEC = 90;

const DAILY_MAX_LOSS = -400;
const MAX_LOSING_TRADES = 5;
const MAX_CONSEC_LOSSES = 3;
const MAX_TRADES_PER_SYMBOL = 4;
const MAX_TRADES_TOTAL = 8;

const STATE_FILE = "./state.json"; // local persistence for testing

// =====================
// STATE
// =====================
function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    return {
      date: null,
      state: "ACTIVE", // ACTIVE | PAUSED | KILLED
      realizedPnl: 0,
      losingTrades: 0,
      consecLosses: 0,
      tradesTotal: 0,
      tradesBySymbol: { SPY: 0, QQQ: 0 },
      cooldownUntil: { SPY: 0, QQQ: 0 },
      openPos: null, // {symbol, side, qty, entryPrice, entryTimeMs, tp1Done, peak}
    };
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

function saveState(s) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

let S = loadState();

// Reset daily state if new day
function todayETDateString() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}
function resetIfNewDay() {
  const d = todayETDateString();
  if (S.date !== d) {
    S = {
      date: d,
      state: "ACTIVE",
      realizedPnl: 0,
      losingTrades: 0,
      consecLosses: 0,
      tradesTotal: 0,
      tradesBySymbol: { SPY: 0, QQQ: 0 },
      cooldownUntil: { SPY: 0, QQQ: 0 },
      openPos: null,
    };
    saveState(S);
    log(`New day state reset: ${d}`);
  }
}

// =====================
// TIME HELPERS
// =====================
function nowET() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
}
function etTimeString(d = nowET()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
function inTradeWindow() {
  if (RUN_ALL_DAY_TEST) return true;
  const t = etTimeString();
  return t >= TRADE_START_ET && t < TRADE_END_ET;
}

// =====================
// INDICATORS
// =====================
function rsi(closes, len = 14) {
  if (closes.length < len + 1) return null;
  let gains = 0, losses = 0;
  for (let i = closes.length - len; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }
  const avgGain = gains / len;
  const avgLoss = losses / len;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function vwapFromBars(bars) {
  let cumTPV = 0, cumV = 0;
  for (const b of bars) {
    const tp = (b.h + b.l + b.c) / 3;
    cumTPV += tp * b.v;
    cumV += b.v;
  }
  if (cumV === 0) return null;
  return cumTPV / cumV;
}

function avgVol20(bars) {
  const last = bars.slice(-20);
  if (last.length === 0) return null;
  const sum = last.reduce((a, b) => a + b.v, 0);
  return sum / last.length;
}

// =====================
// BROKER HELPERS
// =====================
async function getQuote(symbol) {
  const q = await alpaca.getLatestQuote(symbol);
  const bid = q.BidPrice || q.bp || q.bidprice || q.bidPrice;
  const ask = q.AskPrice || q.ap || q.askprice || q.askPrice;
  return { bid, ask, spread: (ask && bid) ? (ask - bid) : null };
}

async function getBars1MinToday(symbol) {
  const end = new Date();
  const start = new Date(end);
  start.setHours(0,0,0,0);

  const bars = [];
  const barIterator = alpaca.getBarsV2(symbol, {
    start: start.toISOString(),
    end: end.toISOString(),
    timeframe: "1Min",
    adjustment: "raw",
    limit: 1000,
  });

  for await (const bar of barIterator) {
    bars.push({
      t: bar.Timestamp || bar.t,
      o: bar.OpenPrice || bar.o,
      h: bar.HighPrice || bar.h,
      l: bar.LowPrice || bar.l,
      c: bar.ClosePrice || bar.c,
      v: bar.Volume || bar.v,
    });
  }
  return bars;
}

async function placeLimit(symbol, side, qty, limitPrice) {
  return alpaca.createOrder({
    symbol,
    qty,
    side,
    type: "limit",
    time_in_force: "day",
    limit_price: Number(limitPrice.toFixed(2)),
  });
}

async function placeMarket(symbol, side, qty) {
  return alpaca.createOrder({
    symbol,
    qty,
    side,
    type: "market",
    time_in_force: "day",
  });
}

async function cancelAll() {
  try { await alpaca.cancelAllOrders(); } catch {}
}

async function closeAllPositions() {
  try { await alpaca.closeAllPositions(); } catch {}
}

async function getPosition(symbol) {
  try {
    const p = await alpaca.getPosition(symbol);
    return {
      qty: Number(p.qty),
      side: Number(p.qty) > 0 ? "long" : "short",
      avgEntry: Number(p.avg_entry_price),
      unrealized: Number(p.unrealized_pl),
    };
  } catch {
    return null;
  }
}

// =====================
// LOGGING
// =====================
function log(msg) {
  console.log(`[${todayETDateString()} ${etTimeString()} ET] ${msg}`);
}

// =====================
// RISK / KILL SWITCHES
// =====================
function shouldKill() {
  if (S.realizedPnl <= DAILY_MAX_LOSS) return `DAILY_MAX_LOSS hit (${S.realizedPnl})`;
  if (S.losingTrades >= MAX_LOSING_TRADES) return `MAX_LOSING_TRADES hit (${S.losingTrades})`;
  if (S.consecLosses >= MAX_CONSEC_LOSSES) return `MAX_CONSEC_LOSSES hit (${S.consecLosses})`;
  if (S.tradesTotal >= MAX_TRADES_TOTAL) return `MAX_TRADES_TOTAL hit (${S.tradesTotal})`;
  return null;
}

async function killBot(reason) {
  log(`KILL BOT: ${reason}`);
  S.state = "KILLED";
  saveState(S);
  await cancelAll();
  await closeAllPositions();
}

// =====================
// TRADE LOGIC
// =====================
async function tryEnter(symbol) {
  const nowMs = Date.now();
  if (S.state !== "ACTIVE") return;
  if (!inTradeWindow()) return;

  if (S.openPos) return;
  if (nowMs < (S.cooldownUntil[symbol] || 0)) return;
  if (S.tradesBySymbol[symbol] >= MAX_TRADES_PER_SYMBOL) return;

  // Spread check
  const { bid, ask, spread } = await getQuote(symbol);
  if (!bid || !ask || spread == null) return;
  if (spread > MAX_SPREAD) return;

  const bars = await getBars1MinToday(symbol);
  if (bars.length < 50) return;

  const closes = bars.map(b => b.c);
  const current = bars[bars.length - 1];
  const vwap = vwapFromBars(bars);
  const r = rsi(closes, RSI_LEN);
  const av20 = avgVol20(bars);

  if (!vwap || r == null || !av20) return;

  const price = current.c;
  const noTradeBand = VWAP_NO_TRADE_BAND_PCT * price;
  if (Math.abs(price - vwap) <= noTradeBand) return;

  // Volume spike filter
  if (current.v > 2.0 * av20) return;

  // Distance filter (near VWAP)
  const distPct = Math.abs(price - vwap) / vwap;
  if (distPct > 0.0025) return;

  // Direction filter
  const above = price > vwap;

  // Pullback setup
  const isRed = current.c < current.o;
  const isGreen = current.c > current.o;

  let side = null;
  if (above && isRed && r <= 35) side = "buy";
  if (!above && isGreen && r >= 65) side = "sell";

  if (!side) return;

  const qty = SHARES_OPEN;
  const entryPrice = side === "buy" ? bid : ask;

  log(`${symbol} SIGNAL ${side.toUpperCase()} | price=${price.toFixed(2)} vwap=${vwap.toFixed(2)} rsi=${r.toFixed(1)} spread=${spread.toFixed(2)}`);

  // Place limit entry
  const order = await placeLimit(symbol, side, qty, entryPrice);
  const orderId = order.id;

  // Wait for fill or timeout
  const start = Date.now();
  while (Date.now() - start < ENTRY_TIMEOUT_MS) {
    const o = await alpaca.getOrder(orderId);
    if (o.status === "filled") {
      const fillPrice = Number(o.filled_avg_price);
      S.openPos = {
        symbol,
        side: side === "buy" ? "LONG" : "SHORT",
        qty,
        entryPrice: fillPrice,
        entryTimeMs: Date.now(),
        tp1Done: false,
        peak: fillPrice,
      };
      S.tradesBySymbol[symbol] += 1;
      S.tradesTotal += 1;
      saveState(S);
      log(`${symbol} ENTRY FILLED ${S.openPos.side} @ ${fillPrice.toFixed(2)} qty=${qty}`);
      return;
    }
    if (["canceled", "rejected", "expired"].includes(o.status)) {
      return;
    }
    await new Promise(res => setTimeout(res, 350));
  }

  // Timeout -> cancel
  try { await alpaca.cancelOrder(orderId); } catch {}
  log(`${symbol} entry timeout -> canceled`);
}

async function manageOpenPosition() {
  if (!S.openPos) return;
  const pos = S.openPos;

  const { bid, ask } = await getQuote(pos.symbol);
  if (!bid || !ask) return;
  const last = (bid + ask) / 2;

  // Update peak for trailing
  if (pos.side === "LONG") pos.peak = Math.max(pos.peak, last);
  if (pos.side === "SHORT") pos.peak = Math.min(pos.peak, last);

  const heldSec = (Date.now() - pos.entryTimeMs) / 1000;

  const tp1 = pos.side === "LONG" ? pos.entryPrice + TP1 : pos.entryPrice - TP1;
  const tp2 = pos.side === "LONG" ? pos.entryPrice + TP2 : pos.entryPrice - TP2;
  const stop = pos.side === "LONG" ? pos.entryPrice - STOP : pos.entryPrice + STOP;

  const trailStop = (() => {
    if (!pos.tp1Done) return null;
    if (pos.side === "LONG") return pos.peak - TRAIL;
    return pos.peak + TRAIL;
  })();

  // HARD STOP
  if ((pos.side === "LONG" && last <= stop) || (pos.side === "SHORT" && last >= stop)) {
    log(`${pos.symbol} STOP HIT last=${last.toFixed(2)} stop=${stop.toFixed(2)} -> MARKET EXIT`);
    await placeMarket(pos.symbol, pos.side === "LONG" ? "sell" : "buy", pos.qty);
    await finalizeClose();
    return;
  }

  // TIME STOP
  if (heldSec >= TIME_STOP_SEC) {
    log(`${pos.symbol} TIME STOP ${heldSec.toFixed(0)}s -> MARKET EXIT`);
    await placeMarket(pos.symbol, pos.side === "LONG" ? "sell" : "buy", pos.qty);
    await finalizeClose();
    return;
  }

  // TP1
  if (!pos.tp1Done) {
    if ((pos.side === "LONG" && last >= tp1) || (pos.side === "SHORT" && last <= tp1)) {
      const qty1 = Math.floor(pos.qty / 2);
      log(`${pos.symbol} TP1 HIT last=${last.toFixed(2)} -> exit ${qty1}`);
      await placeMarket(pos.symbol, pos.side === "LONG" ? "sell" : "buy", qty1);
      pos.tp1Done = true;
      pos.qty = pos.qty - qty1;
      saveState(S);
      return;
    }
  } else {
    // TP2
    if ((pos.side === "LONG" && last >= tp2) || (pos.side === "SHORT" && last <= tp2)) {
      log(`${pos.symbol} TP2 HIT last=${last.toFixed(2)} -> exit rest ${pos.qty}`);
      await placeMarket(pos.symbol, pos.side === "LONG" ? "sell" : "buy", pos.qty);
      await finalizeClose();
      return;
    }

    // TRAIL STOP
    if (trailStop != null) {
      if ((pos.side === "LONG" && last <= trailStop) || (pos.side === "SHORT" && last >= trailStop)) {
        log(`${pos.symbol} TRAIL STOP HIT last=${last.toFixed(2)} trail=${trailStop.toFixed(2)} -> exit rest ${pos.qty}`);
        await placeMarket(pos.symbol, pos.side === "LONG" ? "sell" : "buy", pos.qty);
        await finalizeClose();
        return;
      }
    }
  }
}

async function finalizeClose() {
  await new Promise(res => setTimeout(res, 1200));

  const pos = S.openPos;
  const p = await getPosition(pos.symbol);

  if (p && Math.abs(p.qty) > 0) {
    saveState(S);
    return;
  }

  const wasWin = pos.tp1Done;
  if (!wasWin) {
    S.losingTrades += 1;
    S.consecLosses += 1;
  } else {
    S.consecLosses = 0;
  }

  S.cooldownUntil[pos.symbol] = Date.now() + COOLDOWN_SEC * 1000;
  S.openPos = null;

  saveState(S);

  const reason = shouldKill();
  if (reason) {
    await killBot(reason);
  }
}

// =====================
// MAIN LOOP
// =====================
async function loop() {
  resetIfNewDay();

  if (S.state === "KILLED") {
    return;
  }

  if (!RUN_ALL_DAY_TEST && !inTradeWindow()) {
    await killBot("Outside trade window");
    return;
  }

  const reason = shouldKill();
  if (reason) {
    await killBot(reason);
    return;
  }

  await manageOpenPosition();

  if (!S.openPos) {
    for (const sym of SYMBOLS) {
      await tryEnter(sym);
      if (S.openPos) break;
    }
  }
}

async function main() {
  log(`Starting bot | PAPER=${alpaca.configuration.paper} | RUN_ALL_DAY_TEST=${RUN_ALL_DAY_TEST}`);
  log(`Symbols=${SYMBOLS.join(",")} Shares=${SHARES_OPEN}`);

  setInterval(() => {
    loop().catch(e => log(`ERROR: ${e.message || e}`));
  }, 5000);
}

main().catch(e => console.error(e));
