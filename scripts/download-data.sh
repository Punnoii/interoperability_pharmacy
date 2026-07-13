#!/usr/bin/env bash
set -euo pipefail

# resolve repo root from the script's own path so it runs the same from anywhere
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# where each raw source lands; GSRS url is overridable via env in case the pinned dump rotates
OPENFDA_NDC_DIR="$ROOT_DIR/data/fda-ndc/json"
GSRS_DIR="$ROOT_DIR/data/GSRS"
DEFAULT_GSRS_DOWNLOAD_URL="https://gsrs.ncats.nih.gov/assets/downloads/dump-public-2026-02-26.gsrs"
GSRS_DOWNLOAD_URL="${GSRS_DOWNLOAD_URL:-$DEFAULT_GSRS_DOWNLOAD_URL}"

mkdir -p "$OPENFDA_NDC_DIR"
mkdir -p "$GSRS_DIR"

# bail early with a clear message if a needed CLI tool isn't on PATH
require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

# grab the OpenFDA NDC drug dataset — idempotent, skips the download if json is already there
download_openfda_ndc() {
  require_command curl
  require_command jq
  require_command unzip

  if find "$OPENFDA_NDC_DIR" -maxdepth 1 -type f -name 'drug-ndc-*.json' | grep -q .; then
    echo "OpenFDA NDC JSON already exists in $OPENFDA_NDC_DIR"
    return
  fi

  # OpenFDA doesn't have a stable file url; the download manifest points at the current partition
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

  # fetch the zip then unpack the json next to it
  echo "Downloading OpenFDA NDC: $file_url"
  curl -fL "$file_url" -o "$zip_path"

  echo "Extracting $zip_path"
  unzip -o "$zip_path" -d "$OPENFDA_NDC_DIR"
}

# grab the GSRS substance dump — same skip-if-present guard as above
download_gsrs() {
  require_command curl

  if find "$GSRS_DIR" -maxdepth 1 -type f -name '*.gsrs' | grep -q .; then
    echo "GSRS dump already exists in $GSRS_DIR"
    return
  fi

  # no url and no local file -> we can't proceed; tell the user how to supply one
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

# run both fetches; either one no-ops if its data is already on disk
download_openfda_ndc
download_gsrs

echo "Data files are ready."