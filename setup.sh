#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "==> Installing dependencies (if needed)..."
npm install

echo "==> Database: Prisma migrate + generate..."
npx prisma migrate deploy
npx prisma generate

if [[ ! -f .env ]]; then
  echo ""
  echo "No .env file found. Copy .env.example and fill values after linking, or let 'shopify app dev' create them:"
  echo "  cp .env.example .env"
  echo ""
fi

echo ""
echo "==> Link app to Partner Dashboard (browser login may open)..."
echo "    Select org + app 'October Pincode', or create/link for store octoberstore-2.myshopify.com"
shopify app config link

echo ""
echo "==> Starting dev server (install on store, tunnel, app proxy)..."
echo "    Press Ctrl+C to stop."
shopify app dev
