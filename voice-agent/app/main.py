from fastapi import FastAPI


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    app = FastAPI(
        title="Voice Agent API",
        version="0.1.0",
        summary="HTTP interface for the Voice Agent service.",
    )

    @app.get("/", tags=["system"])
    async def root():
        return {"message": "Voice Agent API is running"}

    @app.get("/health", tags=["system"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()

