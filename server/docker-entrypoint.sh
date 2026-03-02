#!/bin/sh
set -e

HOST="${META_DB_HOST:-db}"
PORT="${META_DB_PORT:-5432}"

echo "[entrypoint] Waiting for PostgreSQL at $HOST:$PORT..."
until nc -z "$HOST" "$PORT" 2>/dev/null; do
  printf '.'
  sleep 1
done
echo ""
echo "[entrypoint] PostgreSQL is ready."

if [ "$SEED_ON_START" = "true" ]; then
  echo "[entrypoint] SEED_ON_START=true — running seed script..."
  node scripts/seed.js
  echo "[entrypoint] Seed complete."
fi

exec node index.js
