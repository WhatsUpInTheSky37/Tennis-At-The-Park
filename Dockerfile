## Tennis At The Park - Single-process deployment
## One Node.js server serves both the API and frontend

# ── Stage 1: Build frontend ──
FROM node:20-alpine AS frontend-builder
LABEL rebuild="2026-04-23-v4"
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
ENV VITE_API_URL=/api
RUN npm run build

# ── Stage 2: Build backend ──
FROM node:20-alpine AS backend-builder
LABEL rebuild="2026-04-23-v4"
WORKDIR /app
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm ci
RUN npx prisma generate
COPY backend/ .
RUN npm run build

# ── Stage 3: Production ──
FROM node:20-alpine
LABEL rebuild="2026-04-23-v4"
WORKDIR /app

# Install OpenSSL - required by Prisma on Alpine
RUN apk add --no-cache openssl

# Copy backend
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/prisma ./prisma
COPY --from=backend-builder /app/package*.json ./

# Copy frontend build into backend's public folder
COPY --from=frontend-builder /app/dist ./public

ENV PORT=8080
EXPOSE 8080

CMD sh -c "node_modules/.bin/prisma migrate deploy && node dist/index.js"
