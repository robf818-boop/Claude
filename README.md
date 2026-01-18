# AutoFlipper 📈

**Event-Driven Options Trading System with Real Market Data & Paper Trading**

An intelligent, automated trading system that uses real market data to generate and execute trades with simulated money (paper trading). Test your strategies risk-free before committing real capital.

## 🎯 What is This?

AutoFlipper is a complete algorithmic trading system that:
- ✅ Fetches **real-time market data** from Alpaca
- ✅ Analyzes price action using technical indicators (RSI, MACD, EMA, ATR)
- ✅ Generates buy/sell signals with confidence scoring
- ✅ Executes trades automatically (paper trading - no real money)
- ✅ Monitors risk and closes positions at profit/loss targets
- ✅ Provides a real-time dashboard to watch everything

**Perfect for**: Testing trading strategies, learning algorithmic trading, or building confidence before live trading.

## 🚀 Quick Start

### 1. Get API Keys (Free)
1. Sign up at [Alpaca Markets](https://alpaca.markets/)
2. Get your **Paper Trading** API keys
3. You'll receive $100,000 virtual money

### 2. Configure & Run
```bash
# Clone the repo
git clone https://github.com/robf818-boop/Claude.git
cd Claude

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env and add your Alpaca API keys

# Start the system
npm run dev
```

### 3. Open Dashboard
Navigate to `http://localhost:5173` and start the trading system!

## 📖 Full Setup Guide

**👉 [Read SETUP.md for complete instructions](./SETUP.md)**

This includes:
- Detailed Alpaca account setup
- System configuration
- Strategy tuning
- Auto-trading setup
- Troubleshooting tips

## 🏗️ Architecture

### The Four Modules

1. **Sentinel** 👁️ - Data Collection
   - Fetches real-time market data from Alpaca
   - Monitors multiple symbols (SPY, QQQ, AAPL, etc.)
   - Updates every 1-5 minutes

2. **Oracle** 🔮 - Analysis & Signal Generation
   - Technical indicators: RSI, MACD, EMA, ATR
   - Confluence scoring (0-100)
   - Generates CALL/PUT signals

3. **Executor** ⚡ - Order Management
   - Places simulated orders
   - Tracks positions
   - Manages fills and exits

4. **Warden** 🛡️ - Risk Management
   - Stop-loss enforcement
   - Take-profit targets
   - Circuit breakers
   - Portfolio risk monitoring

### Event-Driven Design

All modules communicate via an event bus, ensuring:
- Real-time responsiveness
- Loose coupling
- Easy debugging
- Scalability

## 🎮 Features

### Dashboard
- Real-time system status (all modules)
- Live market data with price updates
- Signal feed with confluence scores
- Position monitoring with P&L
- Risk metrics and alerts

### Auto-Trading
- Fully automated signal execution
- Configurable thresholds
- Automatic profit-taking & stop-loss
- Trailing stops to lock in gains
- Position limits and daily trade caps

### Risk Controls
- Per-trade stop-loss
- Portfolio-wide risk limits
- Circuit breakers for crashes
- Drawdown protection

## ⚙️ Configuration

Edit auto-trade settings in the dashboard:

```typescript
{
  minConfluenceScore: 60,      // Only trade high-quality signals
  minStrength: 'moderate',     // Signal strength threshold
  maxDailyTrades: 10,          // Limit overtrading
  maxConcurrentPositions: 5,   // Diversification
  takeProfitPercent: 10,       // Close at +10% gain
  stopLossPercent: 8,          // Close at -8% loss
  trailingStopPercent: 4       // Lock in profits
}
```

## 📊 Technical Indicators

- **RSI (Relative Strength Index)**: Identifies overbought/oversold conditions
- **MACD (Moving Average Convergence Divergence)**: Trend following momentum
- **EMA (Exponential Moving Average)**: Smoothed price trends
- **ATR (Average True Range)**: Volatility measurement
- **Confluence Scoring**: Combines all indicators for signal quality

## 🛡️ Paper Trading vs Real Trading

| Feature | Paper Trading | Real Trading |
|---------|---------------|--------------|
| Market Data | ✅ Real | ✅ Real |
| Order Execution | ✅ Simulated | ❌ Real money |
| Fills | ✅ Instant | ❌ May slip |
| Risk | ✅ Zero | ❌ Capital at risk |
| Starting Balance | $100,000 virtual | Your actual funds |

**⚠️ Important**: Test for 30+ days in paper trading before considering real money.

## 📈 Usage Example

1. **Start System**: Click "Start System" in dashboard
2. **Watch Signals**: Monitor the signals tab for opportunities
3. **Enable Auto-Trade**: Configure settings and toggle on
4. **Monitor Positions**: Watch trades execute and positions update
5. **Review Performance**: Check win rate, P&L, risk metrics

## 🚢 Deployment

### Netlify (Recommended)
```bash
# Push to GitHub
git push origin main

# Connect repo to Netlify
# Add environment variables in Netlify dashboard:
# - ALPACA_API_KEY
# - ALPACA_SECRET_KEY
```

The serverless functions will proxy Alpaca API calls securely.

### Local Development
```bash
npm run dev
```

### iOS App (Capacitor)
```bash
npm run ios:build
npm run ios:open
```

## 📁 Project Structure

```
Claude/
├── src/
│   ├── components/
│   │   └── trading/
│   │       └── TradingDashboard.tsx    # Main UI
│   ├── trading/
│   │   ├── AutoFlipper.ts              # Orchestrator
│   │   ├── sentinel/
│   │   │   ├── Sentinel.ts             # Data ingestion
│   │   │   └── AlpacaProvider.ts       # API integration
│   │   ├── oracle/
│   │   │   └── Oracle.ts               # Signal generation
│   │   ├── executor/
│   │   │   └── Executor.ts             # Order management
│   │   └── warden/
│   │       └── Warden.ts               # Risk management
│   └── netlify/
│       └── functions/
│           └── alpaca.js               # API proxy
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Sync iOS
npm run ios:build
```

## 🐛 Troubleshooting

### No Market Data
- Verify API keys in `.env`
- Check if market is open (Mon-Fri, 9:30 AM - 4:00 PM ET)
- Check Alpaca status page

### No Signals
- Lower confluence score threshold
- Market may be stable (low volatility)
- Verify Oracle module is running

### API Errors
- Check rate limits (200 req/min)
- Regenerate API keys
- Ensure using paper trading keys

## 📚 Learn More

- [Complete Setup Guide](./SETUP.md)
- [Alpaca API Documentation](https://alpaca.markets/docs/)
- [Paper Trading Dashboard](https://app.alpaca.markets/paper/dashboard/overview)

## ⚠️ Disclaimer

This is experimental software for educational purposes. Paper trading with simulated money only. Never use real money until you fully understand the system and have tested extensively. Trading involves significant risk of loss.

## 🔒 Security

- Never commit `.env` files
- Use paper trading keys only
- Keep API keys private
- Review all trades before enabling auto-trade

## 📝 License

Private use only.

---

**Ready to start?** → [Read the Setup Guide](./SETUP.md) 🚀
