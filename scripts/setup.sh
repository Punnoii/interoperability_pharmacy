#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

GSRS_FILE="data/GSRS/dump-public-2026-02-26.gsrs"
OPENFDA_FILE="data/fda-ndc/json/drug-ndc-0001-of-0001.json"

if [ ! -f "$GSRS_FILE" ]; then
  echo "Missing GSRS file: $GSRS_FILE" >&2
  exit 1
fi

if [ ! -f "$OPENFDA_FILE" ]; then
  echo "Missing OpenFDA NDC JSON file: $OPENFDA_FILE" >&2
  exit 1
fi

echo "Starting Postgres..."
docker compose up -d postgres

echo "Loading GSRS..."
docker compose --profile loader run --rm gsrs-loader

echo "Loading OpenFDA NDC JSON..."
docker compose --profile loader run --rm openfda-ndc-json-loader

echo "Rebuilding views..."
docker compose exec -T postgres psql -U postgres -d postgres < infra/db/gsrs/gsrs-view.sql
docker compose exec -T postgres psql -U postgres -d postgres < infra/db/fda_ndc/json/ndc-fda-json-view.sql

echo "Starting VKG services..."
docker compose up -d trino ontop-trino backend

echo "Setup complete."
echo "Ontop SPARQL: http://localhost:8083/sparql"
echo "Backend API:   http://localhost:8082"