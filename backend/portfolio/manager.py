"""Portfolio manager for tracking positions and calculating metrics."""
import logging
from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime, timedelta
from collections import deque

from ..brokers.base import BrokerInterface, Position, Account

logger = logging.getLogger(__name__)


class PortfolioManager:
    """Manages portfolio positions and calculates risk metrics."""

    def __init__(self, broker: BrokerInterface, starting_capital: Decimal):
        """
        Initialize portfolio manager.

        Args:
            broker: Broker interface for getting positions/account info
            starting_capital: Starting account value
        """
        self.broker = broker
        self.starting_capital = starting_capital
        self.peak_equity = starting_capital
        self.daily_high_equity = starting_capital
        self.weekly_high_equity = starting_capital

        # Track daily P&L history
        self.daily_pnl_history: deque = deque(maxlen=30)  # Last 30 days
        self.last_reset_date = datetime.now().date()

    async def get_portfolio_metrics(self) -> Dict[str, Any]:
        """
        Calculate accurate portfolio metrics.

        Returns:
            Dictionary with all portfolio metrics
        """
        try:
            # Get account info from broker
            account = await self.broker.get_account()
            positions = await self.broker.get_positions()

            # Calculate total exposure (sum of absolute position values)
            total_exposure = sum(
                abs(float(pos.market_value)) for pos in positions
            )

            # Calculate current drawdown from peak
            current_equity = float(account.equity)
            self.peak_equity = max(self.peak_equity, current_equity)
            current_drawdown_pct = (
                (current_equity - self.peak_equity) / self.peak_equity * 100
            ) if self.peak_equity > 0 else 0.0

            # Daily P&L calculation
            daily_pnl = current_equity - float(account.last_equity)
            daily_pnl_pct = (
                daily_pnl / float(account.last_equity) * 100
            ) if account.last_equity > 0 else 0.0

            # Update daily tracking
            today = datetime.now().date()
            if today != self.last_reset_date:
                self.daily_pnl_history.append({
                    'date': self.last_reset_date,
                    'pnl': daily_pnl,
                    'pnl_pct': daily_pnl_pct
                })
                self.daily_high_equity = current_equity
                self.last_reset_date = today

            # Daily drawdown (from today's high)
            self.daily_high_equity = max(self.daily_high_equity, current_equity)
            daily_drawdown_pct = (
                (current_equity - self.daily_high_equity) / self.daily_high_equity * 100
            ) if self.daily_high_equity > 0 else 0.0

            # Weekly drawdown
            weekly_start = datetime.now() - timedelta(days=7)
            weekly_pnl_items = [
                item for item in self.daily_pnl_history
                if item['date'] >= weekly_start.date()
            ]
            weekly_pnl = sum(item['pnl'] for item in weekly_pnl_items)

            self.weekly_high_equity = max(self.weekly_high_equity, current_equity)
            weekly_drawdown_pct = (
                (current_equity - self.weekly_high_equity) / self.weekly_high_equity * 100
            ) if self.weekly_high_equity > 0 else 0.0

            # Calculate position utilization
            max_positions = 10  # From config
            position_utilization = len(positions) / max_positions

            # Calculate risk score (0-100, lower is better)
            risk_score = self.calculate_risk_score(
                position_utilization=position_utilization,
                drawdown_pct=abs(current_drawdown_pct),
                exposure_ratio=total_exposure / current_equity if current_equity > 0 else 0
            )

            # Total return since inception
            total_return_pct = (
                (current_equity - float(self.starting_capital)) / float(self.starting_capital) * 100
            ) if self.starting_capital > 0 else 0.0

            # Open P&L (unrealized)
            open_pnl = sum(float(pos.unrealized_pl) for pos in positions)

            return {
                # Account metrics
                'account_balance': float(account.equity),
                'buying_power': float(account.buying_power),
                'cash': float(account.cash),
                'portfolio_value': float(account.portfolio_value),

                # Position metrics
                'open_pnl': open_pnl,
                'daily_pnl': daily_pnl,
                'daily_pnl_pct': daily_pnl_pct,
                'total_return_pct': total_return_pct,

                # Risk metrics
                'total_exposure': total_exposure,  # FIXED: Now accurate!
                'long_market_value': float(account.long_market_value),
                'short_market_value': float(account.short_market_value),
                'current_drawdown_pct': current_drawdown_pct,
                'daily_drawdown_pct': daily_drawdown_pct,
                'weekly_drawdown_pct': weekly_drawdown_pct,

                # Position tracking
                'open_positions': len(positions),
                'position_utilization': position_utilization,
                'position_utilization_pct': position_utilization * 100,

                # Risk score
                'risk_score': risk_score,
                'risk_level': self.get_risk_level(risk_score),

                # Circuit breaker status
                'daily_circuit_breaker': abs(daily_drawdown_pct) >= 3.0,
                'weekly_circuit_breaker': abs(weekly_drawdown_pct) >= 7.0,

                # Timestamps
                'last_update': datetime.now().isoformat(),
                'starting_capital': float(self.starting_capital),
                'peak_equity': self.peak_equity
            }

        except Exception as e:
            logger.error(f"Error calculating portfolio metrics: {e}")
            raise

    def calculate_risk_score(
        self,
        position_utilization: float,
        drawdown_pct: float,
        exposure_ratio: float
    ) -> int:
        """
        Calculate risk score (0-100).

        Lower scores = lower risk
        Components:
        - Position utilization (0-30 points)
        - Drawdown magnitude (0-40 points)
        - Exposure ratio (0-30 points)

        Args:
            position_utilization: Fraction of max positions used (0-1)
            drawdown_pct: Current drawdown percentage (positive number)
            exposure_ratio: Total exposure / equity

        Returns:
            Risk score (0-100)
        """
        # Position utilization score (0-30)
        position_score = position_utilization * 30

        # Drawdown score (0-40)
        # 0% drawdown = 0 points, 10%+ drawdown = 40 points
        drawdown_score = min(drawdown_pct * 4, 40)

        # Exposure score (0-30)
        # 1x leverage = 0 points, 3x+ leverage = 30 points
        exposure_score = min((exposure_ratio - 1) * 15, 30) if exposure_ratio > 1 else 0

        total_score = position_score + drawdown_score + exposure_score
        return int(min(max(total_score, 0), 100))

    def get_risk_level(self, risk_score: int) -> str:
        """Get risk level label from score."""
        if risk_score < 25:
            return 'LOW'
        elif risk_score < 50:
            return 'MODERATE'
        elif risk_score < 75:
            return 'HIGH'
        else:
            return 'CRITICAL'

    async def get_positions_summary(self) -> List[Dict[str, Any]]:
        """Get detailed position summary."""
        try:
            positions = await self.broker.get_positions()

            return [
                {
                    'symbol': pos.symbol,
                    'qty': float(pos.qty),
                    'side': pos.side,
                    'entry_price': float(pos.entry_price),
                    'current_price': float(pos.current_price),
                    'market_value': float(pos.market_value),
                    'unrealized_pl': float(pos.unrealized_pl),
                    'unrealized_plpc': float(pos.unrealized_plpc) * 100,
                    'cost_basis': float(pos.cost_basis),
                }
                for pos in positions
            ]
        except Exception as e:
            logger.error(f"Error getting positions summary: {e}")
            raise

    async def check_circuit_breakers(self) -> Dict[str, Any]:
        """
        Check if circuit breakers should be triggered.

        Returns:
            Dictionary with circuit breaker status
        """
        metrics = await self.get_portfolio_metrics()

        daily_triggered = metrics['daily_circuit_breaker']
        weekly_triggered = metrics['weekly_circuit_breaker']

        if daily_triggered or weekly_triggered:
            logger.warning(
                f"Circuit breaker triggered! "
                f"Daily: {daily_triggered}, Weekly: {weekly_triggered}"
            )

        return {
            'daily_limit': 3.0,
            'daily_drawdown': metrics['daily_drawdown_pct'],
            'daily_triggered': daily_triggered,
            'weekly_limit': 7.0,
            'weekly_drawdown': metrics['weekly_drawdown_pct'],
            'weekly_triggered': weekly_triggered,
            'should_halt_trading': daily_triggered or weekly_triggered
        }
