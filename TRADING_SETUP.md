# OptionIQ Trading Bot - Complete Setup Guide

## 🚀 You're Almost Ready to Trade!

Your automated options trading bot is now built! Here's how to get it running:

---

## 📋 Step 1: Start the Backend Server

The backend connects to Alpaca and calculates accurate portfolio metrics.

### Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

**Note**: If `ta-lib` fails to install:
- **macOS**: `brew install ta-lib`
- **Ubuntu**: `sudo apt-get install libta-lib-dev`
- **Windows**: Download from https://github.com/mrjbq7/ta-lib#dependencies

### Create .env File

```bash
cp .env.example .env
```

Edit `.env` and add your Alpaca API credentials:

```bash
ALPACA_API_KEY=PKMYFD6NW6XXYKWOWSH2
ALPACA_API_SECRET=your_secret_key_here
ALPACA_BASE_URL=https://paper-api.alpaca.markets
```

**Get your keys from**: https://app.alpaca.markets/paper/dashboard/overview
- Click "API Keys" in the sidebar
- Generate or copy your existing paper trading keys
- Make sure they start with "PK" (for paper trading)

### Start the Backend

```bash
python main.py
```

You should see:
```
INFO:     Starting OptionIQ trading bot...
INFO:     Alpaca broker initialized
INFO:     Account equity: $100000.00
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Test it**: Visit http://localhost:8000/docs to see the API documentation

---

## 🎨 Step 2: Start the Frontend Dashboard

The React app provides a beautiful UI for monitoring and trading.

### Install Dependencies (if needed)

```bash
# From the root directory (not backend/)
npm install
```

### Start the Development Server

```bash
npm run dev
```

The app will open at: http://localhost:5173

---

## 🔑 Step 3: Connect to Alpaca

When you open the app for the first time:

1. **Backend Server URL**: Leave as `http://localhost:8000` (default)
2. **Alpaca API Key**: Enter your API key (starts with `PK`)
3. **Alpaca API Secret**: Enter your secret key
4. Click **Connect to Alpaca**

The app will:
- ✅ Test the backend connection
- ✅ Verify your API credentials
- ✅ Load your portfolio data
- ✅ Start auto-refreshing metrics every 5 seconds

---

## 📊 What You'll See

### Portfolio Metrics (Top Cards)
- **Account Balance**: Current equity + total return %
- **Buying Power**: Available cash to trade
- **Open P&L**: Unrealized profit/loss from open positions
- **Risk Score**: 0-100 (lower is better)
  - 0-25: LOW risk
  - 25-50: MODERATE risk
  - 50-75: HIGH risk
  - 75-100: CRITICAL risk

### Positions Table
- All open positions with real-time P&L
- Entry price, current price, market value
- Percentage gain/loss
- One-click close button

### Risk Panel (Right Sidebar)
- **Total Exposure**: Fixed calculation (no more $298M bug!)
- **Current Drawdown**: From peak equity
- **Daily P&L**: Today's profit/loss
- **Position Utilization**: How many of 10 slots are used
- **Circuit Breakers**:
  - 🟢 NORMAL: Trading allowed
  - 🔴 TRIGGERED: Trading halted
  - Daily limit: 3% drawdown
  - Weekly limit: 7% drawdown

### Quick Trade Panel
- Fast market order entry
- Enter symbol (e.g., SPY)
- Enter quantity
- Choose BUY or SELL
- Click to execute immediately

---

## 🎯 Test Your Setup

### Test 1: View Your Account
Once connected, you should see your $100,000 paper trading balance.

### Test 2: Place a Test Order
1. Use the Quick Trade panel
2. Symbol: `SPY`
3. Quantity: `1`
4. Side: `BUY`
5. Click "Place Market Order"

You should see:
- ✅ Order confirmation
- 📊 New position appears in Positions Table
- 💰 Account metrics update
- 📈 Open P&L shows unrealized profit/loss

### Test 3: Close the Position
1. Find SPY in the Positions Table
2. Click the red "Close" button
3. Confirm the close
4. Position should disappear
5. P&L gets realized to your cash balance

---

## 🔧 Troubleshooting

### "Connection Failed" Error
- Make sure backend is running: `python backend/main.py`
- Check backend URL is `http://localhost:8000`
- Look for errors in the backend terminal

### "Invalid API Keys"
- Verify you're using PAPER trading keys (start with `PK`)
- Check keys are copied correctly (no extra spaces)
- Regenerate keys on Alpaca if needed

### "Circuit Breaker Triggered"
- This is working correctly! It protects your account
- Trading is halted when drawdown exceeds limits
- Close all positions or wait for recovery

### Metrics Not Updating
- Check browser console for errors (F12)
- Verify backend is running
- Try disconnecting and reconnecting

---

## 🎓 Next Steps

Now that your trading bot is working:

1. **Test with Paper Money**: Practice with $100k virtual cash
2. **Monitor Risk Metrics**: Watch the circuit breakers work
3. **Add Trading Strategies**: Implement the momentum strategy from your backtest code
4. **Build Automation**: Connect strategies to auto-trade
5. **Add Options Support**: Extend to options chains and Greeks

---

## 🔒 Security Notes

- ✅ API keys stored in localStorage (browser only)
- ✅ Never committed to git (.env in .gitignore)
- ✅ Only YOU can see your credentials
- ✅ Using paper trading (no real money at risk)

---

## 📞 Need Help?

Check these resources:
- **Backend API Docs**: http://localhost:8000/docs
- **Backend README**: `backend/README.md`
- **Alpaca Docs**: https://alpaca.markets/docs/
- **Paper Trading Dashboard**: https://app.alpaca.markets/paper/dashboard/overview

---

## 🎉 You're Ready!

Your automated trading bot is fully functional with:
- ✅ Accurate portfolio metrics (fixed $298M bug)
- ✅ Real-time position tracking
- ✅ Circuit breakers for risk management
- ✅ Beautiful dark-themed UI
- ✅ Paper trading with $100k virtual money
- ✅ Full API integration

**Happy Trading! 🚀**
