#!/bin/bash
# ==============================================================================
# Zenvix VPS Bootstrap Script
# Run this once on a fresh Ubuntu 24.04 VPS
# Usage: bash vps-bootstrap.sh
# ==============================================================================

set -e

NEW_IP="150.109.15.108"
REPO_URL="https://github.com/clementhansel8891/project-hug.git"
APP_DIR="/home/ubuntu/zenvix"

echo "============================================================"
echo "  🚀 Zenvix VPS Bootstrap — $(date)"
echo "============================================================"

# ── Phase 1: System Update ─────────────────────────────────────
echo ""
echo "📦 [1/6] Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y git curl wget unzip ufw

# ── Phase 2: UFW Firewall ──────────────────────────────────────
echo ""
echo "🔒 [2/6] Configuring UFW firewall..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 9090/tcp    # Cockpit panel
sudo ufw allow 3010/tcp    # Frontend
sudo ufw allow 3001/tcp    # Backend API
sudo ufw --force enable
echo "✅ Firewall configured"
sudo ufw status

# ── Phase 3: Install Cockpit Panel ────────────────────────────
echo ""
echo "🖥️ [3/6] Installing Cockpit panel..."
sudo apt-get install -y cockpit
sudo systemctl enable --now cockpit.socket
echo "✅ Cockpit installed — access at http://${NEW_IP}:9090"

# ── Phase 4: Install Docker ───────────────────────────────────
echo ""
echo "🐳 [4/6] Installing Docker..."
# Remove old versions if any
sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Install using official method
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu
echo "✅ Docker installed: $(docker --version)"
echo "✅ Docker Compose: $(docker compose version)"

# ── Phase 5: Clone Repo ────────────────────────────────────────
echo ""
echo "📁 [5/6] Cloning Zenvix repository..."
if [ -d "$APP_DIR" ]; then
    echo "⚠️  Directory exists, removing and re-cloning..."
    rm -rf "$APP_DIR"
fi
git clone "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

# Create .env file
echo ""
echo "⚙️  Writing .env configuration..."
cat > .env << 'ENVEOF'
POSTGRES_USER=zenvix
POSTGRES_PASSWORD=zenvix_secure_2026!
POSTGRES_DB=zenvix_prod
DATABASE_URL="postgresql://zenvix:zenvix_secure_2026!@db:5432/zenvix_prod?schema=public"
COMPOSE_PROJECT_NAME=bfs
NODE_ENV=production
STRIPE_SECRET_KEY=sk_test_zenvix_placeholder
STRIPE_WEBHOOK_SECRET=whsec_zenvix_placeholder
FRONTEND_URL=http://150.109.15.108:3010
VITE_API_URL=http://150.109.15.108:3001
PORT=3001
RUNTIME=docker
PERSISTENCE_MODE=db
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE
ENVEOF

echo "✅ .env file written"

# Create required directories
mkdir -p logs backups
chmod 777 logs

# ── Phase 6: Docker Build & Launch ────────────────────────────
echo ""
echo "🚀 [6/6] Building and launching Docker containers..."
chmod +x vps-up.sh

# Use newgrp to apply docker group without logout
sudo -u ubuntu bash -c "cd $APP_DIR && docker compose up -d --build"

echo ""
echo "⏳ Waiting 30 seconds for services to be healthy..."
sleep 30

# Run Prisma migrations
echo ""
echo "🗄️  Running Prisma database migrations..."
sudo -u ubuntu bash -c "docker exec bfs-backend npx prisma migrate deploy" || echo "⚠️  Migration may have already run or backend is still starting up. Check: docker logs bfs-backend"

echo ""
echo "============================================================"
echo "✅ BOOTSTRAP COMPLETE — $(date)"
echo ""
echo "  🖥️  Zenvix App  : http://${NEW_IP}:3010"
echo "  ⚙️  Backend API : http://${NEW_IP}:3001"
echo "  🔧  Cockpit     : http://${NEW_IP}:9090"
echo ""
echo "  📊 Container status:"
sudo -u ubuntu bash -c "cd $APP_DIR && docker compose ps"
echo "============================================================"
