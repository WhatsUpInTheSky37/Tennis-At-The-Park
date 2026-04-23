#!/bin/sh

export PORT="${PORT:-8080}"
export FRONTEND_URL="${FRONTEND_URL:-http://localhost:${PORT}}"

echo "=== Tennis At The Park ==="
echo "Starting on port $PORT"
echo "DATABASE_URL is $(echo $DATABASE_URL | sed 's/:.*@/:***@/')"

# Template nginx config with the Railway-assigned PORT
envsubst '$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Run migrations before starting (with retries for DB startup)
cd /app/backend
for i in 1 2 3 4 5; do
  echo "Migration attempt $i..."
  node_modules/.bin/prisma migrate deploy && break
  echo "Migration failed, retrying in 5s..."
  sleep 5
done

cd /app

# Start supervisord (runs nginx + backend)
exec supervisord -c /etc/supervisord.conf
