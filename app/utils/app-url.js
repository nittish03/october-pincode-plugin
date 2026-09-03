/** Resolve the public app URL for Shopify OAuth / App Bridge. */
export function getAppUrl() {
  const explicit = process.env.SHOPIFY_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
