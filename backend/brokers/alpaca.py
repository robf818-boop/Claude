"""Alpaca broker implementation."""
import logging
from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import (
    MarketOrderRequest,
    LimitOrderRequest,
    StopOrderRequest,
    GetOrdersRequest
)
from alpaca.trading.enums import OrderSide, TimeInForce, OrderType, QueryOrderStatus
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame

from .base import BrokerInterface, Position, Order, Account

logger = logging.getLogger(__name__)


class AlpacaBroker(BrokerInterface):
    """Alpaca broker implementation for paper and live trading."""

    def __init__(self, api_key: str, api_secret: str, paper: bool = True):
        """
        Initialize Alpaca broker.

        Args:
            api_key: Alpaca API key
            api_secret: Alpaca API secret
            paper: Use paper trading (default: True)
        """
        self.api_key = api_key
        self.api_secret = api_secret
        self.paper = paper

        # Initialize trading client
        self.trading_client = TradingClient(
            api_key=api_key,
            secret_key=api_secret,
            paper=paper
        )

        # Initialize data client
        self.data_client = StockHistoricalDataClient(
            api_key=api_key,
            secret_key=api_secret
        )

        logger.info(f"Alpaca broker initialized (paper={paper})")

    async def get_account(self) -> Account:
        """Get account information."""
        try:
            acc = self.trading_client.get_account()
            return Account(
                equity=Decimal(str(acc.equity)),
                cash=Decimal(str(acc.cash)),
                buying_power=Decimal(str(acc.buying_power)),
                portfolio_value=Decimal(str(acc.portfolio_value)),
                long_market_value=Decimal(str(acc.long_market_value)),
                short_market_value=Decimal(str(acc.short_market_value)),
                initial_margin=Decimal(str(acc.initial_margin)),
                maintenance_margin=Decimal(str(acc.maintenance_margin)),
                last_equity=Decimal(str(acc.last_equity)),
                multiplier=str(acc.multiplier),
                daytrade_count=int(acc.daytrade_count),
                daytrading_buying_power=Decimal(str(acc.daytrading_buying_power))
            )
        except Exception as e:
            logger.error(f"Error getting account: {e}")
            raise

    async def get_positions(self) -> List[Position]:
        """Get all open positions."""
        try:
            positions = self.trading_client.get_all_positions()
            return [
                Position(
                    symbol=pos.symbol,
                    qty=Decimal(str(pos.qty)),
                    side=pos.side,
                    entry_price=Decimal(str(pos.avg_entry_price)),
                    current_price=Decimal(str(pos.current_price)),
                    market_value=Decimal(str(pos.market_value)),
                    unrealized_pl=Decimal(str(pos.unrealized_pl)),
                    unrealized_plpc=Decimal(str(pos.unrealized_plpc)),
                    cost_basis=Decimal(str(pos.cost_basis))
                )
                for pos in positions
            ]
        except Exception as e:
            logger.error(f"Error getting positions: {e}")
            raise

    async def get_position(self, symbol: str) -> Optional[Position]:
        """Get position for specific symbol."""
        try:
            pos = self.trading_client.get_open_position(symbol)
            return Position(
                symbol=pos.symbol,
                qty=Decimal(str(pos.qty)),
                side=pos.side,
                entry_price=Decimal(str(pos.avg_entry_price)),
                current_price=Decimal(str(pos.current_price)),
                market_value=Decimal(str(pos.market_value)),
                unrealized_pl=Decimal(str(pos.unrealized_pl)),
                unrealized_plpc=Decimal(str(pos.unrealized_plpc)),
                cost_basis=Decimal(str(pos.cost_basis))
            )
        except Exception as e:
            if "position does not exist" in str(e).lower():
                return None
            logger.error(f"Error getting position for {symbol}: {e}")
            raise

    async def place_order(
        self,
        symbol: str,
        qty: Decimal,
        side: str,
        order_type: str = 'market',
        time_in_force: str = 'day',
        limit_price: Optional[Decimal] = None,
        stop_price: Optional[Decimal] = None
    ) -> Order:
        """Place a trading order."""
        try:
            # Convert side to Alpaca enum
            order_side = OrderSide.BUY if side.lower() == 'buy' else OrderSide.SELL

            # Convert time in force
            tif = TimeInForce.DAY if time_in_force.lower() == 'day' else TimeInForce.GTC

            # Create order request based on type
            if order_type.lower() == 'market':
                order_request = MarketOrderRequest(
                    symbol=symbol,
                    qty=float(qty),
                    side=order_side,
                    time_in_force=tif
                )
            elif order_type.lower() == 'limit':
                order_request = LimitOrderRequest(
                    symbol=symbol,
                    qty=float(qty),
                    side=order_side,
                    time_in_force=tif,
                    limit_price=float(limit_price)
                )
            elif order_type.lower() == 'stop':
                order_request = StopOrderRequest(
                    symbol=symbol,
                    qty=float(qty),
                    side=order_side,
                    time_in_force=tif,
                    stop_price=float(stop_price)
                )
            else:
                raise ValueError(f"Unsupported order type: {order_type}")

            # Submit order
            order = self.trading_client.submit_order(order_request)

            logger.info(f"Order placed: {order.id} - {side} {qty} {symbol} @ {order_type}")

            return Order(
                id=str(order.id),
                symbol=order.symbol,
                qty=Decimal(str(order.qty)),
                side=order.side.value,
                order_type=order.type.value,
                status=order.status.value,
                filled_qty=Decimal(str(order.filled_qty or 0)),
                filled_avg_price=Decimal(str(order.filled_avg_price)) if order.filled_avg_price else None,
                created_at=order.created_at,
                updated_at=order.updated_at
            )
        except Exception as e:
            logger.error(f"Error placing order: {e}")
            raise

    async def cancel_order(self, order_id: str) -> bool:
        """Cancel an order."""
        try:
            self.trading_client.cancel_order_by_id(order_id)
            logger.info(f"Order cancelled: {order_id}")
            return True
        except Exception as e:
            logger.error(f"Error cancelling order {order_id}: {e}")
            return False

    async def get_orders(self, status: str = 'open') -> List[Order]:
        """Get orders by status."""
        try:
            # Convert status string to enum
            if status.lower() == 'open':
                query_status = QueryOrderStatus.OPEN
            elif status.lower() == 'closed':
                query_status = QueryOrderStatus.CLOSED
            elif status.lower() == 'all':
                query_status = QueryOrderStatus.ALL
            else:
                query_status = QueryOrderStatus.OPEN

            request = GetOrdersRequest(status=query_status)
            orders = self.trading_client.get_orders(filter=request)

            return [
                Order(
                    id=str(order.id),
                    symbol=order.symbol,
                    qty=Decimal(str(order.qty)),
                    side=order.side.value,
                    order_type=order.type.value,
                    status=order.status.value,
                    filled_qty=Decimal(str(order.filled_qty or 0)),
                    filled_avg_price=Decimal(str(order.filled_avg_price)) if order.filled_avg_price else None,
                    created_at=order.created_at,
                    updated_at=order.updated_at
                )
                for order in orders
            ]
        except Exception as e:
            logger.error(f"Error getting orders: {e}")
            raise

    async def close_position(self, symbol: str) -> bool:
        """Close a position."""
        try:
            self.trading_client.close_position(symbol)
            logger.info(f"Position closed: {symbol}")
            return True
        except Exception as e:
            logger.error(f"Error closing position {symbol}: {e}")
            return False

    async def close_all_positions(self) -> bool:
        """Close all open positions."""
        try:
            self.trading_client.close_all_positions(cancel_orders=True)
            logger.info("All positions closed")
            return True
        except Exception as e:
            logger.error(f"Error closing all positions: {e}")
            return False

    async def get_bars(
        self,
        symbol: str,
        timeframe: str,
        start: datetime,
        end: Optional[datetime] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """Get historical bar data."""
        try:
            # Convert timeframe string to TimeFrame enum
            tf_map = {
                '1Min': TimeFrame.Minute,
                '5Min': TimeFrame(5, 'Min'),
                '15Min': TimeFrame(15, 'Min'),
                '1Hour': TimeFrame.Hour,
                '1Day': TimeFrame.Day
            }
            tf = tf_map.get(timeframe, TimeFrame.Minute)

            request = StockBarsRequest(
                symbol_or_symbols=symbol,
                timeframe=tf,
                start=start,
                end=end,
                limit=limit
            )

            bars = self.data_client.get_stock_bars(request)

            result = []
            for bar in bars[symbol]:
                result.append({
                    'timestamp': bar.timestamp,
                    'open': float(bar.open),
                    'high': float(bar.high),
                    'low': float(bar.low),
                    'close': float(bar.close),
                    'volume': int(bar.volume)
                })

            return result
        except Exception as e:
            logger.error(f"Error getting bars for {symbol}: {e}")
            raise

    async def get_quote(self, symbol: str) -> Dict[str, Any]:
        """Get current quote for symbol."""
        try:
            # For quotes, we'll use the latest bar as a proxy
            # Alpaca's quote API is separate and more complex
            bars = await self.get_bars(symbol, '1Min', datetime.now(), limit=1)
            if bars:
                latest = bars[-1]
                return {
                    'symbol': symbol,
                    'price': latest['close'],
                    'timestamp': latest['timestamp']
                }
            return {}
        except Exception as e:
            logger.error(f"Error getting quote for {symbol}: {e}")
            raise
