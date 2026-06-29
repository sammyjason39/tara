#!/bin/bash
# Obtain Let's Encrypt certificate for tara.ralali.io and enable HTTPS nginx config.
# Run on the VPS from the tara project root: sudo ./scripts/init-letsencrypt.sh

set -euo pipefail

DOMAIN="${LE_DOMAIN:-tara.ralali.io}"
EMAIL="${LE_EMAIL:-samuel.jason@majubersama.com}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "=== TARA Let's Encrypt setup for ${DOMAIN} ==="

mkdir -p certbot/www

if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  echo "[1/4] Bootstrap nginx (HTTP only) for ACME challenge..."
  cp nginx.bootstrap.conf nginx.active.conf

  docker compose up -d frontend

  echo "[2/4] Installing certbot if needed..."
  if ! command -v certbot >/dev/null 2>&1; then
    apt-get update -qq
    apt-get install -y -qq certbot
  fi

  echo "[3/4] Requesting certificate..."
  certbot certonly --webroot \
    -w "${PROJECT_DIR}/certbot/www" \
    -d "${DOMAIN}" \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --non-interactive
else
  echo "[skip] Certificate already exists for ${DOMAIN}"
fi

echo "[4/4] Enabling HTTPS nginx config..."
cp nginx.conf nginx.active.conf
docker compose up -d frontend

echo ""
echo "=== Done ==="
echo "  https://${DOMAIN}/"
echo "  Webhook: https://${DOMAIN}/api/whatsapp/webhook"
echo ""
echo "Set up auto-renewal:"
echo "  sudo ./scripts/setup-certbot-renew.sh"
