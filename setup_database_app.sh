#!/bin/bash

echo "🔧 Setting up Delivery Map Analytics with Database Integration..."
echo "=============================================================="

# Create backend .env file if it doesn't exist
BACKEND_ENV="/Users/tesfa/Documents/SGL/delivery-map-app/backend/.env"

if [ ! -f "$BACKEND_ENV" ]; then
    echo "📝 Creating backend .env file..."
    cp /Users/tesfa/Documents/SGL/delivery-map-app/backend/env.example "$BACKEND_ENV"
    
    echo ""
    echo "⚠️  IMPORTANT: Please edit the .env file with your ClickHouse credentials:"
    echo "   nano $BACKEND_ENV"
    echo ""
    echo "Required values:"
    echo "   CLICKHOUSE_HOST=your_clickhouse_host"
    echo "   CLICKHOUSE_PORT_STR=8123"
    echo "   CLICKHOUSE_USER=your_username"
    echo "   CLICKHOUSE_PASSWORD=your_password"
    echo "   CLICKHOUSE_DATABASE=your_database_name"
    echo "   CLICKHOUSE_SECURE_STR=false"
    echo "   CLICKHOUSE_VERIFY_STR=false"
    echo ""
    read -p "Press Enter after you've updated the .env file..."
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

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd /Users/tesfa/Documents/SGL/delivery-map-app

if [ ! -d "node_modules" ]; then
    npm install
fi

echo ""
echo "✅ Setup complete!"
echo "=================="
echo ""
echo "🚀 To start the application:"
echo "   ./start_full_app.sh"
echo ""
echo "🔧 To start only backend:"
echo "   ./start_backend.sh"
echo ""
echo "🌐 To start only frontend:"
echo "   cd delivery-map-app && npm run dev"
echo ""
echo "📊 API Documentation will be available at:"
echo "   http://localhost:8000/docs"
echo ""
echo "🗺️  Application will be available at:"
echo "   http://localhost:5173"
