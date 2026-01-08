"""Test Alpaca API connection and verify credentials."""
import asyncio
import sys
from decimal import Decimal

try:
    from config import get_settings
    from brokers.alpaca import AlpacaBroker
    from portfolio.manager import PortfolioManager
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("\nMake sure you've installed dependencies:")
    print("  pip install -r requirements.txt")
    sys.exit(1)


async def test_connection():
    """Test Alpaca connection and display account info."""
    print("=" * 60)
    print("OptionIQ - Testing Alpaca Connection")
    print("=" * 60)

    # Load settings
    try:
        settings = get_settings()
        print(f"✅ Configuration loaded")
        print(f"   Base URL: {settings.alpaca_base_url}")
    except Exception as e:
        print(f"❌ Failed to load configuration: {e}")
        print("\nMake sure you have:")
        print("  1. Created .env file (copy from .env.example)")
        print("  2. Added your ALPACA_API_KEY and ALPACA_API_SECRET")
        return False

    # Initialize broker
    try:
        broker = AlpacaBroker(
            api_key=settings.alpaca_api_key,
            api_secret=settings.alpaca_api_secret,
            paper=True
        )
        print(f"✅ Broker initialized (Paper Trading)")
    except Exception as e:
        print(f"❌ Failed to initialize broker: {e}")
        return False

    # Get account info
    try:
        account = await broker.get_account()
        print(f"\n{'=' * 60}")
        print("📊 Account Information")
        print(f"{'=' * 60}")
        print(f"Equity:              ${float(account.equity):,.2f}")
        print(f"Cash:                ${float(account.cash):,.2f}")
        print(f"Buying Power:        ${float(account.buying_power):,.2f}")
        print(f"Portfolio Value:     ${float(account.portfolio_value):,.2f}")
        print(f"Long Market Value:   ${float(account.long_market_value):,.2f}")
        print(f"Short Market Value:  ${float(account.short_market_value):,.2f}")
        print(f"Multiplier:          {account.multiplier}")
        print(f"Daytrade Count:      {account.daytrade_count}")
    except Exception as e:
        print(f"❌ Failed to get account info: {e}")
        print("\nThis usually means:")
        print("  1. Invalid API keys")
        print("  2. API keys are for live trading (need paper trading keys)")
        print("  3. Network/firewall issue")
        return False

    # Get positions
    try:
        positions = await broker.get_positions()
        print(f"\n{'=' * 60}")
        print(f"📈 Open Positions: {len(positions)}")
        print(f"{'=' * 60}")
        if positions:
            for pos in positions:
                print(f"\n{pos.symbol}:")
                print(f"  Qty:           {float(pos.qty)}")
                print(f"  Side:          {pos.side}")
                print(f"  Entry Price:   ${float(pos.entry_price):,.2f}")
                print(f"  Current Price: ${float(pos.current_price):,.2f}")
                print(f"  Market Value:  ${float(pos.market_value):,.2f}")
                print(f"  Unrealized P&L: ${float(pos.unrealized_pl):,.2f} ({float(pos.unrealized_plpc)*100:+.2f}%)")
        else:
            print("No open positions")
    except Exception as e:
        print(f"⚠️  Warning: Could not fetch positions: {e}")

    # Test portfolio manager
    try:
        portfolio_manager = PortfolioManager(
            broker=broker,
            starting_capital=Decimal(str(settings.starting_capital))
        )
        metrics = await portfolio_manager.get_portfolio_metrics()

        print(f"\n{'=' * 60}")
        print("🎯 Portfolio Metrics")
        print(f"{'=' * 60}")
        print(f"Total Exposure:      ${metrics['total_exposure']:,.2f}")
        print(f"Open P&L:            ${metrics['open_pnl']:,.2f}")
        print(f"Daily P&L:           ${metrics['daily_pnl']:,.2f} ({metrics['daily_pnl_pct']:+.2f}%)")
        print(f"Total Return:        {metrics['total_return_pct']:+.2f}%")
        print(f"Current Drawdown:    {metrics['current_drawdown_pct']:.2f}%")
        print(f"Risk Score:          {metrics['risk_score']} ({metrics['risk_level']})")
        print(f"Open Positions:      {metrics['open_positions']}/{settings.max_open_positions}")
        print(f"Position Util:       {metrics['position_utilization_pct']:.1f}%")

        # Circuit breakers
        print(f"\n{'=' * 60}")
        print("🔒 Circuit Breakers")
        print(f"{'=' * 60}")
        print(f"Daily Drawdown:      {metrics['daily_drawdown_pct']:.2f}% (limit: 3.0%)")
        print(f"Daily Status:        {'🔴 TRIGGERED' if metrics['daily_circuit_breaker'] else '🟢 NORMAL'}")
        print(f"Weekly Drawdown:     {metrics['weekly_drawdown_pct']:.2f}% (limit: 7.0%)")
        print(f"Weekly Status:       {'🔴 TRIGGERED' if metrics['weekly_circuit_breaker'] else '🟢 NORMAL'}")

    except Exception as e:
        print(f"❌ Failed to calculate portfolio metrics: {e}")
        return False

    print(f"\n{'=' * 60}")
    print("✅ All tests passed! Your setup is working correctly.")
    print(f"{'=' * 60}")
    print("\nNext steps:")
    print("  1. Run the API server: python main.py")
    print("  2. Visit http://localhost:8000/docs")
    print("  3. Build the React dashboard frontend")
    print(f"{'=' * 60}\n")

    return True


if __name__ == "__main__":
    result = asyncio.run(test_connection())
    sys.exit(0 if result else 1)
