// Netlify Function: Alpaca API Proxy
// Fetches real market data from Alpaca

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const ALPACA_KEY = process.env.ALPACA_API_KEY;
  const ALPACA_SECRET = process.env.ALPACA_SECRET_KEY;

  // Check if keys are configured
  if (!ALPACA_KEY || !ALPACA_SECRET) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Alpaca API keys not configured in Netlify environment variables',
        hint: 'Add ALPACA_API_KEY and ALPACA_SECRET_KEY in Netlify dashboard'
      }),
    };
  }

  // Paper trading URLs
  const TRADING_URL = 'https://paper-api.alpaca.markets';
  const DATA_URL = 'https://data.alpaca.markets';

  const alpacaHeaders = {
    'APCA-API-KEY-ID': ALPACA_KEY,
    'APCA-API-SECRET-KEY': ALPACA_SECRET,
  };

  try {
    const { action, symbols, timeframe, limit } = JSON.parse(event.body || '{}');

    let response;
    let data;

    switch (action) {
      case 'account':
        // Get account info
        response = await fetch(`${TRADING_URL}/v2/account`, {
          headers: alpacaHeaders,
        });
        data = await response.json();
        break;

      case 'positions':
        // Get open positions
        response = await fetch(`${TRADING_URL}/v2/positions`, {
          headers: alpacaHeaders,
        });
        data = await response.json();
        break;

      case 'bars':
        // Get historical bars/candles
        const symbolList = Array.isArray(symbols) ? symbols.join(',') : symbols;
        const tf = timeframe || '5Min';
        const lim = limit || 100;

        response = await fetch(
          `${DATA_URL}/v2/stocks/bars?symbols=${symbolList}&timeframe=${tf}&limit=${lim}`,
          { headers: alpacaHeaders }
        );
        data = await response.json();
        break;

      case 'quotes':
        // Get latest quotes
        const quoteSymbols = Array.isArray(symbols) ? symbols.join(',') : symbols;
        response = await fetch(
          `${DATA_URL}/v2/stocks/quotes/latest?symbols=${quoteSymbols}`,
          { headers: alpacaHeaders }
        );
        data = await response.json();
        break;

      case 'snapshot':
        // Get snapshots (quotes + bars + trades)
        const snapSymbols = Array.isArray(symbols) ? symbols.join(',') : symbols;
        response = await fetch(
          `${DATA_URL}/v2/stocks/snapshots?symbols=${snapSymbols}`,
          { headers: alpacaHeaders }
        );
        data = await response.json();
        break;

      case 'order':
        // Place an order
        const { symbol, qty, side, type, time_in_force } = JSON.parse(event.body);
        response = await fetch(`${TRADING_URL}/v2/orders`, {
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
        // Get orders
        response = await fetch(`${TRADING_URL}/v2/orders?status=all&limit=50`, {
          headers: alpacaHeaders,
        });
        data = await response.json();
        break;

      case 'clock':
        // Get market clock
        response = await fetch(`${TRADING_URL}/v2/clock`, {
          headers: alpacaHeaders,
        });
        data = await response.json();
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' }),
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Alpaca API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        details: 'Check Netlify function logs for more information'
      }),
    };
  }
};
