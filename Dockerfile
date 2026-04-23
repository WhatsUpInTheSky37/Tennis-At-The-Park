## Tennis At The Park - Single-process deployment

# ── Build frontend ──
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
ENV VITE_API_URL=/api
RUN npm run build

# ── Build backend ──
FROM node:20-slim AS backend-builder
WORKDIR /app
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm ci
RUN npx prisma generate
COPY backend/ .
RUN npm run build

# ── Production ──
FROM node:20-slim
WORKDIR /app

COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/prisma ./prisma
COPY --from=backend-builder /app/package*.json ./
COPY --from=frontend-builder /app/dist ./public

ENV PORT=8080
EXPOSE 8080

CMD sh -c "npx prisma migrate deploy && node dist/index.js"
