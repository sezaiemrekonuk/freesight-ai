"""Request and response schemas."""

from typing import Literal

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

