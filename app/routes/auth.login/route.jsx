import { useState } from "react";
import { Form, useActionData, useLoaderData } from "react-router";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { login } from "../../shopify.server.js";
import { loginErrorMessage } from "./error.server.js";

export const loader = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return { errors };
};

export const action = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return { errors };
};

export default function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <AppProvider embedded={false}>
      <div style={{ padding: "2rem", fontFamily: "Inter, system-ui, sans-serif", maxWidth: "480px" }}>
        <h1 style={{ fontSize: "1.25rem", marginTop: 0 }}>Log in to October Pincode</h1>
        <Form method="post">
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
          {errors.shop && (
            <p style={{ color: "#d72c0d", marginTop: 0 }}>{errors.shop}</p>
          )}
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
      </div>
    </AppProvider>
  );
}
