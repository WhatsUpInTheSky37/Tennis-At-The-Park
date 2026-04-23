## Tennis At The Park - Combined single-container deployment
## Builds backend + frontend, serves everything via nginx
## Deploy from repo root on Railway, Render, or any Docker host
##
## Required env vars on Railway:
##   DATABASE_URL  - provided automatically by Railway PostgreSQL plugin
##   JWT_SECRET    - set to a random 32+ char string
##
## Railway will set PORT automatically.

# ── Stage 1: Build backend ──
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY backend/ .
RUN npm run build

# ── Stage 2: Build frontend ──
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .

ENV VITE_API_URL=/api
RUN npm run build

# ── Stage 3: Production runtime ──
FROM node:20-alpine

RUN apk add --no-cache nginx supervisor gettext

WORKDIR /app

# Copy backend build + node_modules
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/prisma ./backend/prisma
COPY --from=backend-builder /app/backend/package*.json ./backend/

# Copy frontend static files
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy deployment config
COPY deploy/nginx.conf.template /etc/nginx/nginx.conf.template
COPY deploy/supervisord.conf /etc/supervisord.conf
COPY deploy/start.sh /app/start.sh
RUN chmod +x /app/start.sh

ENV PORT=8080
EXPOSE 8080

CMD ["/app/start.sh"]
