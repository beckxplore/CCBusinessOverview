#!/bin/bash

# Build and Push Docker Image Script
# This script builds the Docker image and pushes it to GitHub Container Registry

set -e

# Configuration
IMAGE_NAME="delivery-map-analytics"
GITHUB_USERNAME="beckxplore"
GITHUB_REPO="CCBusinessOverview"
VERSION=${1:-latest}

# Full image name for GitHub Container Registry
FULL_IMAGE_NAME="ghcr.io/${GITHUB_USERNAME}/${IMAGE_NAME}:${VERSION}"

echo "Building Docker image: ${FULL_IMAGE_NAME}"

# Build the Docker image
docker build -t ${FULL_IMAGE_NAME} -t ${IMAGE_NAME}:latest .

echo "Build complete!"
echo ""
echo "To push to GitHub Container Registry, run:"
echo "  docker login ghcr.io -u ${GITHUB_USERNAME}"
echo "  docker push ${FULL_IMAGE_NAME}"
echo "  docker push ghcr.io/${GITHUB_USERNAME}/${IMAGE_NAME}:latest"
echo ""
echo "Or use docker-compose to run locally:"
echo "  docker-compose up -d"

