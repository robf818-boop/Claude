# OptionsIQ Setup Guide

## ✅ Build Complete!

Your OptionsIQ app has been successfully built and synced to iOS. Xcode is now opening.

## 📱 Next Steps for TestFlight Upload

### 1. Configure Alpaca API Keys (REQUIRED)

Before testing, you need to add your Alpaca Paper Trading API keys:

1. Go to https://app.alpaca.markets/paper/dashboard/overview
2. Create a free account if you don't have one
3. Generate API keys (you'll get $100,000 virtual money)
4. Edit the `.env` file in the project root:
   ```
   ALPACA_API_KEY=your_actual_key_here
   ALPACA_SECRET_KEY=your_actual_secret_here
   ```

### 2. Deploy to Netlify (for API proxy)

The app uses Netlify Functions to proxy Alpaca API calls:

1. Push your code to GitHub
2. Connect to Netlify at https://app.netlify.com
3. Import your repository
4. Add environment variables in Netlify dashboard:
   - `ALPACA_API_KEY`
   - `ALPACA_SECRET_KEY`
5. Deploy!
6. Note your Netlify URL (e.g., `https://your-app.netlify.app`)

### 3. Update API Endpoint

In `src/trading/sentinel/AlpacaProvider.ts`, update the baseUrl:
```typescript
constructor() {
  this.baseUrl = 'https://your-app.netlify.app/.netlify/functions/alpaca';
}
```

Rebuild: `npm run build && npx cap sync ios`

### 4. Upload to TestFlight via Xcode

#### Archive the App:
1. In Xcode, select **Any iOS Device (arm64)** from the device menu
2. Go to **Product > Archive**
3. Wait for the archive to complete

#### Upload to App Store Connect:
1. When archive finishes, the Organizer window opens
2. Select your archive and click **Distribute App**
3. Choose **App Store Connect**
4. Click **Upload** (not Export)
5. Follow the prompts:
   - Automatically manage signing
   - Upload symbols
   - Upload bitcode (if prompted)
6. Click **Upload**

#### Process the Build:
1. Wait 5-10 minutes for processing in App Store Connect
2. Go to https://appstoreconnect.apple.com
3. Select your app
4. Go to **TestFlight** tab
5. The build will appear under **iOS Builds**

#### Add Testers:
1. Click **Add Testers** or create a Test Group
2. Add email addresses of testers
3. Enable the build for testing
4. Testers will receive an email with TestFlight invite

## 🔐 App Password

The app is protected with a password. Default password is: `08182008XAF!`

To change it, edit `src/components/AuthGate.tsx`:
```typescript
const PASSWORD_HASH = btoa('YourNewPassword');
```

## 🎯 What's Included

Your OptionsIQ AutoFlipper includes:

### ✅ Real Market Data (Alpaca Integration)
- Live stock prices, quotes, and candle data
- Real-time account information
- Position tracking
- Order execution (paper trading)

### ✅ Four Trading Modules
1. **Sentinel** - Data ingestion from Alpaca
2. **Oracle** - Technical analysis (RSI, MACD, EMA, Bollinger Bands, etc.)
3. **Executor** - Order management and execution
4. **Warden** - Risk monitoring and circuit breakers

### ✅ Auto-Trading Features
- Configurable auto-trade settings
- Min confluence score: 50
- Max daily trades: 20
- Max concurrent positions: 8
- Take profit: +10%
- Stop loss: -8%
- Trailing stop: 4%

### ✅ UI Dashboard
- Real-time system status
- Position monitoring
- Signal display
- Risk metrics
- Market data visualization
- Manual trade controls

## 🚀 Testing Strategy

### Phase 1: Paper Trading (Current)
- Start with Alpaca Paper Trading ($100k virtual)
- Test all features thoroughly
- Monitor auto-trading logic
- Verify risk controls
- Track performance over 1-2 weeks

### Phase 2: Real Money (When Ready)
To switch to real money trading:

1. Edit `netlify/functions/alpaca.js`:
   ```javascript
   // Change these URLs:
   const TRADING_URL = 'https://api.alpaca.markets';  // Remove 'paper-'
   const DATA_URL = 'https://data.alpaca.markets';
   ```

2. Get real Alpaca API keys from https://app.alpaca.markets
3. Update environment variables
4. Start with small position sizes
5. Monitor closely

## ⚠️ Important Notes

- **PAPER TRADING FIRST**: Never skip paper trading phase
- **Test Thoroughly**: Ensure all logic works as expected
- **Start Small**: When going live, use small position sizes
- **Monitor Constantly**: Watch the system during market hours
- **Risk Management**: The Warden module has circuit breakers but YOU are ultimately responsible
- **API Limits**: Alpaca has rate limits, be mindful
- **Market Hours**: System should only trade during market hours

## 📊 Default Symbols

The dashboard monitors: SPY, QQQ, AAPL, MSFT, NVDA, TSLA, AMD

Edit in `src/App.tsx` to change.

## 🔧 Common Issues

### Build Errors
- Clean build folder: `rm -rf dist`
- Reinstall: `rm -rf node_modules && npm install`
- Rebuild: `npm run build`

### API Not Working
- Check `.env` file exists and has correct keys
- Verify Netlify deployment is live
- Check Netlify function logs
- Ensure API endpoint is correct in AlpacaProvider.ts

### Xcode Issues
- Clean build folder in Xcode: Product > Clean Build Folder
- Delete DerivedData: `rm -rf ~/Library/Developer/Xcode/DerivedData`
- Try archiving again

## 📱 TestFlight Testing Tips

1. Install TestFlight app on your iPhone from App Store
2. Accept invite email on your phone
3. Open TestFlight and install OptionsIQ
4. Test all features:
   - Login
   - Market data display
   - Signal generation
   - Position monitoring
   - Auto-trade toggle
   - Manual trade execution
   - Settings changes

## 🎓 Learning Resources

- Alpaca Docs: https://alpaca.markets/docs
- TestFlight Guide: https://developer.apple.com/testflight/
- Technical Indicators: Research RSI, MACD, Bollinger Bands

## 💰 Going Live Checklist

Before using real money:

- [ ] Completed 2+ weeks of paper trading
- [ ] Verified all technical indicators work correctly
- [ ] Tested auto-trading extensively
- [ ] Confirmed risk controls activate properly
- [ ] Reviewed and understand all trading logic
- [ ] Set appropriate position sizes
- [ ] Have stop losses configured
- [ ] Understand tax implications
- [ ] Comfortable with potential losses
- [ ] Have emergency shutdown plan

---

**Good luck with your trading! Remember: Past performance doesn't guarantee future results. Trade responsibly!** 🚀📈
