#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
DUMP="${1:-rxvkg-db.dump}"
if [ ! -f "$DUMP" ]; then
  echo "dump file not found: $DUMP"
  exit 1
fi
docker compose -f docker-compose.prod.yml up -d postgres
until docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; do sleep 2; done
sleep 3
if docker compose -f docker-compose.prod.yml exec -T postgres pg_restore -h 127.0.0.1 -U postgres -d postgres --clean --if-exists --no-owner < "$DUMP"; then
  echo "restore finished"
else
  echo "pg_restore exited with code $? (some errors may be harmless DROP failures on a fresh database — verify schemas below)"
fi
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d postgres -c "\dn" -c "\dt public.*"
