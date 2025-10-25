#!/bin/bash

echo "🚀 Starting Delivery Map Analytics (CSV Fallback Mode)..."
echo "======================================================="

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend
echo "🔧 Starting Backend API (CSV Fallback)..."
cd /Users/tesfa/Documents/SGL/delivery-map-app/backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

echo "🔧 Activating virtual environment..."
source venv/bin/activate

echo "📦 Installing Python packages..."
pip install -r requirements.txt

# Start backend in background
python3 main_csv_fallback.py &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start!"
    exit 1
fi

# Test API
echo "🔍 Testing API..."
curl -s http://localhost:8002/api/health > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Backend API is running!"
else
    echo "❌ Backend API is not responding!"
    exit 1
fi

# Start frontend
echo "🌐 Starting frontend..."
cd /Users/tesfa/Documents/SGL/delivery-map-app

if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start frontend
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 3

echo ""
echo "✅ Application started successfully!"
echo "=================================="
echo "🔧 Backend API: http://localhost:8002"
echo "📊 API Docs: http://localhost:8002/docs"
echo "🌐 Frontend: http://localhost:5173"
echo ""
echo "📝 Note: Using CSV data fallback (ClickHouse not configured)"
echo "🛑 Press Ctrl+C to stop both servers"
echo ""

# Open browser
open http://localhost:5173

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
