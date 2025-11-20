from fastapi import FastAPI


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

    return app


app = create_app()

