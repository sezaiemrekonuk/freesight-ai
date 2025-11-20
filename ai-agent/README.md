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
│   └── groq_client.py     # Groq API client
└── main.py                # Application entry point
```

### Setup

1. Create a virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Create a `.env` file in the project root (see `.env.example` for reference):
   ```bash
   GROQ_API_KEY=your_groq_api_key_here
   DEBUG=false
   ENVIRONMENT=development
   ```

3. Run the FastAPI server with Uvicorn:
   ```bash
   uvicorn app.main:app --reload
   ```

### API Endpoints

The service exposes the following endpoints:

#### System Endpoints
- `GET /api/v1/` - Root endpoint
- `GET /api/v1/health` - Health check

#### Groq Endpoints
- `POST /api/v1/groq/chat/completions` - Chat completion
- `GET /api/v1/groq/test` - Test Groq connection

### Features

- ✅ **Structured Project Layout**: Follows FastAPI best practices with clear separation of concerns
- ✅ **Configuration Management**: Uses `pydantic-settings` for type-safe environment variable handling
- ✅ **Dependency Injection**: Proper use of FastAPI's dependency injection system
- ✅ **API Versioning**: Organized API structure with version support
- ✅ **Lifecycle Management**: Proper startup/shutdown handling for resources
- ✅ **Type Safety**: Full type hints and Pydantic models throughout
- ✅ **Error Handling**: Comprehensive error handling with proper HTTP status codes
