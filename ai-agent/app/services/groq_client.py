"""Async Groq API client."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, AsyncIterator, Literal, Sequence

import httpx
from pydantic import BaseModel, Field

GroqRole = Literal["system", "user", "assistant", "tool"]


class GroqClientError(RuntimeError):
    """Raised when a Groq API call fails."""

    def __init__(self, message: str, status_code: int | None = None, details: str | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.details = details


class GroqMessage(BaseModel):
    role: GroqRole
    content: str
    name: str | None = None


class GroqChoice(BaseModel):
    index: int
    finish_reason: str | None = None
    message: GroqMessage


class GroqUsage(BaseModel):
    prompt_tokens: int = Field(default=0, ge=0)
    completion_tokens: int = Field(default=0, ge=0)
    total_tokens: int = Field(default=0, ge=0)


class GroqChatCompletion(BaseModel):
    id: str
    object: str
    created: int
    model: str
    choices: list[GroqChoice]
    usage: GroqUsage | None = None


class GroqChatStreamChoice(BaseModel):
    index: int
    finish_reason: str | None = None
    delta: GroqMessage | None = None


class GroqChatStreamChunk(BaseModel):
    id: str
    object: str
    created: int
    model: str
    choices: list[GroqChatStreamChoice]


@dataclass(slots=True)
class GroqChatOptions:
    model: str = "llama-3.1-8b-instant"
    temperature: float | None = 0.7
    max_tokens: int | None = None
    top_p: float | None = 1.0
    stop: Sequence[str] | None = None
    user: str | None = None


class GroqClient:
    """Lightweight Groq API helper for chat completions."""

    DEFAULT_BASE_URL = "https://api.groq.com/openai/v1"

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 30.0,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._base_url = (base_url or self.DEFAULT_BASE_URL).rstrip("/")
        self._api_key = api_key
        if not self._api_key:
            raise GroqClientError("Missing Groq API key. Pass `api_key` parameter.")

        self._client = client or httpx.AsyncClient(
            base_url=self._base_url,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            timeout=timeout,
        )
        self._owns_client = client is None

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def __aenter__(self) -> "GroqClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:  # type: ignore[override]
        await self.aclose()

    async def chat_completion(
        self,
        messages: Sequence[GroqMessage],
        *,
        options: GroqChatOptions | None = None,
    ) -> GroqChatCompletion:
        """Send a chat completion request."""
        payload = {
            "messages": [message.model_dump() for message in messages],
        }

        if options is None:
            options = GroqChatOptions()

        payload.update(
            {
                "model": options.model,
                "temperature": options.temperature,
                "max_tokens": options.max_tokens,
                "top_p": options.top_p,
                "stop": options.stop,
                "user": options.user,
                "stream": False,
            }
        )

        response = await self._client.post("/chat/completions", json=payload)
        if response.is_error:
            await self._raise_http_error(response)
        return self._parse_response(response, model=GroqChatCompletion)

    async def stream_chat_completion(
        self,
        messages: Sequence[GroqMessage],
        *,
        options: GroqChatOptions | None = None,
    ) -> AsyncIterator[GroqChatStreamChunk]:
        """Yield streaming chat completion chunks."""
        payload = {
            "messages": [message.model_dump() for message in messages],
        }

        if options is None:
            options = GroqChatOptions()

        payload.update(
            {
                "model": options.model,
                "temperature": options.temperature,
                "max_tokens": options.max_tokens,
                "top_p": options.top_p,
                "stop": options.stop,
                "user": options.user,
                "stream": True,
            }
        )

        async with self._client.stream("POST", "/chat/completions", json=payload) as response:
            if response.is_error:
                await self._raise_http_error(response)

            async for data in self._iter_sse(response):
                yield GroqChatStreamChunk.model_validate_json(data)

    async def _iter_sse(self, response: httpx.Response) -> AsyncIterator[str]:
        async for line in response.aiter_lines():
            if not line or line.startswith(":"):
                continue
            if not line.startswith("data:"):
                continue
            data = line.removeprefix("data:").strip()
            if not data or data == "[DONE]":
                break
            yield data

    async def _raise_http_error(self, response: httpx.Response) -> None:
        try:
            payload = response.json()
            message = payload.get("error", {}).get("message") or response.text
        except ValueError:
            message = response.text

        raise GroqClientError(
            f"Groq API call failed with {response.status_code}",
            status_code=response.status_code,
            details=message,
        )

    def _parse_response(self, response: httpx.Response, *, model: type[BaseModel]) -> BaseModel:
        if response.is_error:
            raise httpx.HTTPStatusError(
                "Groq API returned an error",
                request=response.request,
                response=response,
            )
        payload = response.json()
        return model.model_validate(payload)

    async def chat_with_prompt(
        self,
        variables: dict[str, Any],
        prompt: str | type | None = None,
        *,
        options: GroqChatOptions | None = None,
    ) -> GroqChatCompletion:
        """
        Send a chat completion using a prompt template (internal use only).

        Args:
            variables: Dictionary of variables to substitute in the prompt
            prompt: Prompt name (string) or Prompt enum value. Defaults to Prompt.MAIN
            options: Optional chat options (model will be overridden by prompt config)

        Returns:
            GroqChatCompletion response

        Example:
            ```python
            from app.prompts import Prompt

            # Using default MAIN prompt
            response = await client.chat_with_prompt(
                variables={"objectsInImage": "...", "isPanic": "true"}
            )

            # Using specific prompt
            response = await client.chat_with_prompt(
                variables={"objectsInImage": "..."},
                prompt=Prompt.DESCRIBE
            )
            ```
        """
        from app.prompts import Prompt
        from app.services.prompt_manager import get_prompt_manager

        # Default to MAIN prompt if not provided
        if prompt is None:
            prompt = Prompt.MAIN

        # Convert enum to string if needed
        from enum import Enum

        if isinstance(prompt, Enum):
            prompt_name = prompt.value
        elif isinstance(prompt, str):
            prompt_name = prompt
        else:
            raise TypeError(f"prompt must be a str or Enum, got {type(prompt).__name__}")

        # Get prompt manager and render prompt
        prompt_manager = get_prompt_manager()
        messages, model_name = prompt_manager.render_prompt(prompt_name, variables)

        # Override model in options if not explicitly set
        if options is None:
            options = GroqChatOptions()
        options.model = model_name

        # Call regular chat_completion
        return await self.chat_completion(messages=messages, options=options)


