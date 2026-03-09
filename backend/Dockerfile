# Backend Dockerfile for Zenvix Platform
# Build from project root: docker build -t zenvix-backend -f backend/Dockerfile .

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy prisma schema first
COPY prisma ./prisma

# Copy backend package files
COPY backend/package*.json ./backend/

# Install dependencies and generate prisma
WORKDIR /app/backend
RUN npm install
RUN npx prisma generate --schema=../prisma/schema.prisma

# Copy the rest of the backend source
# We stay in /app/backend and copy from the backend source folder in the context
COPY backend/ .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Copy production dependencies and built assets
COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist

EXPOSE 3001
CMD ["node", "dist/main"]
