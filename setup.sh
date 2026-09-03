#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "==> Installing dependencies (if needed)..."
npm install

echo "==> Database: Prisma migrate + generate..."
node scripts/prisma-direct-url.mjs migrate deploy
npx prisma generate

if [[ ! -s .env ]]; then
  echo "==> Pulling app credentials from Partner Dashboard..."
  shopify app env pull || true
  if [[ -f .env.october-pincode ]]; then
    cp .env.october-pincode .env
  elif [[ ! -f .env ]]; then
    echo ""
    echo "No .env file found. Run: shopify app env pull"
    echo "  cp .env.example .env  # then fill SHOPIFY_APP_URL (your ngrok URL)"
    echo ""
  fi
fi

CLIENT_ID=""
if [[ -f shopify.app.october-pincode.toml ]]; then
  CLIENT_ID="$(grep -E '^client_id\s*=' shopify.app.october-pincode.toml 2>/dev/null | sed -n 's/.*"\([^"]*\)".*/\1/p' | head -1 || true)"
fi

if [[ -z "${CLIENT_ID}" ]]; then
  echo ""
  echo "==> Link app to Partner Dashboard (browser login may open)..."
  echo "    Select org + app 'October Pincode', or create/link for store octoberstore-2.myshopify.com"
  shopify app config link
else
  echo ""
  echo "==> App already linked (client_id=${CLIENT_ID}); skipping config link."
fi

STORE="${SHOPIFY_STORE:-octoberstore-2.myshopify.com}"

echo ""
echo "==> Dev store requirement"
echo "    shopify app dev only works on development stores."
echo "    octoberstore-2.myshopify.com is a live store — if dev fails with"
echo "    'Shop is not configured for app development', either:"
echo "      1. Create a dev store in Partner Dashboard and run:"
echo "         SHOPIFY_STORE=your-dev.myshopify.com ./setup.sh"
echo "      2. Deploy to production hosting and install on the live store."
echo ""

TUNNEL_URL="${NGROK_TUNNEL_URL:-}"
if [[ -z "${TUNNEL_URL}" ]] && curl -sf http://127.0.0.1:4040/api/tunnels >/dev/null 2>&1; then
  NGROK_HOST="$(curl -sf http://127.0.0.1:4040/api/tunnels | python3 -c "
import json, sys
data = json.load(sys.stdin)
for t in data.get('tunnels', []):
    if t.get('proto') == 'https':
        print(t['public_url'].replace('https://', ''))
        break
" 2>/dev/null || true)"
  if [[ -n "${NGROK_HOST}" ]]; then
    TUNNEL_URL="https://${NGROK_HOST}:3000"
  fi
fi

DEV_ARGS=(--store "${STORE}")
if [[ -n "${TUNNEL_URL}" ]]; then
  echo "==> Starting dev server with tunnel: ${TUNNEL_URL}"
  echo "    (App proxy / pincode check requires a public tunnel, not localhost.)"
  DEV_ARGS+=(--tunnel-url "${TUNNEL_URL}")
else
  echo "==> No ngrok tunnel detected. Start one in another terminal:"
  echo "      ngrok http 3000"
  echo "    Or set NGROK_TUNNEL_URL=https://YOUR-SUBDOMAIN.ngrok-free.dev:3000"
  echo ""
  echo "==> Falling back to --use-localhost (admin UI only; app proxy will not work)."
  DEV_ARGS+=(--use-localhost)
fi

echo "    Press Ctrl+C to stop."
shopify app dev "${DEV_ARGS[@]}"
