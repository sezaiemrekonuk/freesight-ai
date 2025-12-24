@echo off
REM FreeSight Development Script (Batch)
REM Starts all services for local development

setlocal enabledelayedexpansion

cd /d "%~dp0\.."
set PROJECT_ROOT=%CD%

echo ========================================
echo   FreeSight Development Environment
echo ========================================
echo.

REM Check for GROQ_API_KEY
if "%GROQ_API_KEY%"=="" (
    echo [WARNING] GROQ_API_KEY not set. LLM features won't work.
    echo           Set it with: set GROQ_API_KEY=your-key
    echo.
)

echo [1/3] Starting AI Agent...
cd "%PROJECT_ROOT%\ai-agent"

REM Create venv if it doesn't exist
if not exist ".venv" (
    echo       Creating virtual environment...
    python -m venv .venv
)

REM Install dependencies if needed
if not exist ".venv\.installed" (
    echo       Installing Python dependencies...
    .venv\Scripts\python.exe -m pip install --quiet -r requirements.txt
    type nul > .venv\.installed
)

REM Start AI Agent in new window
start "FreeSight AI Agent" cmd /k "cd /d %PROJECT_ROOT%\ai-agent && .venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"

echo       AI Agent starting on port 8001...
timeout /t 8 /nobreak >nul

echo [2/3] Starting Backend Gateway...
cd "%PROJECT_ROOT%\backend"

REM Install dependencies if needed
if not exist "node_modules" (
    echo       Installing Node dependencies...
    call yarn install
)

REM Start Backend in new window
start "FreeSight Backend" cmd /k "cd /d %PROJECT_ROOT%\backend && set AI_AGENT_URL=http://localhost:8001 && set AI_AGENT_TOKEN=demo-token && yarn watch:demo"

echo       Backend Gateway starting on port 8000...
timeout /t 5 /nobreak >nul

echo [3/3] Starting Frontend...
cd "%PROJECT_ROOT%\frontend"

REM Install dependencies if needed
if not exist "node_modules" (
    echo       Installing Node dependencies...
    call npm install
)

REM Start Frontend in new window
start "FreeSight Frontend" cmd /k "cd /d %PROJECT_ROOT%\frontend && set VITE_API_BASE_URL=http://localhost:8000 && npm run dev"

echo       Frontend starting on port 5173...
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   All services started!
echo ========================================
echo.
echo   Frontend:      http://localhost:5173
echo   Backend:       http://localhost:8000
echo   AI Agent:      http://localhost:8001
echo   API Docs:      http://localhost:8001/docs
echo.
echo ========================================
echo.
echo Press any key to exit (services will keep running in separate windows)
pause >nul

