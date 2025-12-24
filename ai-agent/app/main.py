"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    # Startup
    yield
    # Shutdown
    from app.core.dependencies import get_groq_client, get_kokoro_client

    groq_client = get_groq_client()
    await groq_client.aclose()

    kokoro_client = get_kokoro_client()
    await kokoro_client.aclose()


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

    # Add CORS middleware for frontend access
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            # Add production origins as needed
            "*",  # Allow all origins for demo - restrict in production
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    # Include API routers
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    return app


app = create_app()
