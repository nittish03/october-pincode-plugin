export function loginErrorMessage(loginResult) {
  if (!loginResult) {
    return {};
  }

  const shop = loginResult.shop;
  if (shop) {
    return { shop: `Could not log in to ${shop}. Check the domain and try again.` };
  }

  return { shop: "Enter a valid shop domain, e.g. octoberstore-2.myshopify.com" };
}
