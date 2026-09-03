import { useEffect, useMemo, useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server.js";
import {
  getPincodeConfig,
  savePincodeConfig,
} from "../lib/pincode-config.server.js";
import { checkPincode, isValidIndianPincode } from "../lib/pincode.js";

const fieldStyle = { display: "block", width: "100%", marginTop: "4px", padding: "8px" };
const labelStyle = { display: "block", marginBottom: "12px", fontWeight: 500 };
const sectionStyle = {
  border: "1px solid #e3e3e3",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "16px",
  background: "#fff",
};
const buttonStyle = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid #c9cccf",
  background: "#fff",
  cursor: "pointer",
};
const primaryButtonStyle = {
  ...buttonStyle,
  background: "#303030",
  color: "#fff",
  borderColor: "#303030",
};

export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const config = await getPincodeConfig(admin);
    return { config };
  } catch (error) {
    if (error instanceof Response) {
      console.error("[app._index loader] auth response", error.status, request.url);
      throw error;
    }
    console.error("[app._index loader] failed", error);
    throw error;
  }
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "reset") {
    const config = await savePincodeConfig(admin, undefined);
    return { ok: true, config, message: "Defaults restored." };
  }

  const config = {
    warehousePincode: String(formData.get("warehousePincode") || "").trim(),
    defaultMessage: String(formData.get("defaultMessage") || "").trim(),
    zones: JSON.parse(String(formData.get("zonesJson") || "[]")),
  };

  const saved = await savePincodeConfig(admin, config);
  return { ok: true, config: saved, message: "Delivery settings saved." };
};

