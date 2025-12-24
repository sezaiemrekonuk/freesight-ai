#!/bin/bash

# FreeSight Development Script
# Starts all services for local development

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🚀 Starting FreeSight Development Environment..."
echo ""

# Check for required environment variables
if [ -z "$GROQ_API_KEY" ]; then
    echo "⚠️  Warning: GROQ_API_KEY not set. LLM features won't work."
    echo "   Set it with: export GROQ_API_KEY=your-key"
    echo ""
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    jobs -p | xargs -r kill 2>/dev/null || true
    exit 0
}
trap cleanup INT TERM

# Start AI Agent
echo "🤖 Starting AI Agent (port 8001)..."
cd "$PROJECT_ROOT/ai-agent"

# Check if venv exists, create if not
if [ ! -d ".venv" ]; then
    echo "   Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate and install deps
source .venv/bin/activate
if [ ! -f ".venv/.installed" ]; then
    echo "   Installing Python dependencies (this may take a minute)..."
    pip install --quiet -r requirements.txt
    touch .venv/.installed
fi

# Start uvicorn in background with output
GROQ_API_KEY="$GROQ_API_KEY" uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload 2>&1 | sed 's/^/   [AI-Agent] /' &
AI_PID=$!

# Wait a bit for AI Agent to initialize
echo "   Waiting for AI Agent to start..."
sleep 5

# Check if AI Agent is responding
if curl -s http://localhost:8001/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ AI Agent is running"
else
    echo "   ⚠️  AI Agent may still be loading..."
fi

# Start Backend Gateway
echo ""
echo "🔗 Starting Backend Gateway (port 8000)..."
cd "$PROJECT_ROOT/backend"

# Install deps if needed
if [ ! -d "node_modules" ]; then
    echo "   Installing Node dependencies..."
    yarn install --silent
fi

# Start backend
AI_AGENT_URL="http://localhost:8001" AI_AGENT_TOKEN="demo-token" yarn watch:demo 2>&1 | sed 's/^/   [Backend] /' &
BACKEND_PID=$!

# Wait for backend
sleep 3

# Check if Backend is responding
if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "   ✅ Backend Gateway is running"
else
    echo "   ⚠️  Backend may still be loading..."
fi

# Start Frontend
echo ""
echo "🎨 Starting Frontend (port 5173)..."
cd "$PROJECT_ROOT/frontend"

# Install deps if needed
if [ ! -d "node_modules" ]; then
    echo "   Installing Node dependencies..."
    npm install --silent
fi

# Start frontend
VITE_API_BASE_URL="http://localhost:8000" npm run dev 2>&1 | sed 's/^/   [Frontend] /' &
FRONTEND_PID=$!

# Wait for frontend
sleep 3

echo ""
echo "============================================"
echo "✅ All services started!"
echo ""
echo "📱 Frontend:      http://localhost:5173"
echo "🔗 Backend:       http://localhost:8000"
echo "🤖 AI Agent:      http://localhost:8001"
echo "📚 API Docs:      http://localhost:8001/docs"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for all background processes
wait
