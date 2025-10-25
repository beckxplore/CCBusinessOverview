#!/bin/bash

echo "🏗️ Building Delivery Map Analytics for Production..."
echo "=================================================="

# Navigate to the app directory
cd /Users/tesfa/Documents/SGL/delivery-map-app

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the application
echo "🔨 Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Built files are in the 'dist' directory"
    echo "🌐 To preview the production build, run: npm run preview"
    echo ""
    echo "🚀 To deploy:"
    echo "   - Copy the 'dist' folder to your web server"
    echo "   - Ensure 'data.csv' is accessible at /data.csv"
    echo "   - Configure your server to serve the files"
else
    echo "❌ Build failed! Check the errors above."
    exit 1
fi