function ZoneEditor({ zones, onChange }) {
  const updateZone = (index, patch) => {
    onChange(zones.map((zone, zoneIndex) => (zoneIndex === index ? { ...zone, ...patch } : zone)));
  };

  const removeZone = (index) => {
    onChange(zones.filter((_, zoneIndex) => zoneIndex !== index));
  };

  const addZone = () => {
    onChange([
      ...zones,
      {
        name: "New zone",
        type: "prefix",
        prefixes: [],
        ranges: [],
        minDays: 7,
        maxDays: 10,
        serviceable: true,
      },
    ]);
  };

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {zones.map((zone, index) => (
        <div
          key={`${zone.name}-${index}`}
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "16px",
            display: "grid",
            gap: "12px",
          }}
        >
          <label style={labelStyle}>
            Zone name
            <input
              style={fieldStyle}
              value={zone.name}
              onChange={(event) => updateZone(index, { name: event.target.value })}
            />
          </label>

          <label style={labelStyle}>
            Match type
            <select
              value={zone.type}
              onChange={(event) => updateZone(index, { type: event.target.value })}
              style={fieldStyle}
            >
              <option value="prefix">Pincode prefix</option>
              <option value="range">Pincode range</option>
              <option value="catchall">Catch-all (fallback)</option>
            </select>
          </label>

          {zone.type === "prefix" && (
            <label style={labelStyle}>
              Prefixes (comma-separated)
              <input
                style={fieldStyle}
                placeholder="110,400,560"
                value={(zone.prefixes || []).join(",")}
                onChange={(event) =>
                  updateZone(index, {
                    prefixes: event.target.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
          )}

          {zone.type === "range" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <label style={labelStyle}>
                From
                <input
                  style={fieldStyle}
                  value={zone.ranges?.[0]?.from || ""}
                  onChange={(event) =>
                    updateZone(index, {
                      ranges: [{ from: event.target.value, to: zone.ranges?.[0]?.to || "" }],
                    })
                  }
                />
              </label>
              <label style={labelStyle}>
                To
                <input
                  style={fieldStyle}
                  value={zone.ranges?.[0]?.to || ""}
                  onChange={(event) =>
                    updateZone(index, {
                      ranges: [{ from: zone.ranges?.[0]?.from || "", to: event.target.value }],
                    })
                  }
                />
              </label>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <label style={labelStyle}>
              Min days
              <input
                style={fieldStyle}
                type="number"
                value={String(zone.minDays ?? 7)}
                onChange={(event) =>
                  updateZone(index, { minDays: Number.parseInt(event.target.value, 10) || 0 })
                }
              />
            </label>
            <label style={labelStyle}>
              Max days
              <input
                style={fieldStyle}
                type="number"
                value={String(zone.maxDays ?? 10)}
                onChange={(event) =>
                  updateZone(index, { maxDays: Number.parseInt(event.target.value, 10) || 0 })
                }
              />
            </label>
            <label style={{ alignSelf: "end" }}>
              <input
                type="checkbox"
                checked={zone.serviceable !== false}
                onChange={(event) => updateZone(index, { serviceable: event.target.checked })}
              />{" "}
              Serviceable
            </label>
          </div>

          <button type="button" style={buttonStyle} onClick={() => removeZone(index)}>
            Remove zone
          </button>
        </div>
      ))}

      <button type="button" style={buttonStyle} onClick={addZone}>
        Add zone
      </button>
    </div>
  );
}

export default function Index() {
  const { config: initialConfig } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();

  const [config, setConfig] = useState(initialConfig);
  const [testPincode, setTestPincode] = useState("110001");

  useEffect(() => {
    if (actionData?.config) {
      setConfig(actionData.config);
    }
  }, [actionData?.config]);

  useEffect(() => {
    if (actionData?.message && window.shopify?.toast) {
      window.shopify.toast.show(actionData.message);
    }
  }, [actionData?.message]);

  const preview = useMemo(() => checkPincode(testPincode, config), [testPincode, config]);
  const isSaving = navigation.state !== "idle";
  const pincodeError =
    testPincode && !isValidIndianPincode(testPincode)
      ? "Enter a valid 6-digit Indian pincode"
      : null;

  return (
    <div style={{ padding: "20px", fontFamily: "Inter, system-ui, sans-serif", color: "#202223" }}>
      <h1 style={{ fontSize: "1.5rem", marginTop: 0 }}>October Pincode Delivery</h1>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Warehouse</h2>
        <label style={labelStyle}>
          Origin pincode
          <input
            style={fieldStyle}
            value={config.warehousePincode}
            onChange={(event) =>
              setConfig((current) => ({ ...current, warehousePincode: event.target.value }))
            }
          />
        </label>
        <p style={{ margin: "8px 0 0", color: "#6d7175", fontSize: "0.875rem" }}>
          Used for reference in admin. Delivery estimates are zone-based.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Non-serviceable message</h2>
        <label style={labelStyle}>
          Default message
          <input
            style={fieldStyle}
            value={config.defaultMessage}
            onChange={(event) =>
              setConfig((current) => ({ ...current, defaultMessage: event.target.value }))
            }
          />
        </label>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Delivery zones</h2>
        <p style={{ marginTop: 0 }}>
          Zones are evaluated top to bottom. Use a catch-all zone last for Rest of India.
        </p>
        <ZoneEditor
          zones={config.zones}
          onChange={(zones) => setConfig((current) => ({ ...current, zones }))}
        />
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Preview</h2>
        <label style={labelStyle}>
          Test pincode
          <input
            style={fieldStyle}
            value={testPincode}
            onChange={(event) => setTestPincode(event.target.value)}
          />
        </label>
        {pincodeError && (
          <p style={{ color: "#d72c0d", marginTop: 0 }}>{pincodeError}</p>
        )}
        <pre style={{ background: "#f6f6f7", padding: "12px", borderRadius: "8px" }}>
          {JSON.stringify(preview, null, 2)}
        </pre>
      </section>

      <Form method="post">
        <input type="hidden" name="warehousePincode" value={config.warehousePincode} />
        <input type="hidden" name="defaultMessage" value={config.defaultMessage} />
        <input type="hidden" name="zonesJson" value={JSON.stringify(config.zones)} />
        <button type="submit" style={primaryButtonStyle} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save settings"}
        </button>
      </Form>

      <Form method="post" style={{ marginTop: "12px" }}>
        <input type="hidden" name="intent" value="reset" />
        <button type="submit" style={buttonStyle} disabled={isSaving}>
          Restore India defaults
        </button>
      </Form>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (
    error?.constructor?.name === "ErrorResponse" ||
    error?.constructor?.name === "ErrorResponseImpl"
  ) {
    return boundary.error(error);
  }

  const message =
    error instanceof Error ? error.message : "Could not load delivery settings.";

  return (
    <div style={{ padding: "2rem", fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.25rem", marginTop: 0 }}>October Pincode Delivery</h1>
      <p>{message}</p>
    </div>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
