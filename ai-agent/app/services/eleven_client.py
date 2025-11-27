"""ElevenLabs TTS client."""

from __future__ import annotations

from typing import Any
from collections.abc import Iterable

import anyio
from elevenlabs import VoiceSettings
from elevenlabs.client import ElevenLabs

from app.models.schemas import TTSRequest


class ElevenLabsClientError(RuntimeError):
    """Raised when an ElevenLabs TTS API call fails."""

    def __init__(self, message: str, details: str | None = None) -> None:
        super().__init__(message)
        self.details = details


class ElevenLabsTTSClient:
    """Lightweight ElevenLabs TTS client."""

    def __init__(
        self,
        *,
        api_key: str,
        default_model: str = "eleven_flash_v2_5",
        client: ElevenLabs | None = None,
    ) -> None:
        self._client = client or ElevenLabs(api_key=api_key)
        self._owns_client = client is None
        self._default_model = default_model

    async def aclose(self) -> None:
        # ElevenLabs client does not need explicit closing.
        return None

    async def synthesize_speech(self, request: TTSRequest) -> bytes:
        """
        Generate speech audio using ElevenLabs.

        Expects `request.voice` to contain the ElevenLabs voice_id.
        """

        def _call() -> bytes:
            if not request.voice:
                raise ElevenLabsClientError("ElevenLabs voice_id (voice) is required")

            # Map our generic response_format to ElevenLabs-specific output_format
            output_format = self._output_format_for_response_format(request.response_format)

            try:
                audio = self._client.text_to_speech.convert(
                    text=request.input,
                    voice_id=request.voice,
                    model_id=request.model or self._default_model,
                    voice_settings=VoiceSettings(stability=0.5, similarity_boost=0.75),
                    output_format=output_format,
                )
            except Exception as exc:  # pragma: no cover - network errors
                raise ElevenLabsClientError(
                    "Failed to connect to ElevenLabs TTS service",
                    details=str(exc),
                ) from exc

            # Newer ElevenLabs SDKs may return a generator/iterator of audio chunks
            if isinstance(audio, (bytes, bytearray)):
                return bytes(audio)

            if isinstance(audio, Iterable) and not isinstance(audio, (str, bytes, bytearray)):
                try:
                    return b"".join(chunk for chunk in audio if chunk)
                except Exception as exc:
                    raise ElevenLabsClientError(
                        "Failed to consume ElevenLabs streaming response",
                        details=str(exc),
                    ) from exc

            raise ElevenLabsClientError(
                "Unexpected response type from ElevenLabs TTS service",
                details=f"type={type(audio)!r}",
            )

        return await anyio.to_thread.run_sync(_call)

    @staticmethod
    def _output_format_for_response_format(response_format: str) -> str:
        """Map generic response_format to ElevenLabs output_format."""
        if response_format == "mp3":
            return "mp3_44100_128"
        if response_format == "wav":
            return "pcm_44100"  # ElevenLabs WAV-like output
        if response_format == "pcm":
            return "pcm_16000"
        # Sensible default
        return "mp3_44100_128"


