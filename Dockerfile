# Stage 1: Build the Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/delivery-map-app
COPY delivery-map-app/package*.json ./
RUN npm ci
COPY delivery-map-app/ ./
RUN npm run build

# Stage 2: Build the Backend and Final Image
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies for scientific Python packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY delivery-map-app/backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Maintain directory structure depth so Path(__file__).parents[2] works
# Dev: repo_root/delivery-map-app/backend/main.py -> parents[2] is repo_root
# Docker: /app/delivery-map-app/backend/main.py -> parents[2] is /app
COPY delivery-map-app/backend/ ./delivery-map-app/backend/
COPY data_points/ ./data_points/

# Copy built frontend to the location expected by main.py
# main.py looks for: Path(__file__).parent.parent / "frontend" / "dist"
# In Docker, this resolve to: /app/delivery-map-app/frontend/dist
COPY --from=frontend-builder /app/delivery-map-app/dist ./delivery-map-app/frontend/dist

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV FRONTEND_DIST_OVERRIDE=/app/delivery-map-app/frontend/dist

# Expose the application port
EXPOSE 8000

# Set working directory to backend for execution
WORKDIR /app/delivery-map-app/backend

# Use httpx for a reliable health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/api/health').raise_for_status()" || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]