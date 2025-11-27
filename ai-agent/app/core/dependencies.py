"""FastAPI dependencies."""

from functools import lru_cache

from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.services.groq_client import GroqClient
from app.services.tts_client import KokoroTTSClient
from app.services.eleven_client import ElevenLabsTTSClient

security = HTTPBearer()


@lru_cache
def get_groq_client() -> GroqClient:
    """Get or create a Groq client instance (singleton)."""
    return GroqClient(
        api_key=settings.groq_api_key,
        base_url=settings.groq_base_url,
        timeout=settings.groq_timeout,
    )


@lru_cache
def get_kokoro_client() -> KokoroTTSClient:
    """Get or create a Kokoro TTS client instance (singleton)."""
    return KokoroTTSClient(
        base_url=settings.kokoro_base_url,
        api_key=settings.kokoro_api_key,
        timeout=settings.kokoro_timeout,
    )


@lru_cache
def get_eleven_client() -> ElevenLabsTTSClient | None:
    """Get or create an ElevenLabs TTS client instance (singleton), if configured."""
    if not settings.elevenlabs_api_key:
        return None
    return ElevenLabsTTSClient(api_key=settings.elevenlabs_api_key)


def verify_api_token(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> str:
    """
    Verify API token from Authorization header.

    Args:
        credentials: HTTP Bearer token credentials

    Returns:
        The verified token

    Raises:
        HTTPException: If token is missing or invalid
    """
    if not settings.api_token:
        # If no token is configured, allow access (development mode)
        return "no_token_configured"

    token = credentials.credentials

    if token != settings.api_token:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return token

