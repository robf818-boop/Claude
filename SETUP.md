# AutoFlipper Trading System Setup Guide

## 🎯 Overview

This guide will help you get your AutoFlipper trading system running with **real market data** and **paper trading** (simulated money). You'll be testing strategies with actual stock prices but no real money at risk.

## 📋 Prerequisites

- Node.js installed (v18 or higher)
- An Alpaca Paper Trading account (free)
- Basic understanding of trading concepts

## 🚀 Step-by-Step Setup

### 1. Get Alpaca Paper Trading API Keys

1. Go to [Alpaca](https://alpaca.markets/) and create a free account
2. Navigate to your paper trading dashboard: https://app.alpaca.markets/paper/dashboard/overview
3. Click on "API Keys" in the left sidebar
4. Click "Generate New Key"
5. **Important**: Choose "Paper Trading" mode
6. Save both your:
   - API Key ID
   - Secret Key

**Note**: Paper trading gives you $100,000 virtual money to test with. All trades are simulated but use real market data.

### 2. Configure Environment Variables

#### For Local Development:

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your keys:

```env
ALPACA_API_KEY=your_actual_api_key_here
ALPACA_SECRET_KEY=your_actual_secret_key_here
```

#### For Netlify Deployment:

1. Go to your Netlify dashboard
2. Select your site
3. Go to "Site configuration" → "Environment variables"
4. Add both variables:
   - `ALPACA_API_KEY`
   - `ALPACA_SECRET_KEY`

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Locally

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### 5. Deploy to Netlify (Optional)

1. Push your code to GitHub
2. Connect your repo to Netlify
3. Add environment variables (see step 2)
4. Deploy!

## 🎮 Using the Trading Dashboard

### Initial Checks

1. **Market Status**: Check if the market is open (top right indicator)
   - Green = Market is open
   - Red = Market is closed
   - Markets are open Mon-Fri, 9:30 AM - 4:00 PM ET

2. **Account Info**: View your paper trading account balance
   - Starting balance: $100,000 virtual money
   - Buying power updates in real-time

### Starting the System

1. **Start All Modules**: Click "Start System" button
   - Sentinel: Fetches real market data
   - Oracle: Analyzes price action and generates signals
   - Executor: Manages orders (simulated)
   - Warden: Monitors risk limits

2. **Watch for Signals**: The system will analyze stocks and generate buy/sell signals
   - Signals appear in the "Signals" tab
   - Each signal shows:
     - Confluence score (0-100)
     - Direction (CALL or PUT)
     - Strength (weak/moderate/strong/extreme)
     - Technical indicators (RSI, EMA, MACD)

### Auto-Trading (Hands-Free Mode)

1. Click the robot icon (🤖) to open auto-trade settings
2. Configure your preferences:
   - **Min Confluence Score**: Lower = more trades (try 50-60)
   - **Min Strength**: Set to "weak" for more opportunities
   - **Max Daily Trades**: How many trades per day (20 is good)
   - **Max Concurrent Positions**: How many open at once (5-8)
   - **Auto Close**: Enable to automatically close positions
     - Take Profit %: Close at +X% gain (10% is conservative)
     - Stop Loss %: Close at -X% loss (8% protects capital)
     - Trailing Stop %: Lock in profits as price moves up

3. Toggle "Enable Auto-Trade" switch
4. System will now automatically:
   - Execute trades when signals meet your criteria
   - Close positions at take-profit or stop-loss
   - Monitor all positions continuously

### Monitoring Your Trades

- **Positions Tab**: View all open positions
  - Current P&L (profit/loss)
  - Entry price vs current price
  - Time held
  
- **Risk Tab**: Monitor overall risk metrics
  - Portfolio heat (risk exposure)
  - Win rate
  - Average P&L
  - Circuit breakers

## 📊 Understanding the System

### The Four Modules

1. **Sentinel** (Data Collection)
   - Fetches real-time price data from Alpaca
   - Polls every 1-5 minutes (configurable)
   - Monitors: SPY, QQQ, AAPL, and others

2. **Oracle** (Analysis)
   - Calculates technical indicators:
     - EMA (9, 21 period)
     - RSI (14 period)
     - MACD (12, 26, 9)
     - ATR (14 period)
   - Generates buy/sell signals
   - Scores signal quality (confluence)

3. **Executor** (Order Management)
   - Places simulated orders
   - Tracks positions
   - Handles fills and rejections

4. **Warden** (Risk Management)
   - Monitors portfolio risk
   - Enforces stop losses
   - Activates circuit breakers if needed

### Strategy Tuning

Start conservative and adjust based on results:

**Conservative Settings** (fewer trades, safer):
- Min Confluence: 70+
- Min Strength: "moderate" or "strong"
- Stop Loss: 5-8%
- Take Profit: 8-12%

**Aggressive Settings** (more trades, higher risk):
- Min Confluence: 40-50
- Min Strength: "weak"
- Stop Loss: 10-15%
- Take Profit: 15-25%

**Recommended Starting Point**:
- Min Confluence: 60
- Min Strength: "moderate"
- Stop Loss: 8%
- Take Profit: 10%
- Max Daily Trades: 10

## ⚠️ Important Notes

### Paper Trading Limitations

- **No Real Money**: All trades are simulated
- **No Real Fills**: Orders execute instantly (not realistic)
- **No Slippage**: You get exact prices (real trading has slippage)
- **Market Impact**: Your orders don't affect real prices

### Moving to Real Trading

**DO NOT** use real money until:
1. ✅ System runs stable for 30+ days
2. ✅ Win rate is consistently above 50%
3. ✅ You understand every signal the system generates
4. ✅ You've backtested thoroughly
5. ✅ You can afford to lose the money you're risking

### Market Hours

- **Pre-market**: 4:00 AM - 9:30 AM ET (limited data)
- **Regular Hours**: 9:30 AM - 4:00 PM ET (best data)
- **After-hours**: 4:00 PM - 8:00 PM ET (limited data)
- **Weekends**: Markets closed (no data)

## 🐛 Troubleshooting

### "Market data not available"
- Check if market is open
- Verify API keys are correct
- Check Alpaca account status

### "Unauthorized" errors
- API keys might be wrong
- Check if you're using paper trading keys (not live keys)
- Regenerate keys in Alpaca dashboard

### No signals generating
- Market might be too stable (low volatility)
- Lower your confluence score threshold
- Check that Sentinel is running
- Verify market is open

### System stops/crashes
- Check browser console for errors
- Restart the system
- Check API rate limits (Alpaca: 200 req/min)

## 📈 Next Steps

1. **Run for 1 week**: Watch signals, don't enable auto-trade yet
2. **Analyze Results**: Which signals were good? Which were bad?
3. **Tune Settings**: Adjust confluence, stop loss, take profit
4. **Enable Auto-Trade**: Start with max 5 positions, 5 trades/day
5. **Scale Gradually**: Increase limits only if profitable

## 📚 Additional Resources

- [Alpaca API Docs](https://alpaca.markets/docs/)
- [Paper Trading Dashboard](https://app.alpaca.markets/paper/dashboard/overview)
- [Options Trading Basics](https://www.investopedia.com/options-basics-tutorial-4583012)

## 🔒 Security

- Never commit `.env` file to Git
- Keep API keys secret
- Use paper trading keys only
- Don't share your keys with anyone

## 💡 Tips for Success

1. **Start Small**: Watch the system work before trusting it
2. **Keep Notes**: Document what works and what doesn't
3. **Be Patient**: Good signals don't come every minute
4. **Stay Educated**: Learn about the indicators being used
5. **Risk Management**: Never risk more than you can afford to lose

---

**Remember**: This is paper trading with fake money. Use it to learn and test. Real trading involves significant risk and requires deep understanding of markets.
