# PowerShell script to start the dashboard locally
# This script starts both the backend API and frontend development server

Write-Host "🚀 Starting Delivery Map Analytics Dashboard Locally..." -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = $scriptDir
$backendDir = Join-Path $rootDir "delivery-map-app\backend"
$frontendDir = Join-Path $rootDir "delivery-map-app"

# Function to cleanup background processes
function Cleanup {
    Write-Host ""
    Write-Host "🛑 Shutting down servers..." -ForegroundColor Yellow
    if ($backendProcess -and !$backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($frontendProcess -and !$frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    exit 0
}

# Set up signal handlers
$null = Register-EngineEvent PowerShell.Exiting -Action { Cleanup }

# Check if backend .env exists
if (-not (Test-Path (Join-Path $backendDir ".env"))) {
    Write-Host "❌ Backend .env file not found!" -ForegroundColor Red
    Write-Host "📋 Please create .env file with your ClickHouse credentials:" -ForegroundColor Yellow
    Write-Host "   cd $backendDir" -ForegroundColor Yellow
    Write-Host "   copy env.example .env" -ForegroundColor Yellow
    Write-Host "   # Then edit .env with your actual credentials" -ForegroundColor Yellow
    exit 1
}

# Check if frontend dependencies are installed
if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location $frontendDir
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install frontend dependencies!" -ForegroundColor Red
        exit 1
    }
}

# Start backend
Write-Host "🔧 Starting Backend API..." -ForegroundColor Green
Set-Location $backendDir

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Host "📦 Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Install backend dependencies if needed
if (-not (Test-Path "venv\Lib\site-packages\fastapi")) {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# Start backend in background
$backendProcess = Start-Process -FilePath "python" -ArgumentList "main.py" -WorkingDirectory $backendDir -PassThru -NoNewWindow

# Wait for backend to start
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if backend is running
if ($backendProcess.HasExited) {
    Write-Host "❌ Backend failed to start!" -ForegroundColor Red
    exit 1
}

# Start frontend
Write-Host "🌐 Starting Frontend..." -ForegroundColor Green
Set-Location $frontendDir

# Start frontend in background
$frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $frontendDir -PassThru -NoNewWindow

# Wait for frontend to start
Write-Host "⏳ Waiting for frontend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ Application started successfully!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host "🔧 Backend API: http://localhost:8000" -ForegroundColor Cyan
Write-Host "📊 API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "🌐 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "🛑 Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# Open browser
Start-Process "http://localhost:5173"

# Wait for processes
try {
    Wait-Process -Id $backendProcess.Id, $frontendProcess.Id
} catch {
    Cleanup
}

