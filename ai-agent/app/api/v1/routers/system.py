"""System endpoints (health, root)."""

from fastapi import APIRouter

from app.models.schemas import HealthResponse

router = APIRouter()


@router.get("/", summary="Root endpoint")
async def root() -> dict[str, str]:
    """Root endpoint to verify API is running."""
    return {"message": "AI Agent API is running"}


@router.get("/health", summary="Health check", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(status="ok")

