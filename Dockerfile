# Frontend Dockerfile for Zenvix Platform
# Build from project root: docker build -t zenvix-frontend .

# Stage 1: Build
FROM node:20 AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy prisma schema for generator (if needed for types)
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

# Environment variables, defaults for local docker-compose
ENV PORT=80
ENV BACKEND_URL=http://backend:3001

# Use envsubst to replace variables in the config before starting Nginx
CMD ["/bin/sh", "-c", "envsubst '${PORT} ${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
