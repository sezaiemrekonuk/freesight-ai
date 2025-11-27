"""Kokoro TTS API endpoints."""

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.controllers.tts_controller import TTSController
from app.core.dependencies import get_eleven_client, get_kokoro_client, verify_api_token
from app.models.schemas import TTSRequest
from app.services.eleven_client import ElevenLabsTTSClient
from app.services.tts_client import KokoroTTSClient

router = APIRouter()


def get_tts_controller(
    kokoro_client: KokoroTTSClient = Depends(get_kokoro_client),
    eleven_client: ElevenLabsTTSClient | None = Depends(get_eleven_client),
) -> TTSController:
    """Dependency to get TTSController instance."""
    return TTSController(kokoro_client=kokoro_client, eleven_client=eleven_client)


def _media_type_for_format(response_format: str) -> str:
    if response_format == "mp3":
        return "audio/mpeg"
    if response_format == "wav":
        return "audio/wav"
    if response_format == "pcm":
        return "audio/raw"
    return "application/octet-stream"


@router.post(
    "/speech",
    summary="Text-to-speech synthesis",
    response_class=Response,
    dependencies=[Depends(verify_api_token)],
)
async def text_to_speech(
    request: TTSRequest,
    controller: TTSController = Depends(get_tts_controller),
) -> Response:
    """
    Generate speech audio from text using Kokoro-FastAPI via OpenAI-compatible client.

    Returns raw audio bytes with an appropriate audio Content-Type header.
    """
    audio_bytes = await controller.generate_speech(request)
    media_type = _media_type_for_format(request.response_format)
    return Response(content=audio_bytes, media_type=media_type)


@router.get(
    "/test",
    summary="Test default TTS connection (Kokoro)",
    dependencies=[Depends(verify_api_token)],
)
async def test_tts(
    controller: TTSController = Depends(get_tts_controller),
) -> Response:
    """Test endpoint to verify the default TTS provider (Kokoro) is reachable."""
    request = TTSRequest(input="Hello from the TTS test endpoint.")
    audio_bytes = await controller.generate_speech(request)
    media_type = _media_type_for_format(request.response_format)
    return Response(content=audio_bytes, media_type=media_type)


@router.get(
    "/test-elevenlabs",
    summary="Test ElevenLabs TTS connection",
    dependencies=[Depends(verify_api_token)],
)
async def test_elevenlabs_tts(
    voice: str,
    controller: TTSController = Depends(get_tts_controller),
) -> Response:
    """
    Test endpoint to verify ElevenLabs TTS is reachable.

    Requires ELEVENLABS_API_KEY to be configured and an ElevenLabs voice_id via the `voice` query parameter.
    """
    request = TTSRequest(
        provider="elevenlabs",
        model="eleven_multilingual_v2",
        input="Hello from the ElevenLabs TTS test endpoint.",
        voice=voice,
    )
    audio_bytes = await controller.generate_speech(request)
    media_type = _media_type_for_format(request.response_format)
    return Response(content=audio_bytes, media_type=media_type)


