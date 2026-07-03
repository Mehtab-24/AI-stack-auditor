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
    "%(asctime)s │ %(levelname)-8s │ %(name)-30s │ %(message)s"
)
_LOG_FORMAT_PROD: Final[str] = (
    '{"ts":"%(asctime)s","level":"%(levelname)s",'
    '"logger":"%(name)s","msg":"%(message)s"}'
)

_configured: bool = False


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

    # Quieten noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    _configured = True


def get_logger(name: str) -> logging.Logger:
    """Return a named logger, ensuring the root logger is configured."""
    _configure_root_logger()
    return logging.getLogger(name)
