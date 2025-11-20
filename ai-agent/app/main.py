"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1 import api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    # Startup
    yield
    # Shutdown
    from app.core.dependencies import get_groq_client

    groq_client = get_groq_client()
    await groq_client.aclose()


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application instance.

    Returns:
        Configured FastAPI application
    """
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        summary="Core API for the AI Agent service.",
        debug=settings.debug,
        lifespan=lifespan,
    )

    # Include API routers
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    return app


app = create_app()
