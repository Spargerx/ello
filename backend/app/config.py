"""ello — Application configuration.

All secrets and tunables are read from environment variables (prefixed ELLO_).
A .env file is loaded automatically by pydantic-settings.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="ELLO_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://localhost:5432/ello_db"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://localhost:5432/ello_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT — no hardcoded secrets; must be set via env
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24

    # Gateway
    PROTECTION_MODE: str = "active"  # "active" blocks, "monitor" logs only
    RATE_LIMIT_RPM: int = 60

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]


settings = Settings()
