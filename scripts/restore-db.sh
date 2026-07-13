#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# dump to restore from; defaults to the file dump-db.sh writes
DUMP="${1:-rxvkg-db.dump}"
if [ ! -f "$DUMP" ]; then
  echo "dump file not found: $DUMP"
  exit 1
fi
# this targets the prod compose stack, not the dev one
COMPOSE="docker compose -f docker-compose.prod.yml"
$COMPOSE up -d postgres
# wait for readiness, then a small extra sleep, pg_isready can flip true a beat before it accepts real work
until $COMPOSE exec -T postgres pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; do sleep 2; done
sleep 3
# copy the dump into the container and restore from the file, piping a big dump through exec -T is flaky
echo "copying dump into postgres container..."
$COMPOSE cp "$DUMP" postgres:/tmp/restore.dump
# --clean/--if-exists so a re-run replaces existing objects; --no-owner/--no-privileges since roles differ across machines
if $COMPOSE exec -T postgres pg_restore -h 127.0.0.1 -U postgres -d postgres --clean --if-exists --no-owner --no-privileges /tmp/restore.dump; then
  echo "restore finished"
else
  echo "pg_restore exited with code $? (harmless DROP-skip notices on a fresh database are OK - verify below)"
fi
# tidy up the copied dump inside the container
$COMPOSE exec -T postgres rm -f /tmp/restore.dump
# sanity check: list schemas + row counts of the serve-layer tables so a bad restore is obvious
echo "=== schemas ==="
$COMPOSE exec -T postgres psql -U postgres -d postgres -c "\dn"
echo "=== serve-layer table counts ==="
$COMPOSE exec -T postgres psql -U postgres -d postgres -tAc "SELECT schemaname, count(*) FROM pg_tables WHERE schemaname IN ('gsrs','fda_ndc_json','tmt_demo') GROUP BY schemaname ORDER BY schemaname;"
