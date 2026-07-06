"""Structured logging for the backend.

Provides a ``get_logger`` factory that returns a stdlib logger pre-configured
with a consistent format.  In production (``APP_ENV != "development"``), output
is JSON-structured for machine consumption.
"""

from __future__ import annotations

import logging
import sys
from typing import Final

from app.config.settings import settings

_LOG_FORMAT_DEV: Final[str] = (
    "%(asctime)s | %(levelname)-8s | %(name)-30s | %(message)s"
)
_LOG_FORMAT_PROD: Final[str] = (
    '{"ts":"%(asctime)s","level":"%(levelname)s",'
    '"logger":"%(name)s","msg":"%(message)s"}'
)

_configured: bool = False

_NOISY_PREFIXES: Final[tuple[str, ...]] = (
    "uvicorn",
    "httpcore",
    "hpack",
    "pdfminer",
    "grpc",
    "urllib3",
    "supabase",
    "postgrest",
    "realtime",
)


def _silence_noisy_loggers() -> None:
    """Scan active loggers and set level to WARNING for noisy dependencies."""
    # Silence primary loggers
    for prefix in _NOISY_PREFIXES:
        logging.getLogger(prefix).setLevel(logging.WARNING)

    # Silence child loggers
    for name in list(logging.Logger.manager.loggerDict.keys()):
        if any(name == prefix or name.startswith(prefix + ".") for prefix in _NOISY_PREFIXES):
            logging.getLogger(name).setLevel(logging.WARNING)


def _configure_root_logger() -> None:
    """One-time setup of the root logger."""
    global _configured
    if _configured:
        return

    level = logging.DEBUG if settings.debug else logging.INFO
    fmt = _LOG_FORMAT_DEV if settings.app_env == "development" else _LOG_FORMAT_PROD

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(fmt, datefmt="%Y-%m-%dT%H:%M:%S"))

    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(handler)

    # Run initial silence pass
    _silence_noisy_loggers()

    _configured = True


def get_logger(name: str) -> logging.Logger:
    """Return a named logger, ensuring the root logger is configured."""
    _configure_root_logger()
    # Run dynamic silence pass to catch loggers imported after boot
    _silence_noisy_loggers()
    return logging.getLogger(name)
