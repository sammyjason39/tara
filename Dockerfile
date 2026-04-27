# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# --- Stage 2: Serve ---
FROM nginx:alpine

# Copy built assets to Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Professional metadata
LABEL maintainer="Zenvix Team"
LABEL version="1.0.0"

EXPOSE 80

# Defaults for local docker-compose (will be overridden in VPS)
ENV PORT=80
ENV BACKEND_URL=http://bfs-backend:3001

# Entrypoint: Inject environment variables into Nginx config and start
CMD ["/bin/sh", "-c", "envsubst '${PORT} ${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
