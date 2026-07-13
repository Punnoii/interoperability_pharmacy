#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# output path defaults to rxvkg-db.dump; pass an arg to override
OUT="${1:-rxvkg-db.dump}"
docker compose up -d postgres
# wait for postgres to actually accept connections before dumping
until docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; do sleep 2; done
# custom-format (-Fc) compressed dump piped to the host file; -Fc restores selectively with pg_restore
docker compose exec -T postgres pg_dump -U postgres -d postgres -Fc -Z 6 > "$OUT"
ls -lh "$OUT"
