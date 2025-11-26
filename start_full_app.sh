#!/bin/bash

echo "🚀 Starting Full Delivery Map Analytics Application..."
echo "====================================================="

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
echo "🔧 Starting Backend API..."
cd /Users/tesfa/Documents/SGL/delivery-map-app/backend

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Backend .env file not found!"
    echo "📋 Please create .env file with your ClickHouse credentials:"
    echo "   cd /Users/tesfa/Documents/SGL/delivery-map-app/backend"
    echo "   cp env.example .env"
    echo "   # Then edit .env with your actual credentials"
    exit 1
fi

# Start backend in background
python3 main.py &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start!"
    exit 1
fi

# Start frontend
echo "🌐 Starting Frontend..."
cd /Users/tesfa/Documents/SGL/delivery-map-app

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start frontend in background
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 3

echo ""
echo "✅ Application started successfully!"
echo "=================================="
echo "🔧 Backend API: http://localhost:8000"
echo "📊 API Docs: http://localhost:8000/docs"
echo "🌐 Frontend: http://localhost:5173"
echo ""
echo "🛑 Press Ctrl+C to stop both servers"
echo ""

# Open browser
open http://localhost:5173

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
