import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server.js";
import { getShopifyApiKey } from "../utils/app-url.js";

export const loader = async ({ request }) => {
  try {
    await authenticate.admin(request);
  } catch (error) {
    if (error instanceof Response) {
      console.error("[app loader] authenticate.admin returned", error.status, request.url);
      throw error;
    }
    console.error("[app loader] authenticate.admin failed", error);
    throw error;
  }

  const apiKey = getShopifyApiKey();
  if (!apiKey) {
    console.error("[app loader] SHOPIFY_API_KEY is missing");
    throw new Response(
      "SHOPIFY_API_KEY is not configured. Set SHOPIFY_API_KEY (or API_KEY) in your hosting environment.",
      { status: 500, statusText: "Server Misconfiguration" },
    );
  }

  return { apiKey };
};

export const meta = ({ data }) => {
  if (!data?.apiKey) {
    return [];
  }

  return [{ name: "shopify-api-key", content: data.apiKey }];
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <nav
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid #e3e3e3",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <a href="/app" style={{ color: "#005bd3", textDecoration: "none", fontWeight: 500 }}>
          Delivery zones
        </a>
      </nav>
      <Outlet />
    </AppProvider>
  );
}

function AdminErrorFallback({ title, message }) {
  return (
    <div style={{ padding: "2rem", fontFamily: "Inter, system-ui, sans-serif", color: "#202223" }}>
      <h1 style={{ fontSize: "1.25rem", marginTop: 0 }}>{title}</h1>
      <p style={{ lineHeight: 1.5 }}>{message}</p>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (
    error?.constructor?.name === "ErrorResponse" ||
    error?.constructor?.name === "ErrorResponseImpl"
  ) {
    if (error.status === 500 && !error.data) {
      return (
        <AdminErrorFallback
          title="Authentication failed"
          message="October Pincode could not complete Shopify sign-in. Open the app again from Shopify Admin (Apps → October Pincode). If this keeps happening, confirm DATABASE_URL, SHOPIFY_API_SECRET, and SHOPIFY_APP_URL are set on Vercel, then reinstall the app."
        />
      );
    }

    if (error.status === 410 && !error.data) {
      return (
        <AdminErrorFallback
          title="Session expired"
          message="Your admin session expired. Close this tab and reopen October Pincode from Shopify Admin."
        />
      );
    }

    if (error.status === 302 || error.status === 301) {
      return (
        <AdminErrorFallback
          title="Redirecting to Shopify"
          message="Completing sign-in… If this page stays blank, close the tab and reopen October Pincode from Shopify Admin."
        />
      );
    }

    return boundary.error(error);
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  return <AdminErrorFallback title="Something went wrong" message={message} />;
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
