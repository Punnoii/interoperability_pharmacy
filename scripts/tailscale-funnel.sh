#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

TS="$(command -v tailscale || echo /Applications/Tailscale.app/Contents/MacOS/Tailscale)"
if [ ! -x "$TS" ]; then
  echo "tailscale CLI not found. Install Tailscale first."
  exit 1
fi

FQDN="$("$TS" status --json | python3 -c 'import sys,json; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')"
if [ -z "$FQDN" ]; then
  echo "Could not read this machine's tailnet name. Is Tailscale logged in?"
  exit 1
fi

if [ ! -f .env ]; then
  echo ".env not found. Copy .env.production.example to .env and fill it in first."
  exit 1
fi

if ! grep -q "^DOMAIN=${FQDN}$" .env; then
  echo "NOTE: set DOMAIN=${FQDN} in .env so OAuth and reset links use the right host."
fi

echo "==> building and starting the stack (production images)"
DOMAIN="$FQDN" docker compose -f docker-compose.prod.yml up -d --build

echo "==> waiting for the frontend"
until [ "$(curl -s -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ 2>/dev/null)" = "200" ]; do
  sleep 5
done

echo "==> exposing port 3000 on the tailnet"
"$TS" serve --bg 3000 >/dev/null

echo
echo "Private (tailnet members only):  https://${FQDN}"
echo
echo "To make it reachable from the public internet as well, run:"
echo "  $TS funnel --bg 3000"
echo "(Funnel needs HTTPS + the 'funnel' node attribute enabled in the tailnet ACL policy.)"
echo
echo "Turn sharing off again with:  $TS serve reset"
