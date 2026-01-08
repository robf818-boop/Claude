"""FastAPI server for OptionIQ trading bot."""
import logging
from contextlib import asynccontextmanager
from decimal import Decimal

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from config import get_settings
from brokers.alpaca import AlpacaBroker
from portfolio.manager import PortfolioManager

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global instances
broker: Optional[AlpacaBroker] = None
portfolio_manager: Optional[PortfolioManager] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    global broker, portfolio_manager

    # Startup
    logger.info("Starting OptionIQ trading bot...")
    settings = get_settings()

    # Initialize broker
    broker = AlpacaBroker(
        api_key=settings.alpaca_api_key,
        api_secret=settings.alpaca_api_secret,
        paper=True  # Always use paper trading for safety
    )
    logger.info("Alpaca broker initialized")

    # Initialize portfolio manager
    portfolio_manager = PortfolioManager(
        broker=broker,
        starting_capital=Decimal(str(settings.starting_capital))
    )
    logger.info("Portfolio manager initialized")

    # Log account info
    account = await broker.get_account()
    logger.info(f"Account equity: ${account.equity}")
    logger.info(f"Buying power: ${account.buying_power}")

    yield

    # Shutdown
    logger.info("Shutting down OptionIQ trading bot...")


# Create FastAPI app
app = FastAPI(
    title="OptionIQ Trading Bot API",
    description="Automated options trading system with risk management",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models for requests
class OrderRequest(BaseModel):
    symbol: str
    qty: float
    side: str  # 'buy' or 'sell'
    order_type: str = 'market'
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None


# Health check endpoint
@app.get("/health")
async def health_check():
    """Check if API is running."""
    return {
        "status": "healthy",
        "service": "OptionIQ Trading Bot",
        "version": "1.0.0"
    }


# Account endpoints
@app.get("/api/account")
async def get_account():
    """Get account information."""
    try:
        account = await broker.get_account()
        return {
            "equity": float(account.equity),
            "cash": float(account.cash),
            "buying_power": float(account.buying_power),
            "portfolio_value": float(account.portfolio_value),
            "long_market_value": float(account.long_market_value),
            "short_market_value": float(account.short_market_value),
            "multiplier": account.multiplier,
            "daytrade_count": account.daytrade_count
        }
    except Exception as e:
        logger.error(f"Error getting account: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Portfolio endpoints
@app.get("/api/portfolio/metrics")
async def get_portfolio_metrics():
    """Get comprehensive portfolio metrics."""
    try:
        metrics = await portfolio_manager.get_portfolio_metrics()
        return metrics
    except Exception as e:
        logger.error(f"Error getting portfolio metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/portfolio/positions")
async def get_positions():
    """Get all open positions."""
    try:
        positions = await portfolio_manager.get_positions_summary()
        return {"positions": positions}
    except Exception as e:
        logger.error(f"Error getting positions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/portfolio/circuit-breakers")
async def get_circuit_breakers():
    """Check circuit breaker status."""
    try:
        status = await portfolio_manager.check_circuit_breakers()
        return status
    except Exception as e:
        logger.error(f"Error checking circuit breakers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Trading endpoints
@app.post("/api/orders")
async def place_order(order: OrderRequest):
    """Place a trading order."""
    try:
        # Check circuit breakers first
        circuit_status = await portfolio_manager.check_circuit_breakers()
        if circuit_status['should_halt_trading']:
            raise HTTPException(
                status_code=403,
                detail="Trading halted: Circuit breaker triggered"
            )

        result = await broker.place_order(
            symbol=order.symbol,
            qty=Decimal(str(order.qty)),
            side=order.side,
            order_type=order.order_type,
            limit_price=Decimal(str(order.limit_price)) if order.limit_price else None,
            stop_price=Decimal(str(order.stop_price)) if order.stop_price else None
        )

        return {
            "order_id": result.id,
            "symbol": result.symbol,
            "qty": float(result.qty),
            "side": result.side,
            "status": result.status,
            "created_at": result.created_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error placing order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/orders")
async def get_orders(status: str = "open"):
    """Get orders by status."""
    try:
        orders = await broker.get_orders(status=status)
        return {
            "orders": [
                {
                    "id": order.id,
                    "symbol": order.symbol,
                    "qty": float(order.qty),
                    "side": order.side,
                    "type": order.order_type,
                    "status": order.status,
                    "filled_qty": float(order.filled_qty),
                    "filled_avg_price": float(order.filled_avg_price) if order.filled_avg_price else None,
                    "created_at": order.created_at.isoformat()
                }
                for order in orders
            ]
        }
    except Exception as e:
        logger.error(f"Error getting orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/orders/{order_id}")
async def cancel_order(order_id: str):
    """Cancel an order."""
    try:
        success = await broker.cancel_order(order_id)
        if success:
            return {"message": f"Order {order_id} cancelled"}
        else:
            raise HTTPException(status_code=400, detail="Failed to cancel order")
    except Exception as e:
        logger.error(f"Error cancelling order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/positions/{symbol}/close")
async def close_position(symbol: str):
    """Close a specific position."""
    try:
        success = await broker.close_position(symbol)
        if success:
            return {"message": f"Position {symbol} closed"}
        else:
            raise HTTPException(status_code=400, detail="Failed to close position")
    except Exception as e:
        logger.error(f"Error closing position: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/positions/close-all")
async def close_all_positions():
    """Close all open positions (emergency stop)."""
    try:
        success = await broker.close_all_positions()
        if success:
            return {"message": "All positions closed"}
        else:
            raise HTTPException(status_code=400, detail="Failed to close all positions")
    except Exception as e:
        logger.error(f"Error closing all positions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# WebSocket endpoint for real-time updates
@app.websocket("/ws/portfolio")
async def websocket_portfolio(websocket: WebSocket):
    """WebSocket endpoint for real-time portfolio updates."""
    await websocket.accept()
    logger.info("WebSocket client connected")

    try:
        while True:
            # Send portfolio metrics every 2 seconds
            metrics = await portfolio_manager.get_portfolio_metrics()
            await websocket.send_json(metrics)

            # Wait for 2 seconds or until client sends message
            try:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
            except:
                pass

            import asyncio
            await asyncio.sleep(2)

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close()


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug
    )
