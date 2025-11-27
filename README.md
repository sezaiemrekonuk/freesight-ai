## freesight ai

### Introduction
freesight ai is an application that helps people who visually impaired to recognize environment in real time.

### Running the stack with Docker

This project has two services:
- **backend**: Node/Express API (port `8000`)
- **ai-agent**: FastAPI AI Agent service (port `8001`)

Both services can be started together using Docker Compose from the repository root (`freesight-ai`).

#### Prerequisites
- Docker and Docker Compose installed
- A `.env` file for each service:
  - `backend/.env` – API configuration, database, Redis, etc.
  - `ai-agent/.env` – keys and config (e.g. `GROQ_API_KEY`, `API_TOKEN`, `KOKORO_*`, `ELEVENLABS_API_KEY`, etc.)

#### Build and run both services

From the root folder:

```bash
cd /Users/sezaiemrekonuk/Desktop/freesight-ai
docker compose up --build
```

This will:
- Build and start **backend** on `http://localhost:8000`
- Build and start **ai-agent** on `http://localhost:8001`

Logs for both containers will stream in the same terminal.

#### Stopping the services

In the same folder, stop and remove the containers with:

```bash
docker compose down
```

You can then re-run `docker compose up --build` whenever you need to start the stack again.

