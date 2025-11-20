from pathlib import Path

from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv

from app.services.groq_client import GroqClient, GroqClientError, GroqMessage

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env", override=False)

groq_client = GroqClient()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    app = FastAPI(
        title="AI Agent API",
        version="0.1.0",
        summary="Core API for the AI Agent service.",
    )

    @app.get("/", tags=["system"])
    async def root():
        return {"message": "AI Agent API is running"}

    @app.get("/health", tags=["system"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}


    @app.get("/test_groq", tags=["groq"])
    async def test_groq():
        try:
            response = await groq_client.chat_completion(
                messages=[
                    GroqMessage(
                        role="user",
                        name="test-user",
                        content="Hello, how are you? I am a test user.",
                    )
                ]
            )
        except GroqClientError as exc:
            raise HTTPException(
                status_code=exc.status_code or 502,
                detail=exc.details or str(exc),
            ) from exc

        return {"response": response.choices[0].message.content}
    
    return app


app = create_app()

