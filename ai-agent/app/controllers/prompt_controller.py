"""Controller for prompt-based chat completions."""

from typing import Any

from fastapi import HTTPException

from app.models.schemas import ChatCompletionResponse
from app.prompts import Prompt
from app.services.groq_client import GroqClient, GroqClientError
from app.services.prompt_manager import get_prompt_manager


class PromptController:
    """Controller for prompt-based chat completion operations."""

    def __init__(self, groq_client: GroqClient) -> None:
        """Initialize the controller with a Groq client."""
        self.groq_client = groq_client
        self.prompt_manager = get_prompt_manager()

    async def chat_with_prompt(
        self,
        variables: dict[str, Any],
        prompt: Prompt | str | None = None,
    ) -> ChatCompletionResponse:
        """
        Process a chat completion request using a prompt template (internal use only).

        Args:
            variables: Dictionary of variables to substitute in the prompt
            prompt: Prompt enum or prompt name string. Defaults to Prompt.MAIN

        Returns:
            Chat completion response

        Raises:
            HTTPException: If the Groq API call fails or prompt is invalid
        """
        try:
            # Use the convenient chat_with_prompt method
            response = await self.groq_client.chat_with_prompt(
                variables=variables,
                prompt=prompt,
            )

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

        except ValueError as exc:
            # Handle missing variables or invalid prompt
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=f"Prompt not found: {str(exc)}") from exc
        except GroqClientError as exc:
            raise HTTPException(
                status_code=exc.status_code or 502,
                detail=exc.details or str(exc),
            ) from exc

