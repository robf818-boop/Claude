"""Base broker interface for trading."""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime
from dataclasses import dataclass


@dataclass
class Position:
    """Represents a trading position."""
    symbol: str
    qty: Decimal
    side: str  # 'long' or 'short'
    entry_price: Decimal
    current_price: Decimal
    market_value: Decimal
    unrealized_pl: Decimal
    unrealized_plpc: Decimal
    cost_basis: Decimal


@dataclass
class Order:
    """Represents a trading order."""
    id: str
    symbol: str
    qty: Decimal
    side: str  # 'buy' or 'sell'
    order_type: str  # 'market', 'limit', etc.
    status: str
    filled_qty: Decimal
    filled_avg_price: Optional[Decimal]
    created_at: datetime
    updated_at: datetime


@dataclass
class Account:
    """Represents account information."""
    equity: Decimal
    cash: Decimal
    buying_power: Decimal
    portfolio_value: Decimal
    long_market_value: Decimal
    short_market_value: Decimal
    initial_margin: Decimal
    maintenance_margin: Decimal
    last_equity: Decimal
    multiplier: str
    daytrade_count: int
    daytrading_buying_power: Decimal


class BrokerInterface(ABC):
    """Abstract base class for broker implementations."""

    @abstractmethod
    async def get_account(self) -> Account:
        """Get account information."""
        pass

    @abstractmethod
    async def get_positions(self) -> List[Position]:
        """Get all open positions."""
        pass

    @abstractmethod
    async def get_position(self, symbol: str) -> Optional[Position]:
        """Get position for specific symbol."""
        pass

    @abstractmethod
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
        pass

    @abstractmethod
    async def cancel_order(self, order_id: str) -> bool:
        """Cancel an order."""
        pass

    @abstractmethod
    async def get_orders(self, status: str = 'open') -> List[Order]:
        """Get orders by status."""
        pass

    @abstractmethod
    async def close_position(self, symbol: str) -> bool:
        """Close a position."""
        pass

    @abstractmethod
    async def close_all_positions(self) -> bool:
        """Close all open positions."""
        pass

    @abstractmethod
    async def get_bars(
        self,
        symbol: str,
        timeframe: str,
        start: datetime,
        end: Optional[datetime] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """Get historical bar data."""
        pass

    @abstractmethod
    async def get_quote(self, symbol: str) -> Dict[str, Any]:
        """Get current quote for symbol."""
        pass
