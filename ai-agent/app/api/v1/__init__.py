"""API v1 package."""

from fastapi import APIRouter

from app.api.v1.routers import groq, system, tts, detection, analyze

api_router = APIRouter()

api_router.include_router(system.router, tags=["system"])
api_router.include_router(groq.router, prefix="/groq", tags=["groq"])
api_router.include_router(tts.router, prefix="/tts", tags=["tts"])
api_router.include_router(detection.router, prefix="/vision", tags=["vision"])
api_router.include_router(analyze.router, prefix="/analyze", tags=["analyze"])

__all__ = ["api_router"]

