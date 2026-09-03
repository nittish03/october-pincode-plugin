import { useEffect, useState } from "react";

/**
 * Waits for the App Bridge CDN script to define `window.shopify` before
 * rendering children that call useAppBridge or Polaris web components.
 */
export function BridgeReady({ children, fallback = null }) {
  const [ready, setReady] = useState(
    () => typeof window === "undefined" || Boolean(window.shopify),
  );

  useEffect(() => {
    if (window.shopify) {
      setReady(true);
      return;
    }

    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      if (window.shopify) {
        setReady(true);
        window.clearInterval(interval);
      } else if (attempts > 200) {
        window.clearInterval(interval);
      }
    }, 50);

    return () => window.clearInterval(interval);
  }, []);

  if (!ready) {
    return (
      fallback ?? (
        <div style={{ padding: "2rem", fontFamily: "Inter, system-ui, sans-serif" }}>
          Loading October Pincode…
        </div>
      )
    );
  }

  return children;
}
