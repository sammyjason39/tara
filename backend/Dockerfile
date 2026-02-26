# Backend Dockerfile for Zenvix Platform
# Build from project root: docker build -t zenvix-backend -f backend/Dockerfile .

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for both root (if needed for prisma) and backend
# Actually, backend is self-contained except for the prisma schema
COPY prisma ./prisma
COPY backend/package*.json ./backend/
COPY backend/tsconfig*.json ./backend/
COPY backend/nest-cli.json ./backend/

WORKDIR /app/backend
RUN npm install

# Generate Prisma Client
# Note: schema.prisma is at ../prisma/schema.prisma relative to this WORKDIR
RUN npx prisma generate --schema=../prisma/schema.prisma

# Build the application
COPY backend/src ./src
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy production dependencies and built assets
COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
# Prisma client needs to be available in the same relative path it was generated
# For the backend, it was generated into src/generated/client
COPY --from=builder /app/backend/src/generated ./src/generated

EXPOSE 3000

# Ensure we use production mode
ENV NODE_ENV=production

CMD ["npm", "run", "start:prod"]
