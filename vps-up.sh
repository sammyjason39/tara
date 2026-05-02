#!/bin/bash

# Professional Deployment Script for Business Flow Suite
# Ensures a clean and tidy environment on the VPS

# Set working directory to script location
cd "$(dirname "$0")"

echo "===================================================="
echo "🚀 Starting Professional Deployment: $(date)"
echo "===================================================="

# 1. Setup host environment
echo "📁 Ensuring log directories exist..."
mkdir -p logs
chmod 777 logs

# 2. Start the containers
echo "📦 Building and starting containers (no-cache to ensure fresh build)..."
if docker compose build --no-cache && docker compose up -d --remove-orphans; then
    echo "✅ Containers started successfully."
else
    echo "❌ Failed to start containers."
    exit 1
fi

# 3. Cleanup dangling resources (Professional Tidy)
echo "🧹 Cleaning up old images and dangling volumes..."
docker image prune -f
docker network prune -f

# 4. Verify status
echo "📊 Current Status:"
docker compose ps

echo "===================================================="
echo "✅ Deployment complete at $(date)"
echo "Frontend: http://150.109.15.108:3010"
echo "Backend:  http://150.109.15.108:3001"
echo "===================================================="
