#!/usr/bin/env bash
# Bootstrap staging on the TARA VPS (production stays running).
# Run from your laptop:
#   bash scripts/setup-staging-vps.sh
#
# Or on the VPS after rsync:
#   bash scripts/setup-staging-vps.sh --on-server

set -euo pipefail

SSH_HOST="${TARA_SSH_HOST:-ubuntu@rll-tara-agentic-tencent.tail5edd98.ts.net}"
SSH_KEY="${TARA_SSH_KEY:-$HOME/.ssh/id_ed25519}"
SSH_OPTS=(-i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new)
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROD_DIR="${TARA_PROD_DIR:-/home/ubuntu/tara}"
STAGING_DIR="${TARA_STAGING_DIR:-/home/ubuntu/tara-staging}"
STAGING_DOMAIN="${TARA_STAGING_DOMAIN:-staging.tara.ralali.io}"

REMOTE_SCRIPT=$(cat <<'REMOTE_EOF'
set -euo pipefail
PROD_DIR="__PROD_DIR__"
STAGING_DIR="__STAGING_DIR__"
STAGING_DOMAIN="__STAGING_DOMAIN__"

echo "==> Creating shared Docker network (idempotent)"
sudo docker network inspect tara_shared >/dev/null 2>&1 || sudo docker network create tara_shared

echo "==> Preparing staging directory"
mkdir -p "$STAGING_DIR"

if [[ ! -f "$STAGING_DIR/.env" ]]; then
  echo "==> Creating staging .env from production"
  STAGING_DB_PASS="$(openssl rand -hex 16)"
  STAGING_JWT="$(openssl rand -hex 32)"
  cp "$PROD_DIR/.env" "$STAGING_DIR/.env"
  sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=${STAGING_DB_PASS}/" "$STAGING_DIR/.env"
  sed -i 's/^DB_PORT=.*/DB_PORT=5433/' "$STAGING_DIR/.env"
  sed -i 's/^REDIS_PORT=.*/REDIS_PORT=6380/' "$STAGING_DIR/.env"
  sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${STAGING_JWT}/" "$STAGING_DIR/.env"
  sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://${STAGING_DOMAIN},http://${STAGING_DOMAIN}|" "$STAGING_DIR/.env"
  sed -i "s|^VITE_API_URL=.*|VITE_API_URL=https://${STAGING_DOMAIN}|" "$STAGING_DIR/.env"
  sed -i 's/^SEED_ON_START=.*/SEED_ON_START=false/' "$STAGING_DIR/.env"
  grep -q '^SEED_ON_START=' "$STAGING_DIR/.env" || echo 'SEED_ON_START=false' >> "$STAGING_DIR/.env"
  sed -i '/^FRONTEND_PORT=/d' "$STAGING_DIR/.env"
  sed -i '/^FRONTEND_SSL_PORT=/d' "$STAGING_DIR/.env"
  sed -i '/^BACKEND_PORT=/d' "$STAGING_DIR/.env"
fi

echo "==> Prod nginx edge override for staging vhost (does not change prod app config)"
cp "$STAGING_DIR/docker-compose.staging-edge.yml" "$PROD_DIR/docker-compose.staging-edge.yml"

if [[ ! -f "$PROD_DIR/nginx.staging-vhost.conf" ]]; then
  cp "$STAGING_DIR/nginx.staging-bootstrap.conf" "$PROD_DIR/nginx.staging-vhost.conf"
fi

echo "==> Reload prod nginx with staging bootstrap vhost"
cd "$PROD_DIR"
sudo docker compose -f docker-compose.yml -f docker-compose.staging-edge.yml up -d frontend

echo "==> Starting staging database"
cd "$STAGING_DIR"
sudo docker compose -f docker-compose.staging.yml --env-file .env up -d db redis
echo "Waiting for staging DB..."
for i in $(seq 1 30); do
  if sudo docker exec tara-staging-db pg_isready -U postgres -d tara >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if [[ ! -f /tmp/tara_prod.dump ]]; then
  echo "==> Dumping production database"
  sudo docker exec tara-db pg_dump -U postgres -Fc tara > /tmp/tara_prod.dump
fi

echo "==> Restoring production dump into staging database"
sudo docker exec -i tara-staging-db pg_restore -U postgres -d tara --clean --if-exists --no-owner --no-acl < /tmp/tara_prod.dump || true
STAGING_EMP_COUNT="$(sudo docker exec tara-staging-db psql -U postgres -d tara -tAc "SELECT COUNT(*) FROM employees;" 2>/dev/null | tr -d '[:space:]')"
if [[ "${STAGING_EMP_COUNT:-0}" == "0" ]]; then
  echo "WARN: Staging restore looks empty — retrying once"
  sleep 3
  sudo docker exec -i tara-staging-db pg_restore -U postgres -d tara --clean --if-exists --no-owner --no-acl < /tmp/tara_prod.dump || true
fi

echo "==> Copying uploaded files volumes (SOP, attendance photos, branding, mem0)"
for pair in \
  "tara_sop_data:tara_staging_sop_data" \
  "tara_attendance_data:tara_staging_attendance_data" \
  "tara_branding_data:tara_staging_branding_data" \
  "tara_mem0_data:tara_staging_mem0_data"; do
  src="${pair%%:*}"
  dst="${pair##*:}"
  sudo docker volume inspect "$dst" >/dev/null 2>&1 || sudo docker volume create "$dst" >/dev/null
  sudo docker run --rm -v "$src":/from -v "$dst":/to alpine sh -c 'mkdir -p /to && cp -a /from/. /to/ 2>/dev/null || true'
done

echo "==> Obtaining SSL certificate for ${STAGING_DOMAIN} (if missing)"
if ! sudo test -d "/etc/letsencrypt/live/${STAGING_DOMAIN}"; then
  sudo docker run --rm \
    -v /etc/letsencrypt:/etc/letsencrypt \
    -v "$PROD_DIR/certbot/www:/var/www/certbot" \
    certbot/certbot certonly --webroot -w /var/www/certbot \
    -d "${STAGING_DOMAIN}" \
    --email admin@ralali.io --agree-tos --no-eff-email --non-interactive || true
fi

if sudo test -d "/etc/letsencrypt/live/${STAGING_DOMAIN}"; then
  echo "==> Enabling HTTPS staging vhost"
  cp "$STAGING_DIR/nginx.staging-vhost.conf" "$PROD_DIR/nginx.staging-vhost.conf"
  cd "$PROD_DIR"
  sudo docker compose -f docker-compose.yml -f docker-compose.staging-edge.yml exec frontend nginx -s reload || \
    sudo docker compose -f docker-compose.yml -f docker-compose.staging-edge.yml up -d frontend
else
  echo "WARN: SSL cert not issued yet. Staging HTTP bootstrap vhost is active for ACME."
fi

echo "==> Building and starting full staging stack"
cd "$STAGING_DIR"
sudo docker compose -f docker-compose.staging.yml --env-file .env up --build -d

echo "==> Staging status"
sudo docker compose -f docker-compose.staging.yml ps
curl -fsS "https://${STAGING_DOMAIN}/health" && echo || curl -fsS "http://${STAGING_DOMAIN}/health" && echo || true

echo ""
echo "Staging ready at: https://${STAGING_DOMAIN}"
echo "Production untouched at: https://tara.ralali.io"
REMOTE_EOF
)

REMOTE_SCRIPT="${REMOTE_SCRIPT//__PROD_DIR__/$PROD_DIR}"
REMOTE_SCRIPT="${REMOTE_SCRIPT//__STAGING_DIR__/$STAGING_DIR}"
REMOTE_SCRIPT="${REMOTE_SCRIPT//__STAGING_DOMAIN__/$STAGING_DOMAIN}"

if [[ "${1:-}" == "--on-server" ]]; then
  eval "$REMOTE_SCRIPT"
  exit 0
fi

echo "==> Rsyncing project to staging directory on VPS"
rsync -az \
  --exclude 'node_modules' \
  --exclude 'backend/node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude 'backend/dist' \
  --exclude 'backend/uploads' \
  --exclude '.env' \
  --exclude 'backend/.env' \
  --exclude '.cursor' \
  -e "ssh ${SSH_OPTS[*]}" \
  "$REPO_ROOT/" \
  "${SSH_HOST}:${STAGING_DIR}/"

echo "==> Running staging bootstrap on VPS"
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "bash -s" <<< "$REMOTE_SCRIPT"

echo "Done."
