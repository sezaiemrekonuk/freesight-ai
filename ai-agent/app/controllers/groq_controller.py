"""Groq service controller."""

from fastapi import HTTPException

from app.models.schemas import ChatCompletionRequest, ChatCompletionResponse
from app.services.groq_client import GroqClient, GroqClientError, GroqMessage


class GroqController:
    """Controller for Groq chat completion operations."""

    def __init__(self, groq_client: GroqClient) -> None:
        """Initialize the controller with a Groq client."""
        self.groq_client = groq_client

    async def chat_completion(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        """
        Process a chat completion request.

        Args:
            request: Chat completion request

        Returns:
            Chat completion response

        Raises:
            HTTPException: If the Groq API call fails
        """
        try:
            # Convert request messages to GroqMessage format
            messages = [
                GroqMessage(role=msg.role, content=msg.content, name=msg.name)
                for msg in request.messages
            ]

            # Create options from request
            from app.services.groq_client import GroqChatOptions

            options = GroqChatOptions(
                model=request.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                top_p=request.top_p,
                stop=request.stop,
                user=request.user,
            )

            # Call Groq API
            response = await self.groq_client.chat_completion(messages=messages, options=options)

            # Extract the first choice's message content
            if not response.choices:
                raise HTTPException(status_code=502, detail="No choices returned from Groq API")

            choice = response.choices[0]
            content = choice.message.content if choice.message else ""

            return ChatCompletionResponse(
                content=content,
                model=response.model,
                finish_reason=choice.finish_reason,
            )

        except GroqClientError as exc:
            raise HTTPException(
                status_code=exc.status_code or 502,
                detail=exc.details or str(exc),
            ) from exc

