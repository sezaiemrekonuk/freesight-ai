"""Kokoro TTS client using the official OpenAI Python client."""

from __future__ import annotations

from typing import Any

import anyio
from openai import OpenAI

from app.models.schemas import TTSRequest


class KokoroClientError(RuntimeError):
    """Raised when a Kokoro TTS API call fails."""

    def __init__(self, message: str, status_code: int | None = None, details: str | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.details = details


class KokoroTTSClient:
    """Lightweight client for Kokoro-FastAPI TTS endpoints via OpenAI client."""

    def __init__(
        self,
        *,
        base_url: str,
        api_key: str,
        timeout: float = 30.0,
        client: OpenAI | None = None,
    ) -> None:
        # Kokoro-FastAPI exposes an OpenAI-compatible API, usually under /v1
        api_base = base_url.rstrip("/") + "/v1"
        self._client = client or OpenAI(
            base_url=api_base,
            api_key=api_key,
            timeout=timeout,
        )
        self._owns_client = client is None

    async def aclose(self) -> None:
        # OpenAI client does not require explicit close; keep for API symmetry.
        return None

    async def __aenter__(self) -> "KokoroTTSClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:  # type: ignore[override]
        await self.aclose()

    async def synthesize_speech(self, request: TTSRequest) -> bytes:
        """
        Generate speech audio for the given request using Kokoro-FastAPI.

        This uses the OpenAI-compatible `/v1/audio/speech` endpoint and returns raw audio bytes.
        """

        def _call_openai() -> bytes:
            payload: dict[str, Any] = {}

            if request.normalization_options is not None:
                payload["normalization_options"] = request.normalization_options.model_dump()

            if request.extra:
                payload.update(request.extra)

            try:
                response = self._client.audio.speech.create(
                    model=request.model,
                    input=request.input,
                    voice=request.voice,
                    speed=request.speed,
                    response_format=request.response_format,
                    **payload,
                )
            except Exception as exc:  # pragma: no cover - network errors
                raise KokoroClientError(
                    "Failed to connect to Kokoro TTS service",
                    details=str(exc),
                ) from exc

            # For OpenAI-compatible clients, audio.speech.create returns a binary-like object.
            # Kokoro-FastAPI follows the same convention.
            if hasattr(response, "read"):
                return response.read()

            # Fallback: some wrappers may expose bytes directly or via `content`
            content = getattr(response, "content", None)
            if isinstance(content, (bytes, bytearray)):
                return bytes(content)

            if isinstance(response, (bytes, bytearray)):
                return bytes(response)

            raise KokoroClientError(
                "Unexpected response type from Kokoro TTS service",
                details=f"type={type(response)!r}",
            )

        # Run the blocking OpenAI client call in a worker thread to avoid blocking the event loop
        return await anyio.to_thread.run_sync(_call_openai)

