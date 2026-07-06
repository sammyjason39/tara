#!/bin/sh
set -e

echo "========================================"
echo " TARA Backend — Docker Entrypoint"
echo "========================================"

# Wait for the database to be ready (belt + suspenders beyond healthcheck)
echo "[1/4] Waiting for database..."
MAX_RETRIES=30
RETRY=0
until echo "SELECT 1" | npx prisma db execute --stdin > /dev/null 2>&1 || [ $RETRY -ge $MAX_RETRIES ]; do
  RETRY=$((RETRY + 1))
  echo "  Database not ready yet (attempt $RETRY/$MAX_RETRIES)..."
  sleep 2
done

if [ $RETRY -ge $MAX_RETRIES ]; then
  echo "  WARNING: Database connection timeout — proceeding anyway..."
fi

# Run Prisma migrations
echo "[2/4] Running database migrations..."
# Clear failed migration from a previous bad deploy (wrong table name), if any
npx prisma migrate resolve --rolled-back "20260706100000_employee_last_login_at" 2>/dev/null || true
npx prisma migrate deploy || {
  echo "  ERROR: Migrations failed. Refusing to run db push --accept-data-loss in production."
  echo "  Fix the migration issue manually. Data is preserved."
  exit 1
}

# Seed defaults only when explicitly requested (first install / dev)
if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "[3/4] Seeding default configuration (SEED_ON_START=true)..."
  node dist/scripts/seed-defaults.js || {
    echo "  Seed script failed"
    exit 1
  }
else
  echo "[3/4] Skipping seed (set SEED_ON_START=true for first-time setup only)"
fi

# Start the application
echo "[4/4] Starting TARA Backend..."
echo "========================================"
exec node dist/main.js
