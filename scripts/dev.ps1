# FreeSight Development Script (PowerShell)
# Starts all services for local development

$ErrorActionPreference = "Stop"

$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot

Write-Host "🚀 Starting FreeSight Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Check for required environment variables
if (-not $env:GROQ_API_KEY) {
    Write-Host "⚠️  Warning: GROQ_API_KEY not set. LLM features won't work." -ForegroundColor Yellow
    Write-Host "   Set it with: `$env:GROQ_API_KEY='your-key'" -ForegroundColor Yellow
    Write-Host ""
}

# Store process IDs for cleanup
$script:AIProcess = $null
$script:BackendProcess = $null
$script:FrontendProcess = $null

# Function to cleanup on exit
function Cleanup {
    Write-Host ""
    Write-Host "🛑 Stopping all services..." -ForegroundColor Yellow
    
    if ($script:AIProcess -and !$script:AIProcess.HasExited) {
        Stop-Process -Id $script:AIProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($script:BackendProcess -and !$script:BackendProcess.HasExited) {
        Stop-Process -Id $script:BackendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($script:FrontendProcess -and !$script:FrontendProcess.HasExited) {
        Stop-Process -Id $script:FrontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    # Kill any remaining node/python processes on our ports
    Get-NetTCPConnection -LocalPort 8001,8000,5173 -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "✅ All services stopped" -ForegroundColor Green
    exit 0
}

# Register cleanup on Ctrl+C
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup } | Out-Null
try {
    # Start AI Agent
    Write-Host "🤖 Starting AI Agent (port 8001)..." -ForegroundColor Cyan
    Push-Location "$PROJECT_ROOT\ai-agent"
    
    # Check if venv exists, create if not
    if (-not (Test-Path ".venv")) {
        Write-Host "   Creating virtual environment..." -ForegroundColor Gray
        python -m venv .venv
    }
    
    # Activate and install deps
    $venvActivate = ".venv\Scripts\Activate.ps1"
    if (-not (Test-Path ".venv\.installed")) {
        Write-Host "   Installing Python dependencies (this may take a minute)..." -ForegroundColor Gray
        & .venv\Scripts\python.exe -m pip install --quiet -r requirements.txt
        New-Item -Path ".venv\.installed" -ItemType File -Force | Out-Null
    }
    
    # Start uvicorn in background
    $env:GROQ_API_KEY = $env:GROQ_API_KEY
    $script:AIProcess = Start-Process -FilePath ".venv\Scripts\python.exe" `
        -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload" `
        -WindowStyle Hidden `
        -PassThru
    
    Pop-Location
    
    # Wait for AI Agent to initialize
    Write-Host "   Waiting for AI Agent to start..." -ForegroundColor Gray
    Start-Sleep -Seconds 8
    
    # Check if AI Agent is responding
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/api/v1/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        Write-Host "   ✅ AI Agent is running" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  AI Agent may still be loading..." -ForegroundColor Yellow
    }
    
    # Start Backend Gateway
    Write-Host ""
    Write-Host "🔗 Starting Backend Gateway (port 8000)..." -ForegroundColor Cyan
    Push-Location "$PROJECT_ROOT\backend"
    
    # Install deps if needed
    if (-not (Test-Path "node_modules")) {
        Write-Host "   Installing Node dependencies..." -ForegroundColor Gray
        yarn install --silent
    }
    
    # Start backend
    $env:AI_AGENT_URL = "http://localhost:8001"
    $env:AI_AGENT_TOKEN = "demo-token"
    $script:BackendProcess = Start-Process -FilePath "yarn" `
        -ArgumentList "watch:demo" `
        -WindowStyle Hidden `
        -PassThru
    
    Pop-Location
    
    # Wait for backend
    Start-Sleep -Seconds 5
    
    # Check if Backend is responding
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        Write-Host "   ✅ Backend Gateway is running" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Backend may still be loading..." -ForegroundColor Yellow
    }
    
    # Start Frontend
    Write-Host ""
    Write-Host "🎨 Starting Frontend (port 5173)..." -ForegroundColor Cyan
    Push-Location "$PROJECT_ROOT\frontend"
    
    # Install deps if needed
    if (-not (Test-Path "node_modules")) {
        Write-Host "   Installing Node dependencies..." -ForegroundColor Gray
        npm install --silent
    }
    
    # Start frontend
    $env:VITE_API_BASE_URL = "http://localhost:8000"
    $script:FrontendProcess = Start-Process -FilePath "npm" `
        -ArgumentList "run", "dev" `
        -WindowStyle Hidden `
        -PassThru
    
    Pop-Location
    
    # Wait for frontend
    Start-Sleep -Seconds 4
    
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "✅ All services started!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 Frontend:      http://localhost:5173"
    Write-Host "🔗 Backend:       http://localhost:8000"
    Write-Host "🤖 AI Agent:      http://localhost:8001"
    Write-Host "📚 API Docs:      http://localhost:8001/docs"
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
    Write-Host ""
    
    # Keep script running and wait for user interrupt
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Check if any process has died
        if ($script:AIProcess.HasExited) {
            Write-Host "⚠️  AI Agent has stopped unexpectedly!" -ForegroundColor Red
            break
        }
        if ($script:BackendProcess.HasExited) {
            Write-Host "⚠️  Backend has stopped unexpectedly!" -ForegroundColor Red
            break
        }
        if ($script:FrontendProcess.HasExited) {
            Write-Host "⚠️  Frontend has stopped unexpectedly!" -ForegroundColor Red
            break
        }
    }
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
} finally {
    Cleanup
}

