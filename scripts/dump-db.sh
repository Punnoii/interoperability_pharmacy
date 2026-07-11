#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-rxvkg-db.dump}"
docker compose up -d postgres
until docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; do sleep 2; done
docker compose exec -T postgres pg_dump -U postgres -d postgres -Fc -Z 6 > "$OUT"
ls -lh "$OUT"
