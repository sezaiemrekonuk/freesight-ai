"""Request and response schemas."""

from typing import Any, Literal

from pydantic import BaseModel, Field

GroqRole = Literal["system", "user", "assistant", "tool"]


class ChatMessage(BaseModel):
    """Chat message schema."""

    role: GroqRole
    content: str
    name: str | None = None


class ChatCompletionRequest(BaseModel):
    """Chat completion request schema."""

    messages: list[ChatMessage] = Field(..., min_length=1, description="List of chat messages")
    model: str = Field(default="llama-3.1-8b-instant", description="Model to use")
    temperature: float | None = Field(default=0.7, ge=0, le=2, description="Temperature")
    max_tokens: int | None = Field(default=None, ge=1, description="Maximum tokens")
    top_p: float | None = Field(default=1.0, ge=0, le=1, description="Top-p sampling")
    stop: list[str] | None = Field(default=None, description="Stop sequences")
    user: str | None = Field(default=None, description="User identifier")


class ChatCompletionResponse(BaseModel):
    """Chat completion response schema."""

    content: str = Field(..., description="Generated content")
    model: str = Field(..., description="Model used")
    finish_reason: str | None = Field(default=None, description="Finish reason")


class HealthResponse(BaseModel):
    """Health check response schema."""

    status: str = Field(default="ok", description="Service status")


class TTSNormalizationOptions(BaseModel):
    """Text normalization options for Kokoro TTS."""

    normalize: bool = Field(
        default=True,
        description="Whether to apply Kokoro's automatic text normalization.",
    )


class TTSRequest(BaseModel):
    """Text-to-speech request schema for Kokoro-FastAPI."""

    model: str = Field(
        default="kokoro",
        description="Kokoro TTS model identifier.",
    )
    input: str = Field(
        ...,
        description="Input text to synthesize.",
        min_length=1,
    )
    voice: str = Field(
        default="af_bella",
        description="Voice identifier supported by Kokoro-FastAPI (e.g. af_bella).",
    )
    speed: float = Field(
        default=1.0,
        ge=0.5,
        le=2.0,
        description="Playback speed multiplier.",
    )
    response_format: Literal["mp3", "wav", "pcm"] = Field(
        default="mp3",
        description="Audio format to return.",
    )
    stream: bool = Field(
        default=False,
        description="Whether to stream audio chunks. Currently only non-streaming is used.",
    )
    normalization_options: TTSNormalizationOptions | None = Field(
        default=None,
        description="Optional text normalization configuration.",
    )
    extra: dict[str, Any] | None = Field(
        default=None,
        description="Optional extra fields to forward directly to Kokoro-FastAPI.",
    )


class TTSMetadataResponse(BaseModel):
    """Optional metadata about generated TTS audio."""

    format: str = Field(..., description="Audio format (e.g. mp3, wav, pcm).")
    duration_seconds: float | None = Field(
        default=None,
        description="Approximate audio duration in seconds, if known.",
    )
    voice: str = Field(..., description="Voice identifier used for synthesis.")

