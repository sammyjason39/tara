# ==============================================================================
# TARA Backend — Dockerfile
# Uses Debian slim (glibc) — required for onnxruntime / @xenova/transformers
# and mem0 local embeddings on production VPS.
# ==============================================================================

# --- Stage 1: Build ---
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json .npmrc ./
COPY prisma ./prisma/
RUN npm ci

RUN npx prisma generate

COPY . .
RUN npm run build

RUN npx tsc src/scripts/seed-defaults.ts src/scripts/seed-ralali-employees.ts \
    --outDir dist/scripts \
    --esModuleInterop \
    --resolveJsonModule \
    --skipLibCheck \
    --module commonjs \
    --target ES2021 \
    --declaration false \
    2>/dev/null || echo "Seed script compilation skipped"

# --- Stage 2: Production ---
FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends tini openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/data ./data
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/usr/bin/tini", "--"]

EXPOSE 3001

CMD ["/app/docker-entrypoint.sh"]
