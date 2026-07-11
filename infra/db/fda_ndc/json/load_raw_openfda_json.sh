#!/bin/sh
set -eu

set -- /data/fda-ndc/json/drug-ndc-*.json
JSON_FILE="$1"

psql -v ON_ERROR_STOP=1 \
  -h postgres \
  -U postgres \
  -d postgres \
  -f /work/ndc-fda-json-raw.sql

jq -r '
  .meta.last_updated as $last_updated
  | .results[]
  | [
      $last_updated,
      (. | tojson)
    ]
  | @csv
' "$JSON_FILE" \
| psql -v ON_ERROR_STOP=1 \
    -h postgres \
    -U postgres \
    -d postgres \
    -c "\copy fda_ndc_json_raw.fda_ndc_json (
      source_last_updated,
      record
    ) FROM STDIN WITH (FORMAT csv)"