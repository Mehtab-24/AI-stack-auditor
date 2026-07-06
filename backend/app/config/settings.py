"""Centralised application settings loaded from environment variables."""

from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application-wide configuration.

    Values are read from environment variables (or a ``.env`` file in the
    backend root).  Every field has a sensible default so the app can start
    without any configuration in development.
    """

    # Application metadata
    app_name: str = "AI Stack Auditor"
    app_version: str = "1.0.0"
    app_env: str = "development"
    debug: bool = True

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS — list of allowed frontend origins
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    # Supabase — server-side only, never exposed to responses
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # LLM — Gemini API key
    gemini_api_key: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


# Singleton — import this from anywhere in the app.
settings = Settings()
