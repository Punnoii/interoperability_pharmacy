#!/bin/sh
set -eu

set -- /data/GSRS/*.gsrs
GSRS_FILE="$1"

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