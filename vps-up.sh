#!/bin/bash

# Professional Deployment Script for Business Flow Suite
# Ensures a clean and tidy environment on the VPS

echo "🚀 Starting Professional Deployment..."

# 1. Start the containers
echo "📦 Building and starting containers..."
docker compose up -d --build --remove-orphans

# 2. Cleanup dangling resources (Professional Tidy)
echo "🧹 Cleaning up old images and dangling volumes..."
docker image prune -f
docker network prune -f

# 3. Verify status
echo "📊 Current Status:"
docker compose ps

echo "✅ Deployment complete!"
echo "Frontend: http://43.156.118.56:3010"
echo "Backend:  http://43.156.118.56:3001"
