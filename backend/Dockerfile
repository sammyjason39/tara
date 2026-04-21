# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for Prisma and build tools
RUN apk add --no-cache openssl shadow

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# --- Stage 2: Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Copy only production artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Use non-root user for security
RUN addgroup -S zenvix && adduser -S zenvix -G zenvix
USER zenvix

EXPOSE 3001

# Runtime: Apply migrations and start multi-process (API + Worker)
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:all"]
