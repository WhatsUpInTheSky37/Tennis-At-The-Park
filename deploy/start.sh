#!/bin/sh
set -e

export PORT="${PORT:-8080}"
export DATABASE_URL="${DATABASE_URL}"
export JWT_SECRET="${JWT_SECRET}"
export FRONTEND_URL="${FRONTEND_URL:-http://localhost:${PORT}}"

echo "=== Tennis At The Park ==="
echo "Starting on port $PORT"

envsubst '$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec supervisord -c /etc/supervisord.conf
