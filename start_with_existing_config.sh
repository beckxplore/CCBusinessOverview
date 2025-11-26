#!/bin/bash

echo "🚀 Starting Delivery Map Analytics with existing ClickHouse config..."
echo "=================================================================="

# Check if clickhouse_connectivity.py exists
if [ ! -f "/Users/tesfa/Documents/SGL/clickhouse_connectivity.py" ]; then
    echo "❌ clickhouse_connectivity.py not found!"
    echo "Please make sure it exists in /Users/tesfa/Documents/SGL/"
    exit 1
fi

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

# Test ClickHouse connection using existing config
echo "🔍 Testing ClickHouse connection with existing config..."
python3 -c "
import sys
sys.path.append('/Users/tesfa/Documents/SGL')
from clickhouse_connectivity import get_clickhouse_client
try:
    client = get_clickhouse_client()
    print('✅ ClickHouse connection successful!')
    client.close()
except Exception as e:
    print(f'❌ ClickHouse connection failed: {e}')
    print('Please check your .env file in the SGL directory')
    sys.exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ ClickHouse connection failed. Please check your .env file."
    exit 1
fi

# Start backend using the simple version
echo "🌐 Starting backend API..."
python3 main_simple.py &
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
curl -s http://localhost:8000/api/health > /dev/null
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
