## AI Agent Service

### Setup
1. Create a virtual environment and install dependencies:
   ```bash
   cd /Users/sezaiemrekonuk/Desktop/freesight-ai/ai-agent
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. Run the FastAPI server with Uvicorn:
   ```bash
   uvicorn app.main:app --reload
   ```

The service exposes a root endpoint at `/` and a health check at `/health`.
