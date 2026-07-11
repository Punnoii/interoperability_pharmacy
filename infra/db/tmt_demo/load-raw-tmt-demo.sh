#!/bin/sh
set -eu

set -- /data/TMT/*.csv
CSV="$1"
if [ ! -f "$CSV" ]; then
  echo "No TMT CSV found in /data/TMT/ (run scripts/tmt-xls-to-csv.py first)" >&2
  exit 1
fi
echo "TMT CSV: $CSV"

awk '{print} /FROM STDIN/{exit}' /work/tmt_demo.sql > /tmp/tmt_head.sql
awk 'f{print} /FROM STDIN/{f=1}' /work/tmt_demo.sql > /tmp/tmt_tail.sql

{ cat /tmp/tmt_head.sql; cat "$CSV"; printf '\\.\n'; cat /tmp/tmt_tail.sql; } \
  | psql -v ON_ERROR_STOP=1 -h postgres -U postgres -d postgres
