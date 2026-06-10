#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

OPENFDA_NDC_DIR="$ROOT_DIR/data/fda-ndc/json"
GSRS_DIR="$ROOT_DIR/data/GSRS"

mkdir -p "$OPENFDA_NDC_DIR"
mkdir -p "$GSRS_DIR"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

download_openfda_ndc() {
  require_command curl
  require_command jq
  require_command unzip

  if find "$OPENFDA_NDC_DIR" -maxdepth 1 -type f -name 'drug-ndc-*.json' | grep -q .; then
    echo "OpenFDA NDC JSON already exists in $OPENFDA_NDC_DIR"
    return
  fi

  echo "Finding OpenFDA NDC download URL..."

  file_url="$(
    curl -fsSL "https://api.fda.gov/download.json" \
    | jq -r '.results.drug.ndc.partitions[0].file // empty'
  )"

  if [ "$file_url" = "" ]; then
    echo "Could not find OpenFDA drug NDC file URL" >&2
    exit 1
  fi

  zip_path="$OPENFDA_NDC_DIR/$(basename "$file_url")"

  echo "Downloading OpenFDA NDC: $file_url"
  curl -fL "$file_url" -o "$zip_path"

  echo "Extracting $zip_path"
  unzip -o "$zip_path" -d "$OPENFDA_NDC_DIR"
}

download_gsrs() {
  require_command curl

  if find "$GSRS_DIR" -maxdepth 1 -type f -name '*.gsrs' | grep -q .; then
    echo "GSRS dump already exists in $GSRS_DIR"
    return
  fi

  if [ "${GSRS_DOWNLOAD_URL:-}" = "" ]; then
    echo "No GSRS dump found." >&2
    echo "Please download a GSRS .gsrs file into:" >&2
    echo "  $GSRS_DIR" >&2
    echo "" >&2
    echo "Or run with:" >&2
    echo '  GSRS_DOWNLOAD_URL="https://..." bash scripts/download-data.sh' >&2
    exit 1
  fi

  target="$GSRS_DIR/$(basename "$GSRS_DOWNLOAD_URL")"

  echo "Downloading GSRS: $GSRS_DOWNLOAD_URL"
  curl -fL "$GSRS_DOWNLOAD_URL" -o "$target"
}

download_openfda_ndc
download_gsrs

echo "Data files are ready."