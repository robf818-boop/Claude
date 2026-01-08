"""Configuration management for OptionIQ trading bot."""
import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Alpaca API Credentials
    alpaca_api_key: str = Field(..., env='ALPACA_API_KEY')
    alpaca_api_secret: str = Field(..., env='ALPACA_API_SECRET')
    alpaca_base_url: str = Field(
        'https://paper-api.alpaca.markets',
        env='ALPACA_BASE_URL'
    )

    # Trading Parameters
    starting_capital: float = Field(100000.0, env='STARTING_CAPITAL')
    max_position_size_pct: float = Field(0.10, env='MAX_POSITION_SIZE_PCT')
    stop_loss_pct: float = Field(0.03, env='STOP_LOSS_PCT')
    take_profit_pct: float = Field(0.05, env='TAKE_PROFIT_PCT')
    max_daily_drawdown_pct: float = Field(0.03, env='MAX_DAILY_DRAWDOWN_PCT')
    max_weekly_drawdown_pct: float = Field(0.07, env='MAX_WEEKLY_DRAWDOWN_PCT')
    max_open_positions: int = Field(10, env='MAX_OPEN_POSITIONS')

    # Optional Market Data
    polygon_api_key: Optional[str] = Field(None, env='POLYGON_API_KEY')

    # Server Settings
    api_host: str = Field('0.0.0.0', env='API_HOST')
    api_port: int = Field(8000, env='API_PORT')
    debug: bool = Field(True, env='DEBUG')

    class Config:
        env_file = '.env'
        env_file_encoding = 'utf-8'
        case_sensitive = False


# Global settings instance
settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get or create settings instance."""
    global settings
    if settings is None:
        settings = Settings()
    return settings


def load_settings() -> Settings:
    """Force reload settings from environment."""
    global settings
    settings = Settings()
    return settings
