import { useState } from "react";
import { Form, redirect, useLoaderData } from "react-router";
import { login } from "../../shopify.server.js";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  // Shopify Admin loads the embedded app at "/" with shop, host, id_token,
  // embedded, hmac and session params. Forward every param to /app so
  // authenticate.admin() can run token exchange and persist a Session.
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function Index() {
  const { showForm } = useLoaderData();
  const [shop, setShop] = useState("");

  return (
    <div style={{ padding: "2rem", fontFamily: "Inter, system-ui, sans-serif", maxWidth: "480px" }}>
      <h1 style={{ fontSize: "1.25rem", marginTop: 0 }}>October Pincode</h1>
      <p style={{ lineHeight: 1.5 }}>
        Pincode-based delivery availability for your Shopify storefront. Install the app from your
        Shopify Admin, or log in with your shop domain below.
      </p>
      {showForm && (
        <Form method="post" action="/auth/login">
          <label style={{ display: "block", marginBottom: "12px" }}>
            Shop domain
            <input
              name="shop"
              value={shop}
              onChange={(event) => setShop(event.target.value)}
              autoComplete="on"
              placeholder="octoberstore-2.myshopify.com"
              style={{
                display: "block",
                width: "100%",
                marginTop: "4px",
                padding: "8px",
              }}
            />
          </label>
          <button
            type="submit"
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid #303030",
              background: "#303030",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Log in
          </button>
        </Form>
      )}
    </div>
  );
}
