import { useEffect, useMemo, useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server.js";
import {
  getPincodeConfig,
  savePincodeConfig,
} from "../lib/pincode-config.server.js";
import { checkPincode, isValidIndianPincode } from "../lib/pincode.js";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const config = await getPincodeConfig(admin);
  return { config };
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
          <s-text-field
            label="Zone name"
            value={zone.name}
            onChange={(event) => updateZone(index, { name: event.currentTarget.value })}
          />

          <label>
            Match type
            <select
              value={zone.type}
              onChange={(event) => updateZone(index, { type: event.currentTarget.value })}
              style={{ display: "block", marginTop: "4px", width: "100%" }}
            >
              <option value="prefix">Pincode prefix</option>
              <option value="range">Pincode range</option>
              <option value="catchall">Catch-all (fallback)</option>
            </select>
          </label>

          {zone.type === "prefix" && (
            <s-text-field
              label="Prefixes (comma-separated)"
              details="Example: 110,400,560"
              value={(zone.prefixes || []).join(",")}
              onChange={(event) =>
                updateZone(index, {
                  prefixes: event.currentTarget.value
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                })
              }
            />
          )}

          {zone.type === "range" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <s-text-field
                label="From"
                value={zone.ranges?.[0]?.from || ""}
                onChange={(event) =>
                  updateZone(index, {
                    ranges: [{ from: event.currentTarget.value, to: zone.ranges?.[0]?.to || "" }],
                  })
                }
              />
              <s-text-field
                label="To"
                value={zone.ranges?.[0]?.to || ""}
                onChange={(event) =>
                  updateZone(index, {
                    ranges: [{ from: zone.ranges?.[0]?.from || "", to: event.currentTarget.value }],
                  })
                }
              />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <s-text-field
              label="Min days"
              type="number"
              value={String(zone.minDays ?? 7)}
              onChange={(event) =>
                updateZone(index, { minDays: Number.parseInt(event.currentTarget.value, 10) || 0 })
              }
            />
            <s-text-field
              label="Max days"
              type="number"
              value={String(zone.maxDays ?? 10)}
              onChange={(event) =>
                updateZone(index, { maxDays: Number.parseInt(event.currentTarget.value, 10) || 0 })
              }
            />
            <label style={{ alignSelf: "end" }}>
              <input
                type="checkbox"
                checked={zone.serviceable !== false}
                onChange={(event) => updateZone(index, { serviceable: event.currentTarget.checked })}
              />{" "}
              Serviceable
            </label>
          </div>

          <s-button variant="tertiary" onClick={() => removeZone(index)}>
            Remove zone
          </s-button>
        </div>
      ))}

      <s-button onClick={addZone}>Add zone</s-button>
    </div>
  );
}

export default function Index() {
  const { config: initialConfig } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const shopify = useAppBridge();

  const [config, setConfig] = useState(initialConfig);
  const [testPincode, setTestPincode] = useState("110001");

  useEffect(() => {
    if (actionData?.config) {
      setConfig(actionData.config);
    }
  }, [actionData?.config]);

  useEffect(() => {
    if (actionData?.message) {
      shopify.toast.show(actionData.message);
    }
  }, [actionData?.message, shopify]);

  const preview = useMemo(() => checkPincode(testPincode, config), [testPincode, config]);
  const isSaving = navigation.state !== "idle";

  return (
    <s-page heading="October Pincode Delivery">
      <s-section heading="Warehouse">
        <s-text-field
          label="Origin pincode"
          details="Used for reference in admin. Delivery estimates are zone-based."
          value={config.warehousePincode}
          onChange={(event) =>
            setConfig((current) => ({ ...current, warehousePincode: event.currentTarget.value }))
          }
        />
      </s-section>

      <s-section heading="Non-serviceable message">
        <s-text-field
          label="Default message"
          value={config.defaultMessage}
          onChange={(event) =>
            setConfig((current) => ({ ...current, defaultMessage: event.currentTarget.value }))
          }
        />
      </s-section>

      <s-section heading="Delivery zones">
        <p style={{ marginTop: 0 }}>
          Zones are evaluated top to bottom. Use a catch-all zone last for Rest of India.
        </p>
        <ZoneEditor
          zones={config.zones}
          onChange={(zones) => setConfig((current) => ({ ...current, zones }))}
        />
      </s-section>

      <s-section heading="Preview">
        <s-text-field
          label="Test pincode"
          value={testPincode}
          onChange={(event) => setTestPincode(event.currentTarget.value)}
          error={
            testPincode && !isValidIndianPincode(testPincode)
              ? "Enter a valid 6-digit Indian pincode"
              : undefined
          }
        />
        <pre style={{ background: "#f6f6f7", padding: "12px", borderRadius: "8px" }}>
          {JSON.stringify(preview, null, 2)}
        </pre>
      </s-section>

      <Form method="post">
        <input type="hidden" name="warehousePincode" value={config.warehousePincode} />
        <input type="hidden" name="defaultMessage" value={config.defaultMessage} />
        <input type="hidden" name="zonesJson" value={JSON.stringify(config.zones)} />
        <s-button type="submit" variant="primary" {...(isSaving ? { loading: true } : {})}>
          Save settings
        </s-button>
      </Form>

      <Form method="post" style={{ marginTop: "12px" }}>
        <input type="hidden" name="intent" value="reset" />
        <s-button type="submit" variant="tertiary">
          Restore India defaults
        </s-button>
      </Form>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
