# Build and Push Docker Image Script (PowerShell)
# This script builds the Docker image and pushes it to GitHub Container Registry

param(
    [string]$Version = "latest"
)

$ErrorActionPreference = "Stop"

# Configuration
$ImageName = "delivery-map-analytics"
$GitHubUsername = "beckxplore"
$GitHubRepo = "CCBusinessOverview"

# Full image name for GitHub Container Registry
$FullImageName = "ghcr.io/${GitHubUsername}/${ImageName}:${Version}"

Write-Host "Building Docker image: ${FullImageName}" -ForegroundColor Green

# Build the Docker image
docker build -t ${FullImageName} -t "${ImageName}:latest" .

Write-Host "Build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To push to GitHub Container Registry, run:" -ForegroundColor Yellow
Write-Host "  docker login ghcr.io -u ${GitHubUsername}"
Write-Host "  docker push ${FullImageName}"
Write-Host "  docker push ghcr.io/${GitHubUsername}/${ImageName}:latest"
Write-Host ""
Write-Host "Or use docker-compose to run locally:" -ForegroundColor Yellow
Write-Host "  docker-compose up -d"

