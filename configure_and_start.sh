#!/bin/bash

echo "🔧 Configuring and Starting Delivery Map Analytics..."
echo "===================================================="

# Check if .env exists
BACKEND_ENV="/Users/tesfa/Documents/SGL/delivery-map-app/backend/.env"

if [ ! -f "$BACKEND_ENV" ]; then
    echo "📝 Creating .env file..."
    cp /Users/tesfa/Documents/SGL/delivery-map-app/backend/env.example "$BACKEND_ENV"
fi

echo "⚠️  IMPORTANT: You need to configure your ClickHouse credentials!"
echo ""
echo "Please edit the .env file with your actual ClickHouse settings:"
echo "   nano $BACKEND_ENV"
echo ""
echo "Required values to update:"
echo "   CLICKHOUSE_HOST=your_actual_host"
echo "   CLICKHOUSE_USER=your_actual_username" 
echo "   CLICKHOUSE_PASSWORD=your_actual_password"
echo "   CLICKHOUSE_DATABASE=your_actual_database_name"
echo ""

# Ask user if they want to edit now
read -p "Do you want to edit the .env file now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    nano "$BACKEND_ENV"
fi

echo ""
echo "🔍 Let me check your current .env configuration..."
echo "================================================"

# Show current config (masked)
echo "Current configuration:"
grep -E "CLICKHOUSE_(HOST|USER|DATABASE)" "$BACKEND_ENV" | sed 's/=.*/=***MASKED***/'

echo ""
read -p "Is this configuration correct? (y/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please edit the .env file and run this script again."
    echo "   nano $BACKEND_ENV"
    exit 1
fi

echo ""
echo "🚀 Starting the application..."
echo "============================="

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd /Users/tesfa/Documents/SGL/delivery-map-app/backend

if [ ! -d "venv" ]; then
    echo "🔧 Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "🔧 Activating virtual environment..."
source venv/bin/activate

echo "📦 Installing Python packages..."
pip install -r requirements.txt

# Test ClickHouse connection
echo "🔍 Testing ClickHouse connection..."
python3 -c "
import sys
sys.path.append('.')
from main import get_clickhouse_client
try:
    client = get_clickhouse_client()
    print('✅ ClickHouse connection successful!')
    client.close()
except Exception as e:
    print(f'❌ ClickHouse connection failed: {e}')
    print('Please check your credentials in the .env file')
    sys.exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ ClickHouse connection failed. Please check your credentials."
    exit 1
fi

# Start backend
echo "🌐 Starting backend API..."
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
