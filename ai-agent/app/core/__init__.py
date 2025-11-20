"""Core configuration and dependencies."""

from .config import settings
from .dependencies import get_groq_client

__all__ = ["settings", "get_groq_client"]

