#!/bin/bash

echo "🚀 Starting Delivery Map Analytics Application..."
echo "================================================"

# Navigate to the app directory
cd /Users/tesfa/Documents/SGL/delivery-map-app

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the development server
echo "🌐 Starting development server..."
echo "📍 Application will be available at: http://localhost:5173"
echo "🔄 Opening in browser..."
echo ""

# Start the server in background and open browser
npm run dev &
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Open browser
open http://localhost:5173

echo "✅ Server started successfully!"
echo "🛑 Press Ctrl+C to stop the server"
echo ""

# Wait for user to stop
wait $SERVER_PID
