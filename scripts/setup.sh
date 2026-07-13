#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# resolve a single file from a glob and fail loudly if nothing matches — used to check the raw data is present
find_one_file() {
  local match
  match="$(ls $1 2>/dev/null | head -n1 || true)"
  if [ -z "$match" ]; then
    echo "Missing file matching: $1" >&2
    exit 1
  fi
  echo "$match"
}

# preflight: bail now if the source dumps aren't downloaded, rather than mid-load
GSRS_FILE="$(find_one_file 'data/GSRS/*.gsrs')"
OPENFDA_FILE="$(find_one_file 'data/fda-ndc/json/drug-ndc-*.json')"
echo "GSRS:    $GSRS_FILE"
echo "OpenFDA: $OPENFDA_FILE"

echo "Starting Postgres..."
docker compose up -d postgres

# load raw sources via the one-shot loader-profile containers
echo "Loading GSRS raw..."
docker compose --profile loader run --rm gsrs-loader

echo "Loading OpenFDA NDC JSON raw..."
docker compose --profile loader run --rm openfda-ndc-json-loader

# curated tables are ordered on purpose: the NDC curation joins against GSRS, so GSRS runs first
echo "Building curated tables (GSRS first, NDC depends on it)..."
docker compose exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 < infra/db/gsrs/gsrs-curated.sql
docker compose exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 < infra/db/fda_ndc/json/ndc-fda-curated.sql

# TMT (Thai medicines) is optional — only load it if someone dropped the xls in; xls->csv needs pandas+xlrd and may be skipped
if ls data/TMT/*.xls >/dev/null 2>&1; then
  echo "Loading TMT (Thai Medicines Terminology)..."
  python3 scripts/tmt-xls-to-csv.py || echo "TMT xls->csv skipped (needs pandas + xlrd)"
  if ls data/TMT/*.csv >/dev/null 2>&1; then
    docker compose --profile loader run --rm tmt-demo-loader
  fi
fi

# bring up the query layer (trino + ontop) and the app once the db is populated
echo "Starting VKG services..."
docker compose up -d trino ontop-trino backend frontend

echo "Setup complete."
echo "Ontop SPARQL: http://localhost:8083/sparql"
echo "Backend API:  http://localhost:8082"
echo "Frontend:     http://localhost:3000"
