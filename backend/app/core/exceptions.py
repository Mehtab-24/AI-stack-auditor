"""Application-level exceptions and FastAPI error handlers.

All custom exceptions inherit from ``AppError`` so callers can catch the full
hierarchy with a single ``except AppError`` clause.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


# ── Exception hierarchy ──────────────────────────────────────────────────────


class AppError(Exception):
    """Base exception for all application errors."""

    def __init__(
        self,
        message: str = "An unexpected error occurred.",
        status_code: int = 500,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class CSVParsingError(AppError):
    """Raised when CSV content cannot be parsed or is structurally invalid."""

    def __init__(self, message: str = "Failed to parse CSV data.", details: dict[str, Any] | None = None) -> None:
        super().__init__(message=message, status_code=422, details=details)


class ValidationError(AppError):
    """Raised when input data fails business-rule validation."""

    def __init__(self, message: str = "Validation failed.", details: dict[str, Any] | None = None) -> None:
        super().__init__(message=message, status_code=422, details=details)


class AgentExecutionError(AppError):
    """Raised when an agent fails during execution."""

    def __init__(
        self,
        agent_name: str,
        message: str = "Agent execution failed.",
        details: dict[str, Any] | None = None,
    ) -> None:
        full_message = f"[{agent_name}] {message}"
        super().__init__(message=full_message, status_code=500, details=details)
        self.agent_name = agent_name


class OrchestrationError(AppError):
    """Raised when the agent pipeline fails at the orchestration level."""

    def __init__(self, message: str = "Pipeline orchestration failed.", details: dict[str, Any] | None = None) -> None:
        super().__init__(message=message, status_code=500, details=details)


# ── FastAPI exception handlers ───────────────────────────────────────────────


def register_exception_handlers(app: FastAPI) -> None:
    """Attach custom exception handlers to the FastAPI application."""

    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": True,
                "message": exc.message,
                "details": exc.details,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "message": "An unexpected internal error occurred.",
                "details": {"type": type(exc).__name__},
            },
        )
