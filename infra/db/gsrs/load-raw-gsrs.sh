#!/bin/sh
set -eu

GSRS_FILE="/data/GSRS/dump-public-2026-02-26.gsrs"

psql -v ON_ERROR_STOP=1 \
  -h postgres \
  -U postgres \
  -d postgres \
  -f /work/gsrs-raw.sql

gzip -dc "$GSRS_FILE" \
| jq -r '[. | tojson] | @csv' \
| psql -v ON_ERROR_STOP=1 \
    -h postgres \
    -U postgres \
    -d postgres \
    -c "\copy gsrs_raw.gsrs_json (
      record
    ) FROM STDIN WITH (FORMAT csv)"

psql -v ON_ERROR_STOP=1 \
  -h postgres \
  -U postgres \
  -d postgres \
  -f /work/gsrs-view.sql