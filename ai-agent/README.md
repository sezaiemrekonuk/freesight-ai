## AI Agent Service

A FastAPI-based AI Agent service with Groq integration, following best practices for project structure, dependency injection, and configuration management.

### Project Structure

```
app/
├── api/                    # API layer
│   └── v1/                 # API version 1
│       └── routers/        # Route handlers
│           ├── groq.py     # Groq endpoints
│           ├── tts.py      # TTS endpoints (Kokoro/ElevenLabs)
│           ├── detection.py # Vision/detection endpoints
│           └── system.py   # System endpoints (health, root)
├── controllers/            # Business logic controllers
│   ├── groq_controller.py
│   ├── tts_controller.py
│   └── prompt_controller.py
├── core/                   # Core configuration and dependencies
│   ├── config.py          # Settings management (pydantic-settings)
│   └── dependencies.py    # FastAPI dependencies
├── models/                 # Pydantic models and schemas
│   └── schemas.py         # Request/response models
├── services/              # External service clients
│   ├── groq_client.py     # Groq API client
│   ├── tts_client.py      # Kokoro TTS client
│   ├── eleven_client.py   # ElevenLabs TTS client
│   ├── detection_service.py # YOLO detection service
│   └── prompt_manager.py  # Prompt parsing and management
├── prompts/               # Prompt templates (YAML)
│   ├── Main.prompt.yaml     # Main prompt file to use in loop
│   └── Describe.prompt.yaml # Describer for the image features
├── weights/               # YOLO model weights
│   └── best.pt            # Custom trained YOLO model
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
   API_TOKEN=your_secure_api_token_here  # Required for accessing protected endpoints
   DEBUG=false
   ENVIRONMENT=development
   
   # Kokoro TTS (Optional - only if using Kokoro TTS)
   KOKORO_BASE_URL=http://localhost:8880
   KOKORO_API_KEY=kokoro-test-key
   KOKORO_TIMEOUT=30.0
   
   # ElevenLabs TTS (Optional - only if using ElevenLabs)
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ELEVENLABS_VOICE_ID=your_default_voice_id  # Optional default voice
   ELEVENLABS_TTS_MODEL=eleven_flash_v2_5  # Optional default model
   ```
   
   **Note:** The `API_TOKEN` is required to access protected endpoints (Groq, TTS, Vision). If not set, endpoints will be accessible without authentication (development mode only).

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
- `GET /api/v1/tts/test` - Test default TTS connection (Kokoro)
- `GET /api/v1/tts/test-elevenlabs?voice=VOICE_ID` - Test ElevenLabs TTS connection for a specific voice

#### Vision/Detection Endpoints (Protected - Requires Bearer Token)

- `POST /api/v1/vision/detect` - Detect objects in an uploaded image using YOLO

**Environment (Kokoro):**

Add the following Kokoro/OpenAI-compatible settings to your `.env`:

```bash
KOKORO_BASE_URL=http://localhost:8880
KOKORO_API_KEY=kokoro-test-key
KOKORO_TIMEOUT=30.0
```

`KOKORO_BASE_URL` should point to your running [Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI) instance (e.g. `http://localhost:8880` when running locally as described in the Kokoro-FastAPI README).

**Example (curl – Kokoro) – text to speech:**

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

**Environment (ElevenLabs):**

Add your ElevenLabs API key to the same `.env`:

```bash
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

**Example (curl – ElevenLabs) – text to speech:**

```bash
curl -X POST "http://localhost:8000/api/v1/tts/speech" \
  -H "Authorization: Bearer your_api_token_here" \
  -H "Content-Type: application/json" \
  --output eleven_output.mp3 \
  -d '{
    "provider": "elevenlabs",
    "model": "eleven_multilingual_v2",
    "input": "Hello from ElevenLabs via the AI Agent TTS endpoint!",
    "voice": "YOUR_ELEVENLABS_VOICE_ID",
    "response_format": "mp3"
  }'
```

**Example (curl – ElevenLabs test endpoint):**

```bash
curl -X GET "http://localhost:8000/api/v1/tts/test-elevenlabs?voice=YOUR_ELEVENLABS_VOICE_ID" \
  -H "Authorization: Bearer your_api_token_here" \
  --output eleven_test.mp3
```

For details on available ElevenLabs models and output formats, see the ElevenLabs docs, and for Kokoro's OpenAI-compatible interface see [`remsky/Kokoro-FastAPI`](https://github.com/remsky/Kokoro-FastAPI), which describes how it exposes `/v1/audio/speech` in an OpenAI-compatible way.

#### Vision/Detection Endpoints

The Vision API allows object detection using a YOLO model. All endpoints require Bearer token authentication.

**Authentication:** All Vision endpoints require a Bearer token in the `Authorization` header:

```bash
Authorization: Bearer your_api_token_here
```

**Example - Object Detection:**

```bash
curl -X POST "http://localhost:8000/api/v1/vision/detect" \
  -H "Authorization: Bearer your_api_token_here" \
  -F "file=@/path/to/your/image.jpg"
```

**Response Format:**

The detection endpoint returns a JSON array of detected objects:

```json
[
  {
    "class_id": 0,
    "class_name": "person",
    "confidence": 0.95,
    "bbox": [100.5, 200.3, 350.7, 450.9]
  },
  {
    "class_id": 2,
    "class_name": "car",
    "confidence": 0.87,
    "bbox": [500.2, 300.1, 800.5, 600.4]
  }
]
```

Where:
- `class_id`: Integer identifier for the detected object class
- `class_name`: Human-readable name of the detected class
- `confidence`: Detection confidence score (0-1)
- `bbox`: Bounding box coordinates `[x1, y1, x2, y2]` in pixels

**Supported Image Formats:** JPEG, PNG

**YOLO Model:** The service uses a custom YOLO model located at `app/weights/best.pt`. Ensure this file exists before starting the service.

### Features

- ✅ **Structured Project Layout**: Follows FastAPI best practices with clear separation of concerns
- ✅ **Configuration Management**: Uses `pydantic-settings` for type-safe environment variable handling
- ✅ **Dependency Injection**: Proper use of FastAPI's dependency injection system
- ✅ **API Versioning**: Organized API structure with version support
- ✅ **Authentication**: Bearer token authentication for protected endpoints
- ✅ **Multi-Provider TTS**: Support for both Kokoro and ElevenLabs text-to-speech services
- ✅ **Object Detection**: YOLO-based computer vision for real-time object detection
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
