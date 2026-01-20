// Vercel Serverless Function: Alpaca API Proxy

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const ALPACA_KEY = process.env.ALPACA_API_KEY;
  const ALPACA_SECRET = process.env.ALPACA_SECRET_KEY;

  if (!ALPACA_KEY || !ALPACA_SECRET) {
    return res.status(500).json({
      error: 'Alpaca API keys not configured',
      hint: 'Add ALPACA_API_KEY and ALPACA_SECRET_KEY in Vercel dashboard'
    });
  }

  const TRADING_URL = 'https://paper-api.alpaca.markets';
  const DATA_URL = 'https://data.alpaca.markets';

  const alpacaHeaders = {
    'APCA-API-KEY-ID': ALPACA_KEY,
    'APCA-API-SECRET-KEY': ALPACA_SECRET,
  };

  try {
    const { action, symbols, timeframe, limit, symbol, qty, side, type, time_in_force } = req.body || {};

    let response;
    let data;

    switch (action) {
      case 'account':
        response = await fetch(TRADING_URL + '/v2/account', { headers: alpacaHeaders });
        data = await response.json();
        break;

      case 'positions':
        response = await fetch(TRADING_URL + '/v2/positions', { headers: alpacaHeaders });
        data = await response.json();
        break;

      case 'bars':
        const symbolList = Array.isArray(symbols) ? symbols.join(',') : symbols;
        const tf = timeframe || '5Min';
        const lim = limit || 100;
        response = await fetch(
          DATA_URL + '/v2/stocks/bars?symbols=' + symbolList + '&timeframe=' + tf + '&limit=' + lim,
          { headers: alpacaHeaders }
        );
        data = await response.json();
        break;

      case 'quotes':
        const quoteSymbols = Array.isArray(symbols) ? symbols.join(',') : symbols;
        response = await fetch(
          DATA_URL + '/v2/stocks/quotes/latest?symbols=' + quoteSymbols,
          { headers: alpacaHeaders }
        );
        data = await response.json();
        break;

      case 'snapshot':
        const snapSymbols = Array.isArray(symbols) ? symbols.join(',') : symbols;
        response = await fetch(
          DATA_URL + '/v2/stocks/snapshots?symbols=' + snapSymbols,
          { headers: alpacaHeaders }
        );
        data = await response.json();
        break;

      case 'order':
        response = await fetch(TRADING_URL + '/v2/orders', {
          method: 'POST',
          headers: { ...alpacaHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol,
            qty,
            side,
            type: type || 'market',
            time_in_force: time_in_force || 'day',
          }),
        });
        data = await response.json();
        break;

      case 'orders':
        response = await fetch(TRADING_URL + '/v2/orders?status=all&limit=50', { headers: alpacaHeaders });
        data = await response.json();
        break;

      case 'clock':
        response = await fetch(TRADING_URL + '/v2/clock', { headers: alpacaHeaders });
        data = await response.json();
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Alpaca API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
