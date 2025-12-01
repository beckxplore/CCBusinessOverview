# Docker Deployment Guide

This guide explains how to build and deploy the Delivery Map Analytics application using Docker.

## Prerequisites

- Docker installed and running
- Docker Compose installed (optional, for easier local development)
- GitHub account (for pushing to GitHub Container Registry)

## Project Structure

The application is containerized as a single Docker image containing:
- **Frontend**: React/Vite application (built and served as static files)
- **Backend**: Python FastAPI application
- **Data**: CSV files from `data_points/` directory

## Building the Docker Image

### Option 1: Using the Build Script (Recommended)

**On Linux/Mac:**
```bash
chmod +x build-and-push.sh
./build-and-push.sh [version]
```

**On Windows (PowerShell):**
```powershell
.\build-and-push.ps1 [version]
```

### Option 2: Manual Build

```bash
# Build the image
docker build -t delivery-map-analytics:latest .

# Or with a specific version
docker build -t delivery-map-analytics:v1.0.0 .
```

## Running with Docker Compose

1. **Create a `.env` file** in the project root with your environment variables:
```env
CLICKHOUSE_HOST=64.227.129.135
CLICKHOUSE_PORT_STR=8123
CLICKHOUSE_USER=chipchip
CLICKHOUSE_PASSWORD=your_password
CLICKHOUSE_DATABASE=chipchip
CLICKHOUSE_SECURE_STR=false
CLICKHOUSE_VERIFY_STR=false
```

2. **Start the application:**
```bash
docker-compose up -d
```

3. **View logs:**
```bash
docker-compose logs -f
```

4. **Stop the application:**
```bash
docker-compose down
```

## Running with Docker (without Compose)

```bash
docker run -d \
  --name delivery-map-analytics \
  -p 8000:8000 \
  -e CLICKHOUSE_HOST=64.227.129.135 \
  -e CLICKHOUSE_PORT_STR=8123 \
  -e CLICKHOUSE_USER=chipchip \
  -e CLICKHOUSE_PASSWORD=your_password \
  -e CLICKHOUSE_DATABASE=chipchip \
  delivery-map-analytics:latest
```

## Pushing to GitHub Container Registry

1. **Login to GitHub Container Registry:**
```bash
docker login ghcr.io -u YOUR_GITHUB_USERNAME
# Enter your GitHub Personal Access Token when prompted
```

2. **Tag the image:**
```bash
docker tag delivery-map-analytics:latest ghcr.io/beckxplore/delivery-map-analytics:latest
```

3. **Push the image:**
```bash
docker push ghcr.io/beckxplore/delivery-map-analytics:latest
```

### Creating a GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with `write:packages` permission
3. Use this token when logging in to `ghcr.io`

## Accessing the Application

Once running, access the application at:
- **Frontend**: http://localhost:8000
- **API Health Check**: http://localhost:8000/api/health
- **API Docs**: http://localhost:8000/docs

## Environment Variables

All environment variables can be set in:
- `.env` file (for docker-compose)
- Docker run command with `-e` flags
- Docker Compose `environment` section

See `docker-compose.yml` for the complete list of available environment variables.

## Troubleshooting

### Port Already in Use
If port 8000 is already in use, change it in `docker-compose.yml`:
```yaml
ports:
  - "8080:8000"  # Use port 8080 on host
```

### Database Connection Issues
- Verify ClickHouse is accessible from your network
- Check firewall rules
- Ensure environment variables are set correctly

### Frontend Not Loading
- Check that the frontend build exists in `delivery-map-app/dist/`
- Verify the Dockerfile copied the frontend build correctly
- Check container logs: `docker-compose logs delivery-map-app`

## Updating the Image

After making code changes:

1. **Rebuild the image:**
```bash
docker-compose build
```

2. **Restart the container:**
```bash
docker-compose up -d
```

Or rebuild and restart in one command:
```bash
docker-compose up -d --build
```

## Production Deployment

For production, consider:
- Using a reverse proxy (nginx) in front of the application
- Setting up SSL/TLS certificates
- Using environment-specific configuration
- Setting up proper logging and monitoring
- Using a container orchestration platform (Kubernetes, Docker Swarm, etc.)

