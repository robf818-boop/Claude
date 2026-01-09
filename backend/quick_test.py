"""Quick test of Alpaca connection."""
import os
import sys

# Set environment variables
os.environ['ALPACA_API_KEY'] = 'PKMYFD6NW6XXYKWOWSH2'
os.environ['ALPACA_API_SECRET'] = 'GzuVsztfr3hzubcXtuWubUAhJSiVPaq8jGjEBsqiftZp'

try:
    from alpaca.trading.client import TradingClient

    print("=" * 60)
    print("🚀 Testing Alpaca Connection...")
    print("=" * 60)

    # Initialize client
    client = TradingClient(
        api_key=os.environ['ALPACA_API_KEY'],
        secret_key=os.environ['ALPACA_API_SECRET'],
        paper=True
    )

    # Get account info
    account = client.get_account()

    print(f"\n✅ Connected Successfully!")
    print(f"\n📊 Account Information:")
    print(f"   Equity: ${float(account.equity):,.2f}")
    print(f"   Cash: ${float(account.cash):,.2f}")
    print(f"   Buying Power: ${float(account.buying_power):,.2f}")
    print(f"   Portfolio Value: ${float(account.portfolio_value):,.2f}")

    # Get positions
    positions = client.get_all_positions()
    print(f"\n📈 Open Positions: {len(positions)}")

    if positions:
        for pos in positions:
            print(f"\n   {pos.symbol}:")
            print(f"      Qty: {pos.qty}")
            print(f"      Market Value: ${float(pos.market_value):,.2f}")
            print(f"      P&L: ${float(pos.unrealized_pl):,.2f} ({float(pos.unrealized_plpc)*100:+.2f}%)")
    else:
        print("   No open positions")

    print(f"\n{'=' * 60}")
    print("✅ Your Alpaca account is ready for trading!")
    print(f"{'=' * 60}\n")

except ImportError as e:
    print(f"\n❌ Missing required library: {e}")
    print("\nInstall it with:")
    print("   pip install alpaca-py")
    sys.exit(1)

except Exception as e:
    print(f"\n❌ Connection failed: {e}")
    print("\nCheck your API credentials!")
    sys.exit(1)
