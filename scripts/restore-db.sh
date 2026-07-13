#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
DUMP="${1:-rxvkg-db.dump}"
if [ ! -f "$DUMP" ]; then
  echo "dump file not found: $DUMP"
  exit 1
fi
COMPOSE="docker compose -f docker-compose.prod.yml"
$COMPOSE up -d postgres
until $COMPOSE exec -T postgres pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; do sleep 2; done
sleep 3
echo "copying dump into postgres container..."
$COMPOSE cp "$DUMP" postgres:/tmp/restore.dump
if $COMPOSE exec -T postgres pg_restore -h 127.0.0.1 -U postgres -d postgres --clean --if-exists --no-owner --no-privileges /tmp/restore.dump; then
  echo "restore finished"
else
  echo "pg_restore exited with code $? (harmless DROP-skip notices on a fresh database are OK - verify below)"
fi
$COMPOSE exec -T postgres rm -f /tmp/restore.dump
echo "=== schemas ==="
$COMPOSE exec -T postgres psql -U postgres -d postgres -c "\dn"
echo "=== serve-layer table counts ==="
$COMPOSE exec -T postgres psql -U postgres -d postgres -tAc "SELECT schemaname, count(*) FROM pg_tables WHERE schemaname IN ('gsrs','fda_ndc_json','tmt_demo') GROUP BY schemaname ORDER BY schemaname;"
