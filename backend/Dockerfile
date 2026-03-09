# Backend Dockerfile for Zenvix Platform
# Build from project root: docker build -t zenvix-backend -f backend/Dockerfile .

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for better layer caching
COPY prisma ./prisma
COPY backend/package*.json ./backend/

WORKDIR /app/backend
RUN npm install

# Generate Prisma Client
RUN npx prisma generate --schema=../prisma/schema.prisma

# Copy source and build
COPY backend/ .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Ensure we use production mode
ENV NODE_ENV=production

# Copy production dependencies and built assets
COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist

# The app listens on the port defined in .env or 3001 by default
EXPOSE 3001

CMD ["node", "dist/main"]
