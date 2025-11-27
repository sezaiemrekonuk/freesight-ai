"""Application configuration using pydantic-settings."""

from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = Field(default="AI Agent API", description="Application name")
    app_version: str = Field(default="0.1.0", description="Application version")
    debug: bool = Field(default=False, description="Debug mode")
    environment: Literal["development", "staging", "production"] = Field(
        default="development", description="Environment"
    )

    # API
    api_v1_prefix: str = Field(default="/api/v1", description="API v1 prefix")
    api_token: str | None = Field(
        default=None, description="API token for securing endpoints (Bearer token)"
    )

    # Groq API
    groq_api_key: str = Field(..., description="Groq API key")
    groq_base_url: str = Field(
        default="https://api.groq.com/openai/v1", description="Groq API base URL"
    )
    groq_timeout: float = Field(default=30.0, description="Groq API timeout in seconds")

    # Kokoro TTS API
    kokoro_base_url: str = Field(
        default="http://localhost:8880",
        description="Kokoro-FastAPI base URL (e.g. http://localhost:8880)",
    )
    kokoro_api_key: str = Field(
        default="not-needed",
        description=(
            "API key for Kokoro/OpenAI-compatible TTS service. "
            "Kokoro-FastAPI typically accepts any non-empty value."
        ),
    )
    kokoro_timeout: float = Field(
        default=30.0,
        description="Kokoro TTS API timeout in seconds",
    )

    # ElevenLabs TTS API
    elevenlabs_api_key: str | None = Field(
        default=None,
        description="ElevenLabs API key for TTS (ELEVENLABS_API_KEY).",
    )

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()

