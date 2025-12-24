# FreeSight AI

AI-powered navigation assistant for the visually impaired. Uses your smartphone camera to detect obstacles and provide real-time audio guidance.

## Features

- **Real-time Object Detection** - YOLO-based detection identifies objects in your environment
- **AI Navigation Guidance** - LLM generates clear, concise safety instructions
- **Text-to-Speech** - ElevenLabs or browser-based speech synthesis
- **Haptic Feedback** - Vibration patterns indicate danger levels
- **Voice Control** - Hands-free operation with voice commands
- **PWA Support** - Install on your phone for native-like experience

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│    Backend      │────▶│   AI Agent      │
│   React PWA     │     │  Express Gateway│     │    FastAPI      │
│   Port 3000     │     │   Port 8000     │     │   Port 8001     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                       │
                                         ┌─────────────┼─────────────┐
                                         ▼             ▼             ▼
                                    ┌────────┐   ┌─────────┐   ┌─────────┐
                                    │  YOLO  │   │  Groq   │   │ElevenLabs│
                                    │Detection│   │   LLM   │   │   TTS   │
                                    └────────┘   └─────────┘   └─────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose (for containerized deployment)

### Environment Variables

Create a `.env` file in the project root:

```env
# Required
GROQ_API_KEY=your-groq-api-key

# Optional (for better TTS)
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_VOICE_ID=your-voice-id

# Internal
AI_AGENT_TOKEN=demo-token
```

### Development Mode

#### Option 1: Run with script

```bash
# Make sure GROQ_API_KEY is set
export GROQ_API_KEY=your-key

# Run all services
./scripts/dev.sh
```

#### Option 2: Run services manually

```bash
# Terminal 1: AI Agent
cd ai-agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload

# Terminal 2: Backend
cd backend
yarn install
yarn watch:demo

# Terminal 3: Frontend
cd frontend
npm install
npm run dev
```

### Docker Deployment

```bash
# Build and run all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

Access the app at `http://localhost:3000`

## API Endpoints

### Backend Gateway (Port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | Analyze image for obstacles |
| `/api/health` | GET | Health check |
| `/api/ai-agent/health` | GET | Check AI Agent status |

### AI Agent (Port 8001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/analyze/` | POST | Full analysis pipeline |
| `/api/v1/vision/detect` | POST | Object detection only |
| `/api/v1/groq/chat/completions` | POST | LLM chat |
| `/api/v1/tts/speech` | POST | Text-to-speech |
| `/api/v1/health` | GET | Health check |

## Voice Commands

- **"Scan"** - Analyze current view
- **"Stop"** - Stop continuous scanning
- **"Help"** - List available commands
- **"Mute"** / **"Unmute"** - Toggle audio
- **"Repeat"** - Repeat last description

## Project Structure

```
freesight-ai/
├── frontend/           # React PWA
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── hooks/      # Custom React hooks
│   │   └── services/   # API client
│   └── public/         # Static assets & PWA files
├── backend/            # Express gateway
│   └── src/
│       └── index.demo.ts  # Demo mode server
├── ai-agent/           # FastAPI + YOLO + LLM
│   └── app/
│       ├── api/        # API routes
│       ├── services/   # Business logic
│       └── weights/    # YOLO model weights
├── docker-compose.yml  # Container orchestration
└── scripts/           # Development scripts
```

## Technology Stack

- **Frontend**: React 19, Tailwind CSS 4, Vite
- **Backend**: Express 5, TypeScript
- **AI Agent**: FastAPI, YOLO (Ultralytics), Groq, ElevenLabs
- **Deployment**: Docker, Nginx

## License

MIT
