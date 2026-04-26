# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies for Prisma and build tools
RUN apk add --no-cache openssl shadow

COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm install --legacy-peer-deps

COPY backend/ .

RUN npx prisma generate
RUN npm run build

# --- Stage 2: Runner ---
FROM node:22-alpine AS runner

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Copy only production artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Prepare persistent data directory
RUN mkdir -p /data/backups /data/logs /app/storage/reports && \
    addgroup -S zenvix && adduser -S zenvix -G zenvix && \
    chown -R zenvix:zenvix /data /app/storage

USER zenvix

EXPOSE 3001

# Runtime: Apply migrations and start multi-process (API + Worker)
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:all"]
