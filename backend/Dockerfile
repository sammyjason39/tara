# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl shadow python3 make g++

# Copy package files and install dependencies
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install dependencies (including devDependencies for build)
RUN npm install --legacy-peer-deps

# Copy source code
COPY backend/ .

# Generate Prisma Client and Build NestJS
RUN npx prisma generate
RUN npm run build

# --- Stage 2: Runner ---
FROM node:22-alpine AS runner

WORKDIR /app

# Install runtime dependencies for Prisma
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV RUNTIME=docker

# Copy production artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Create professional directory structure for persistent data
RUN mkdir -p /data/backups /data/logs /app/storage/reports && \
    addgroup -S zenvix && adduser -S zenvix -G zenvix && \
    chown -R zenvix:zenvix /data /app/storage /app/prisma

# Use non-root user
USER zenvix

EXPOSE 3001

# Entrypoint: Apply migrations and start the server + worker
# Note: In production, you might want to run worker in a separate container, 
# but start:all is fine for a unified VPS deployment.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:all"]
