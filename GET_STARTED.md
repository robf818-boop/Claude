# 🎯 GET STARTED NOW - Step by Step

**Goal**: Get your trading system running with real market data and $100k paper money in the next 15 minutes.

---

## Step 1: Get Your Free Alpaca Account (5 minutes)

1. Open your browser and go to: **https://alpaca.markets/**

2. Click "Sign Up" (top right)

3. Create your account:
   - Email
   - Password  
   - Accept terms
   - Verify email

4. Once logged in, you'll see the dashboard

5. Look for "Paper Trading" in the navigation
   - You should see **$100,000.00** in your paper account

6. Click "API Keys" in the left sidebar

7. Click "Generate New Key"
   - **Important**: Make sure you're in "Paper Trading" mode
   - Give it a name like "AutoFlipper"

8. **COPY BOTH KEYS** (you'll need these in a minute):
   ```
   API Key ID: PK...
   Secret Key: ...
   ```

---

## Step 2: Set Up Your Code (3 minutes)

1. Open Terminal and navigate to your project:
   ```bash
   cd /Users/robertfranklin/Documents/GitHub/Claude
   ```

2. Install dependencies (if you haven't already):
   ```bash
   npm install
   ```

3. Create your environment file:
   ```bash
   cp .env.example .env
   ```

4. Open `.env` in your editor:
   ```bash
   open .env
   ```
   
   Or use VS Code:
   ```bash
   code .env
   ```

5. Replace the placeholders with your REAL keys:
   ```env
   ALPACA_API_KEY=PK... (paste your API Key ID here)
   ALPACA_SECRET_KEY=... (paste your Secret Key here)
   ```

6. **SAVE THE FILE**

---

## Step 3: Verify Setup (1 minute)

Run the verification script:
```bash
./verify-setup.sh
```

You should see:
```
✅ Node.js installed
✅ npm installed
✅ .env file exists
✅ API keys are configured
✅ Dependencies installed
🎉 All checks passed!
```

If you see any ❌ or ⚠️, fix those issues first.

---

## Step 4: Start the System (1 minute)

1. Start the development server:
   ```bash
   npm run dev
   ```

2. You should see:
   ```
   VITE v5.x.x  ready in XXX ms

   ➜  Local:   http://localhost:5173/
   ```

3. Open your browser to: **http://localhost:5173**

---

## Step 5: Activate Trading (5 minutes)

1. **Check Market Status** (top right corner):
   - 🟢 Green = Market is open (trade now!)
   - 🔴 Red = Market is closed (come back Mon-Fri 9:30 AM - 4:00 PM ET)

2. **Verify Account Info** (should show):
   - Balance: $100,000.00
   - Buying Power: $100,000.00

3. **Start the System**:
   - Click the big "Start System" button
   - Wait for all 4 modules to show "running":
     - ✅ Sentinel: running
     - ✅ Oracle: running
     - ✅ Executor: running
     - ✅ Warden: running

4. **Watch for Signals**:
   - Click "Signals" tab
   - Signals will appear within 1-5 minutes
   - Each signal shows:
     - Symbol (SPY, QQQ, AAPL, etc.)
     - Direction (CALL or PUT)
     - Confluence Score (0-100)
     - Strength (weak/moderate/strong)

5. **(Optional) Enable Auto-Trading**:
   - Click the robot icon (🤖)
   - Configure settings:
     - Min Confluence: 60
     - Min Strength: moderate
     - Max Daily Trades: 5
     - Take Profit: 10%
     - Stop Loss: 8%
   - Toggle "Enable Auto-Trade"
   - System will now trade automatically!

---

## 🎉 You're Live!

Your system is now:
- ✅ Fetching real market data from Alpaca
- ✅ Analyzing price movements
- ✅ Generating trading signals
- ✅ (If enabled) Executing simulated trades
- ✅ Managing risk automatically

---

## 📊 What to Watch

### Signals Tab
- New buy/sell opportunities
- Confluence scores (higher = better)
- Technical indicator values

### Positions Tab
- Open trades
- Current profit/loss
- Time in trade

### Risk Tab
- Overall portfolio risk
- Win rate %
- Average P&L
- Circuit breaker status

---

## ⏰ Market Hours

The US stock market is open:
- **Monday - Friday**
- **9:30 AM - 4:00 PM** Eastern Time

Outside these hours, you won't get new data or signals.

---

## 🚨 If Something Goes Wrong

### No Market Data
1. Check if market is open
2. Verify API keys in `.env` are correct
3. Check browser console (F12) for errors

### No Signals
1. Lower confluence score to 40-50
2. Change min strength to "weak"
3. Market might be too stable (low volatility)

### System Won't Start
1. Stop the dev server (Ctrl+C)
2. Run `npm install` again
3. Run `npm run dev` again
4. Check console for errors

---

## 📈 First Week Strategy

**DON'T enable auto-trade yet!** Just watch:

1. **Day 1-3**: Watch signals come in
   - Which ones look good?
   - What confluence scores work?
   - What time of day is best?

2. **Day 4-7**: Note which signals would have been profitable
   - Paper trade mentally
   - Learn the patterns

3. **Week 2**: Enable auto-trade with VERY conservative settings
   - Min confluence: 70+
   - Min strength: strong
   - Max trades: 3 per day

4. **Week 3+**: Gradually optimize based on results

---

## 💡 Pro Tips

1. **Start During Market Hours**: More action = better learning
2. **Focus on 1 Symbol**: Watch SPY first, learn it well
3. **Keep a Journal**: Note good/bad signals and why
4. **Be Patient**: Good signals take time
5. **Paper Money is Free**: Experiment without fear!

---

## 🎓 Learn More

- [QUICKSTART.md](./QUICKSTART.md) - Checklist format
- [SETUP.md](./SETUP.md) - Detailed guide with troubleshooting
- [README.md](./README.md) - Full system documentation

---

## ✅ Checklist

Before you close this document, make sure you've:

- [ ] Created Alpaca account
- [ ] Got API keys (paper trading)
- [ ] Added keys to `.env` file
- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Opened http://localhost:5173
- [ ] Started the system
- [ ] See all modules running
- [ ] Watching for signals

---

**You're all set!** 🚀

The system is now running with real market data and paper trading. No real money at risk. Time to learn and test your strategies!

**Questions?** Check [SETUP.md](./SETUP.md) for detailed troubleshooting.
