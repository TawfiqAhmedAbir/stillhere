#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ""
echo "=== StillHere free stack ==="
echo "API: http://localhost:3001"
echo "Copy the trycloudflare.com URL for GitHub secret + mobile/.env"
echo "Keep this terminal open."
echo ""

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "ERROR: cloudflared not found."
  echo "Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  exit 1
fi

npx concurrently --kill-others \
  --names "API,TUNNEL" \
  --prefix-colors "blue,green" \
  "npm run dev:server" \
  "cloudflared tunnel --url http://localhost:3001"
