#!/usr/bin/env bash
# Deploy TARA to the VPS via rsync + docker compose.
#
# Usage:
#   bash scripts/deploy-vps.sh staging
#   bash scripts/deploy-vps.sh production
#
# Environment (CI or local):
#   VPS_HOST          e.g. ubuntu@43.157.212.212 (public IP — GitHub Actions cannot use Tailscale hostnames)
#   VPS_SSH_KEY_FILE  path to private key (default: ~/.ssh/deploy_key)

set -euo pipefail

TARGET="${1:-}"
if [[ "$TARGET" != "staging" && "$TARGET" != "production" ]]; then
  echo "Usage: $0 <staging|production>" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSH_HOST="${VPS_HOST:-ubuntu@43.157.212.212}"
SSH_KEY="${VPS_SSH_KEY_FILE:-$HOME/.ssh/deploy_key}"
SSH_OPTS=(-i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new)

if [[ "$TARGET" == "staging" ]]; then
  REMOTE_DIR="/home/ubuntu/tara-staging"
  HEALTH_URL="${STAGING_HEALTH_URL:-https://staging.tara.ralali.io/health}"
else
  REMOTE_DIR="/home/ubuntu/tara"
  HEALTH_URL="${PROD_HEALTH_URL:-https://tara.ralali.io/health}"
fi

RSYNC_EXCLUDES=(
  --exclude 'node_modules'
  --exclude 'backend/node_modules'
  --exclude '.git'
  --exclude 'dist'
  --exclude 'backend/dist'
  --exclude 'backend/uploads'
  --exclude '.env'
  --exclude 'backend/.env'
  --exclude '.cursor'
  --exclude '*.xlsx'
)

echo "==> Rsyncing to ${SSH_HOST}:${REMOTE_DIR}"
rsync -az "${RSYNC_EXCLUDES[@]}" \
  -e "ssh ${SSH_OPTS[*]}" \
  "$REPO_ROOT/" \
  "${SSH_HOST}:${REMOTE_DIR}/"

echo "==> Building and restarting containers on VPS"
ssh "${SSH_OPTS[@]}" "$SSH_HOST" bash -s <<REMOTE
set -euo pipefail
cd "${REMOTE_DIR}"

if [[ "${TARGET}" == "production" ]]; then
  if sudo docker network inspect tara_shared >/dev/null 2>&1; then
    COMPOSE_FILES="-f docker-compose.yml -f docker-compose.staging-edge.yml"
  else
    COMPOSE_FILES="-f docker-compose.yml"
  fi
  sudo docker compose \$COMPOSE_FILES --env-file .env up --build -d
  sudo docker compose \$COMPOSE_FILES ps
else
  sudo docker compose -f docker-compose.staging.yml --env-file .env up --build -d
  sudo docker compose -f docker-compose.staging.yml ps
fi
REMOTE

echo "==> Waiting for health check: ${HEALTH_URL}"
for attempt in $(seq 1 36); do
  if curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; then
    echo "Deploy OK — ${HEALTH_URL}"
    exit 0
  fi
  echo "  attempt ${attempt}/36..."
  sleep 10
done

echo "ERROR: Health check failed after deploy" >&2
exit 1
