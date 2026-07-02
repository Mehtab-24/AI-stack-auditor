"""AI Stack Auditor — FastAPI application entry point.

Run with:
    uvicorn main:app --reload
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config.settings import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import get_logger

logger = get_logger("main")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Application startup and shutdown lifecycle."""
    logger.info(
        "%s v%s starting (env=%s, debug=%s)",
        settings.app_name,
        settings.app_version,
        settings.app_env,
        settings.debug,
    )
    yield
    logger.info("Shutting down")


def create_app() -> FastAPI:
    """Application factory — creates and configures the FastAPI instance."""
    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Agent-based AI spend rationalization platform. "
            "Discovers AI tool overlap, scores ROI, and recommends a leaner stack."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handlers
    register_exception_handlers(application)

    # Routes
    application.include_router(router)

    @application.get("/", include_in_schema=False)
    async def root():
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="/docs")

    return application


# Module-level instance — uvicorn imports this.
app = create_app()
