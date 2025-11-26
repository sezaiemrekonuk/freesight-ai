## AI Agent Service

A FastAPI-based AI Agent service with Groq integration, following best practices for project structure, dependency injection, and configuration management.

### Project Structure

```
app/
├── api/                    # API layer
│   └── v1/                 # API version 1
│       └── routers/        # Route handlers
│           ├── groq.py     # Groq endpoints
│           └── system.py   # System endpoints (health, root)
├── controllers/            # Business logic controllers
│   └── groq_controller.py
├── core/                   # Core configuration and dependencies
│   ├── config.py          # Settings management (pydantic-settings)
│   └── dependencies.py    # FastAPI dependencies
├── models/                 # Pydantic models and schemas
│   └── schemas.py         # Request/response models
├── services/              # External service clients
│   ├── groq_client.py     # Groq API client
│   └── prompt_manager.py  # Prompt parsing and management
├── prompts/               # Prompt templates (YAML)
│   ├── Main.prompt.yaml     # Main prompt file to use in loop
│   └── Describe.prompt.yaml # Describer for the image features
└── main.py                # Application entry point
```

### Setup

1. Create a virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Create a `.env` file in the project root:
   ```bash
   GROQ_API_KEY=your_groq_api_key_here
   API_TOKEN=your_secure_api_token_here  # Required for accessing Groq endpoints
   DEBUG=false
   ENVIRONMENT=development
   ```
   
   **Note:** The `API_TOKEN` is required to access Groq endpoints. If not set, endpoints will be accessible without authentication (development mode only).

3. Run the FastAPI server with Uvicorn:
   ```bash
   uvicorn app.main:app --reload
   ```

### API Endpoints

The service exposes the following endpoints:

#### System Endpoints
- `GET /api/v1/` - Root endpoint
- `GET /api/v1/health` - Health check

#### Groq Endpoints (Protected - Requires Bearer Token)
- `POST /api/v1/groq/chat/completions` - Chat completion
- `GET /api/v1/groq/test` - Test Groq connection

**Authentication:** All Groq endpoints require a Bearer token in the `Authorization` header:
```bash
Authorization: Bearer your_api_token_here
```

Example with curl:
```bash
curl -X POST "http://localhost:8000/api/v1/groq/chat/completions" \
  -H "Authorization: Bearer your_api_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

#### TTS Endpoints (Protected - Requires Bearer Token)

- `POST /api/v1/tts/speech` - Generate speech audio from text
- `GET /api/v1/tts/test` - Test Kokoro TTS connection

**Environment:**

Add the following Kokoro/OpenAI-compatible settings to your `.env`:

```bash
KOKORO_BASE_URL=http://localhost:8880
KOKORO_API_KEY=kokoro-test-key
KOKORO_TIMEOUT=30.0
```

`KOKORO_BASE_URL` should point to your running [Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI) instance (e.g. `http://localhost:8880` when running locally as described in the Kokoro-FastAPI README).

**Example (curl) – text to speech:**

```bash
curl -X POST "http://localhost:8000/api/v1/tts/speech" \
  -H "Authorization: Bearer your_api_token_here" \
  -H "Content-Type: application/json" \
  --output output.mp3 \
  -d '{
    "input": "Hello from the AI Agent TTS endpoint!",
    "voice": "af_bella",
    "response_format": "mp3"
  }'
```

This endpoint uses the official OpenAI Python client configured to talk to Kokoro-FastAPI's OpenAI-compatible `/v1/audio/speech` API, as documented in [`remsky/Kokoro-FastAPI`](https://github.com/remsky/Kokoro-FastAPI).

### Features

- ✅ **Structured Project Layout**: Follows FastAPI best practices with clear separation of concerns
- ✅ **Configuration Management**: Uses `pydantic-settings` for type-safe environment variable handling
- ✅ **Dependency Injection**: Proper use of FastAPI's dependency injection system
- ✅ **API Versioning**: Organized API structure with version support
- ✅ **Authentication**: Bearer token authentication for protected endpoints
- ✅ **Prompt System**: YAML-based prompt templates with variable substitution
- ✅ **Lifecycle Management**: Proper startup/shutdown handling for resources
- ✅ **Type Safety**: Full type hints and Pydantic models throughout
- ✅ **Error Handling**: Comprehensive error handling with proper HTTP status codes

### Prompt System

The service includes a powerful prompt management system that allows you to:

- Define prompts in YAML files
- Use enums for type-safe prompt references
- Substitute variables easily
- Use prompts with a simple API

**Example:**
```python
from app.services.groq_client import GroqClient
from app.core.dependencies import get_groq_client

groq_client = get_groq_client()

# Default MAIN prompt (prompt parameter is optional)
response = await groq_client.chat_with_prompt(
    variables={
        "objectsInImage": "Car ahead, Person on left",
        "isPanic": "false"
    }
)
```

See [EXAMPLE_USAGE.md](EXAMPLE_USAGE.md) for more details.
