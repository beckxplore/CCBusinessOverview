#!/bin/bash

echo "🚀 Starting Delivery Map Analytics Backend..."
echo "============================================="

# Navigate to backend directory
cd /Users/tesfa/Documents/SGL/delivery-map-app/backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "📋 Please create .env file with your ClickHouse credentials:"
    echo "   cp env.example .env"
    echo "   # Then edit .env with your actual credentials"
    echo ""
    echo "Example .env content:"
    echo "CLICKHOUSE_HOST=your_host"
    echo "CLICKHOUSE_PORT_STR=8123"
    echo "CLICKHOUSE_USER=your_username"
    echo "CLICKHOUSE_PASSWORD=your_password"
    echo "CLICKHOUSE_DATABASE=your_database"
    echo "CLICKHOUSE_SECURE_STR=false"
    echo "CLICKHOUSE_VERIFY_STR=false"
    exit 1
fi

# Start the backend server
echo "🌐 Starting FastAPI server on http://localhost:8000"
echo "📊 API Documentation available at: http://localhost:8000/docs"
echo "🛑 Press Ctrl+C to stop the server"
echo ""

python main.py
