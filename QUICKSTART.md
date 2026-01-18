# 🚀 Quick Start Checklist

Follow these steps to get AutoFlipper running with real market data and paper trading:

## ☑️ Setup Checklist

### 1. Get Alpaca Account
- [ ] Sign up at https://alpaca.markets/
- [ ] Verify your email
- [ ] Navigate to Paper Trading Dashboard
- [ ] Generate API keys (Paper Trading mode)
- [ ] Save both API Key ID and Secret Key

### 2. Local Setup
- [ ] Clone the repository
- [ ] Run `npm install`
- [ ] Create `.env` file from `.env.example`
- [ ] Add your Alpaca API keys to `.env`
- [ ] Run `npm run dev`
- [ ] Open http://localhost:5173

### 3. First Run
- [ ] Verify market status indicator shows correct state
- [ ] Click "Start System" button
- [ ] Check all 4 modules show "running" status
- [ ] Watch for signals in the Signals tab
- [ ] Verify account balance shows $100,000

### 4. Configure Auto-Trading (Optional)
- [ ] Click robot icon (🤖) for settings
- [ ] Set min confluence score (start with 60)
- [ ] Set min strength (start with "moderate")
- [ ] Set max daily trades (start with 5-10)
- [ ] Configure take profit % (start with 10%)
- [ ] Configure stop loss % (start with 8%)
- [ ] Enable auto-trade toggle

### 5. Monitor & Test
- [ ] Watch signals generate (may take a few minutes)
- [ ] If auto-trade enabled, watch positions open
- [ ] Monitor P&L in Positions tab
- [ ] Check risk metrics in Risk tab
- [ ] Let it run for at least 1 week

## ⚠️ Important Notes

- **Market Hours**: Trading only happens Mon-Fri, 9:30 AM - 4:00 PM ET
- **Paper Money**: You're using $100,000 virtual money - zero risk
- **No Real Trades**: All orders are simulated
- **Be Patient**: Good signals don't come every minute
- **Start Conservative**: Use moderate/strong signals first

## 🐛 Common Issues

### "Cannot fetch market data"
**Fix**: Check that your API keys are correct in `.env`

### "Market is closed"
**Fix**: Wait until Mon-Fri, 9:30 AM - 4:00 PM Eastern Time

### No signals appearing
**Fix**: 
- Lower confluence score to 40-50
- Change min strength to "weak"
- Verify market is open and volatile

### System won't start
**Fix**: 
- Check browser console for errors (F12)
- Verify all dependencies installed (`npm install`)
- Check Alpaca account is active

## 📈 Next Steps

1. **Week 1**: Just watch signals, don't enable auto-trade
2. **Week 2**: Enable auto-trade with conservative settings
3. **Week 3+**: Fine-tune based on results
4. **Month 2**: Consider more aggressive settings if profitable

## 📚 Resources

- [Full Setup Guide](./SETUP.md) - Complete instructions
- [README](./README.md) - System overview
- [Alpaca Docs](https://alpaca.markets/docs/) - API reference

## ✅ You're Ready!

Once all boxes are checked above, you're ready to test your trading system!

**Remember**: This is practice. Learn the system before considering real money.
