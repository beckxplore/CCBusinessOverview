# Multi-stage Dockerfile for Delivery Map Analytics App
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY delivery-map-app/package*.json ./
COPY delivery-map-app/vite.config.ts ./
COPY delivery-map-app/tsconfig*.json ./
COPY delivery-map-app/postcss.config.js ./
COPY delivery-map-app/tailwind.config.js ./
COPY delivery-map-app/eslint.config.js ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source code
COPY delivery-map-app/src ./src
COPY delivery-map-app/index.html ./
COPY delivery-map-app/public ./public

# Build frontend
RUN npm run build

# Stage 2: Python backend with frontend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY delivery-map-app/backend/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY delivery-map-app/backend ./backend

# Copy data_points directory (needed for CSV files)
COPY data_points ./data_points

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 8000

# Environment variables (can be overridden in docker-compose)
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/api/health')" || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

