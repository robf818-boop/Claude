# OptionIQ Trading Bot - Backend

Automated options trading system with real-time portfolio tracking and risk management.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

**Note**: `ta-lib` requires system libraries. Install them first:

**macOS**:
```bash
brew install ta-lib
```

**Ubuntu/Debian**:
```bash
sudo apt-get install libta-lib-dev
```

**Windows**: Download from https://github.com/mrjbq7/ta-lib#dependencies

### 2. Configure API Keys

Copy the example environment file and add your Alpaca API credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your keys:
```bash
ALPACA_API_KEY=your_actual_api_key_here
ALPACA_API_SECRET=your_actual_secret_key_here
```

Get your keys from: https://app.alpaca.markets/paper/dashboard/overview

### 3. Run the Server

```bash
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: http://localhost:8000

### 4. Test the API

Visit http://localhost:8000/docs for interactive API documentation (Swagger UI).

Quick test:
```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/portfolio/metrics
```

## API Endpoints

### Account & Portfolio
- `GET /api/account` - Get account information
- `GET /api/portfolio/metrics` - Get comprehensive portfolio metrics
- `GET /api/portfolio/positions` - Get all open positions
- `GET /api/portfolio/circuit-breakers` - Check circuit breaker status

### Trading
- `POST /api/orders` - Place a new order
- `GET /api/orders?status=open` - Get orders
- `DELETE /api/orders/{order_id}` - Cancel an order
- `POST /api/positions/{symbol}/close` - Close a position
- `POST /api/positions/close-all` - Emergency close all positions

### WebSocket
- `WS /ws/portfolio` - Real-time portfolio updates (every 2 seconds)

## Features

### ✅ Accurate Portfolio Metrics
- **Total Exposure**: Fixed calculation (sum of absolute position values)
- **Open P&L**: Real-time unrealized profit/loss
- **Buying Power**: Direct from broker API
- **Risk Score**: Dynamic calculation based on positions and drawdown

### ✅ Risk Management
- **Circuit Breakers**:
  - Daily drawdown limit: 3%
  - Weekly drawdown limit: 7%
  - Automatic trading halt when triggered
- **Position Sizing**: Configurable per-trade limits
- **Stop Loss & Take Profit**: Automated exits

### ✅ Real-Time Updates
- WebSocket streaming of portfolio metrics
- Live position tracking
- Instant order status updates

## Configuration

All settings are in `.env`:

```bash
# Trading risk parameters
MAX_POSITION_SIZE_PCT=0.10      # 10% of account per trade
STOP_LOSS_PCT=0.03              # 3% stop loss
TAKE_PROFIT_PCT=0.05            # 5% take profit
MAX_DAILY_DRAWDOWN_PCT=0.03     # 3% daily circuit breaker
MAX_WEEKLY_DRAWDOWN_PCT=0.07    # 7% weekly circuit breaker
MAX_OPEN_POSITIONS=10           # Max concurrent positions
```

## Testing

Run tests:
```bash
pytest
```

Test with paper trading (included in Alpaca paper account):
- $100,000 virtual money
- Real market data
- No real money at risk

## Architecture

```
backend/
├── main.py              # FastAPI server
├── config.py            # Configuration management
├── brokers/
│   ├── base.py         # Broker interface
│   └── alpaca.py       # Alpaca implementation
├── portfolio/
│   └── manager.py      # Portfolio metrics & risk management
├── strategies/         # Trading strategies (coming soon)
└── data/               # Market data handlers (coming soon)
```

## Troubleshooting

### Import errors
Make sure you're in the backend directory and dependencies are installed:
```bash
cd backend
pip install -r requirements.txt
```

### API key errors
- Verify your `.env` file exists and has correct keys
- Keys should be from paper trading account: https://app.alpaca.markets/paper/dashboard/overview
- Don't use quotes around the key values in `.env`

### Connection errors
- Check that Alpaca paper trading is accessible
- Verify you're not rate-limited (60 requests/minute for paper trading)

## Next Steps

1. ✅ Backend API working with accurate metrics
2. 🔄 Build React dashboard frontend
3. 🔄 Implement trading strategies
4. 🔄 Add backtesting framework
5. 🔄 Options-specific strategies
