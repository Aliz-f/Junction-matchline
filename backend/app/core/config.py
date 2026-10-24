"""Typed, server-only application configuration."""

from __future__ import annotations

from datetime import datetime
from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    database_url: str = "postgresql+asyncpg://matchline:matchline_dev@localhost:5432/matchline"
    frontend_origin: str = "http://localhost:3000"
    cors_allowed_origins: str = "http://localhost:3000"
    session_cookie_name: str = "matchline_session"
    session_ttl_days: int = 14
    session_cookie_secure: bool = False
    sports_provider: str = "demo"
    ai_provider: str = "mock"
    ai_api_key: SecretStr | None = None
    ai_model: str | None = None
    ai_base_url: str | None = None
    ai_request_timeout_seconds: int = 25
    whatif_free_daily_messages: int = 3
    whatif_premium_daily_messages: int = 30
    demo_features_enabled: bool = True
    demo_clock_iso: datetime = datetime.fromisoformat("2026-10-24T12:00:00+00:00")
    matchline_demo_free_email: str | None = None
    matchline_demo_free_password: SecretStr | None = None
    matchline_demo_premium_email: str | None = None
    matchline_demo_premium_password: SecretStr | None = None

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    @property
    def mode(self) -> str:
        return "DEMO" if self.sports_provider == "demo" else "LIVE"

    @property
    def remote_ai_configured(self) -> bool:
        return bool(
            self.ai_provider == "remote"
            and self.ai_api_key is not None
            and self.ai_model
            and self.ai_base_url
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
