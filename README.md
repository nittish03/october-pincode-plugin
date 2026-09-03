# October Pincode — Shopify App

Private Shopify app for **October Store** (`octoberstore-2.myshopify.com`) that checks Indian pincodes against configurable delivery zones and exposes a storefront App Proxy endpoint for the theme.

## What you need to do

Follow these steps in order. Copy-paste commands where shown.

### 1. Shopify Partner account & create the app

1. Sign in at [Shopify Partners](https://partners.shopify.com/) (or [Dev Dashboard](https://dev.shopify.com/dashboard)).
2. Create a **custom app** named **October Pincode** (or link this folder to an existing app).

### 2. Install dependencies & link the app

```bash
cd /Users/eshway/Desktop/october-pincode-app
npm install
npx prisma migrate dev --name init
```

Link the local project to your Partner app (interactive — requires browser login):

```bash
shopify app config link
```

This fills `client_id` in `shopify.app.toml` and creates `.env` with API credentials.

### 3. Run the app locally

```bash
shopify app dev --store octoberstore-2.myshopify.com
```

- CLI starts a tunnel (Cloudflare by default) and updates app URLs automatically.
- Press **p** to open the app in Admin and complete install on `octoberstore-2`.
- Configure delivery zones in the app admin UI.

### 4. Verify App Proxy (usually automatic)

`shopify.app.toml` configures:

| Setting | Value |
|---------|-------|
| Prefix | `apps` |
| Subpath | `pincode` |
| App URL path | `/apps/pincode/check` |

**Storefront URL:** `https://octoberstore-2.myshopify.com/apps/pincode/check?pincode=110001`

If proxy 404s after install, check **Settings → Apps and sales channels → October Pincode → App proxy** in Shopify Admin and confirm:

- Subpath prefix: `apps`
- Subpath: `pincode`
- Proxy URL points to your deployed/tunnel app

Then run `shopify app deploy` to sync TOML config.

### 5. Configure delivery zones

In the embedded app admin:

1. Set **warehouse/origin pincode** (default `110001`).
2. Review/edit zones: **Metro**, **Tier 2**, **Rest of India** (sensible defaults included).
3. Set the **non-serviceable message**.
4. Use the preview panel to test pincodes.
5. Click **Save settings** — stored in shop metafield `custom.pincode_config` (JSON).

### 6. Deploy the app (production — Vercel)

1. Create a free [Neon](https://console.neon.tech) Postgres DB → copy `DATABASE_URL` (pooled, `?sslmode=require`).
2. From this folder: `npx vercel link` then set env vars (see `.env.example`).
3. Run migrations once: `DATABASE_URL=... npx prisma migrate deploy`
4. Deploy: `npx vercel --prod`
5. Put the Vercel URL into `shopify.app.october-pincode.toml` (`application_url` + `redirect_urls`), then `shopify app deploy`.

Env vars on Vercel:

| Variable | Example / notes |
|----------|-----------------|
| `SHOPIFY_API_KEY` | Partner Dashboard client ID (alias: `API_KEY`) |
| `SHOPIFY_API_SECRET` | Partner Dashboard secret (alias: `SECRET`) |
| `SCOPES` | `write_app_proxy` |
| `DATABASE_URL` | Neon Postgres pooled URL (`-pooler` in hostname) |
| `DIRECT_DATABASE_URL` | Neon direct URL (same host without `-pooler`) — used for migrations |
| `SHOPIFY_APP_URL` | `https://pincode-plugin.vercel.app` |
| `SHOP_CUSTOM_DOMAIN` | `octoberstore.in` — **required** for App Proxy on custom domain |

After updating env vars or scopes, redeploy on Vercel, then open the app in Shopify Admin once to refresh the OAuth session.

### 7. Push theme changes

Theme integration lives in `sections/product-final.liquid` on the October theme repo.

```bash
cd /Users/eshway/Desktop/october-shopify
shopify theme push --store https://octoberstore-2.myshopify.com/ --theme 162248589443 --allow-live
```

---

## App Proxy API

**GET** `/apps/pincode/check?pincode=110001`

**Response (serviceable):**

```json
{
  "serviceable": true,
  "minDays": 3,
  "maxDays": 5,
  "message": "Delivery in 3-5 business days",
  "zone": "Metro"
}
```

**Response (non-serviceable / invalid):**

```json
{
  "serviceable": false,
  "message": "Please enter a valid 6-digit Indian pincode."
}
```

Validation: 6-digit Indian pincode (`/^[1-9][0-9]{5}$/`).

---

## Local theme development

When running `shopify theme dev` on the storefront, pincode checks still go through the **live store domain** App Proxy (`/apps/pincode/...`), not localhost.

**Requirements for local testing:**

1. Run `shopify app dev` in this app folder (tunnel active).
2. App must be installed on `octoberstore-2`.
3. App Proxy must route to the tunnel URL (CLI handles this during dev).

If checks fail locally, confirm the tunnel is running and the app proxy subpath matches `pincode`.

---

## File structure

```
october-pincode-app/
├── app/
│   ├── lib/
│   │   ├── pincode.js                 # Validation + zone matching
│   │   └── pincode-config.server.js   # Shop metafield read/write
│   ├── routes/
│   │   ├── app._index.jsx             # Admin UI
│   │   ├── app.jsx
│   │   ├── apps.pincode.check.jsx     # App Proxy JSON endpoint
│   │   ├── auth.*.jsx
│   │   └── webhooks.*
│   ├── shopify.server.js
│   ├── db.server.js
│   └── root.jsx
├── prisma/schema.prisma               # Session storage (Postgres / Neon)
├── react-router.config.js             # Vercel preset
├── vercel.json
├── shopify.app.october-pincode.toml   # App + proxy config
├── shopify.web.toml
├── vite.config.js
└── README.md
```

## Scopes

- `write_app_proxy` — required for App Proxy

Shop metafields (`custom.pincode_config`) use the Admin API session; no extra metafield scopes are required for shop-level JSON metafields.

## Blockers

- **Partner login required** for `shopify app config link`, `shopify app dev`, and install. This repo was scaffolded manually because non-interactive `npm init @shopify/app@latest` needs `--organization-id` or `--client-id`.
- **App Proxy + theme dev**: storefront JS calls the store's `/apps/pincode/check`; tunnel must be running during development.
