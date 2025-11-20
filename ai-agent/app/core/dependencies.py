"""FastAPI dependencies."""

from functools import lru_cache

from app.services.groq_client import GroqClient


@lru_cache
def get_groq_client() -> GroqClient:
    """Get or create a Groq client instance (singleton)."""
    from app.core.config import settings

    return GroqClient(
        api_key=settings.groq_api_key,
        base_url=settings.groq_base_url,
        timeout=settings.groq_timeout,
    )

