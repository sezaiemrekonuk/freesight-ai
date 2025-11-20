"""Groq API endpoints."""

from fastapi import APIRouter, Depends, HTTPException

from app.controllers.groq_controller import GroqController
from app.core.dependencies import get_groq_client
from app.models.schemas import ChatCompletionRequest, ChatCompletionResponse, ChatMessage
from app.services.groq_client import GroqClient

router = APIRouter()


def get_groq_controller(
    groq_client: GroqClient = Depends(get_groq_client),
) -> GroqController:
    """Dependency to get GroqController instance."""
    return GroqController(groq_client)


@router.post(
    "/chat/completions",
    summary="Chat completion",
    response_model=ChatCompletionResponse,
)
async def chat_completion(
    request: ChatCompletionRequest,
    controller: GroqController = Depends(get_groq_controller),
) -> ChatCompletionResponse:
    """
    Generate a chat completion using Groq API.

    Args:
        request: Chat completion request
        controller: Groq controller instance

    Returns:
        Chat completion response
    """
    return await controller.chat_completion(request)


@router.get("/test", summary="Test Groq connection")
async def test_groq(
    controller: GroqController = Depends(get_groq_controller),
) -> dict[str, str]:
    """
    Test endpoint to verify Groq API connection.

    Args:
        controller: Groq controller instance

    Returns:
        Test response with generated content
    """
    test_request = ChatCompletionRequest(
        messages=[
            ChatMessage(
                role="user",
                name="test-user",
                content="Hello, how are you? I am a test user.",
            )
        ]
    )

    response = await controller.chat_completion(test_request)
    return {"response": response.content}

