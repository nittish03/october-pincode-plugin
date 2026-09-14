import { useEffect, useMemo, useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server.js";
import {
  getPincodeConfig,
  savePincodeConfig,
} from "../lib/pincode-config.server.js";
import {
  COUNTRY_META,
  OCTOBER_COUNTRY_CODES,
  checkPostal,
  isValidPostal,
  normalizeCountryCode,
} from "../lib/pincode.js";

const fieldStyle = { display: "block", width: "100%", marginTop: "4px", padding: "8px", boxSizing: "border-box" };
const labelStyle = { display: "block", marginBottom: "12px", fontWeight: 500 };
const helperStyle = { margin: "4px 0 0", color: "#6d7175", fontSize: "0.8125rem", lineHeight: 1.4 };
const sectionStyle = {
  border: "1px solid #e3e3e3",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "16px",
  background: "#fff",
};
const cardStyle = {
  border: "1px solid #ddd",
  borderRadius: "8px",
  padding: "16px",
  display: "grid",
  gap: "12px",
};
const buttonStyle = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid #c9cccf",
  background: "#fff",
  cursor: "pointer",
  fontSize: "0.875rem",
};
const primaryButtonStyle = {
  ...buttonStyle,
  background: "#303030",
  color: "#fff",
  borderColor: "#303030",
};
const pageStyle = {
  padding: "20px",
  fontFamily: "Inter, system-ui, sans-serif",
  color: "#202223",
  maxWidth: "760px",
  margin: "0 auto",
};
const tabStyle = (active) => ({
  padding: "8px 12px",
  borderRadius: "6px",
  border: active ? "1px solid #303030" : "1px solid #c9cccf",
  background: active ? "#303030" : "#fff",
  color: active ? "#fff" : "#202223",
  cursor: "pointer",
  fontSize: "0.8125rem",
});

const EU_COUNTRY_CODES = ["DE", "FR", "IT", "ES"];

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
    return { ok: true, config, message: "Default delivery zones restored." };
  }

  const countries = JSON.parse(String(formData.get("countriesJson") || "{}"));
  const config = {
    warehousePincode: String(formData.get("warehousePincode") || "").trim(),
    defaultMessage: String(formData.get("defaultMessage") || "").trim(),
    zones: countries.IN?.zones || JSON.parse(String(formData.get("zonesJson") || "[]")),
    countries,
  };

  const saved = await savePincodeConfig(admin, config);
  return { ok: true, config: saved, message: "Settings saved." };
};

function isCatchallZone(zone, index, zones) {
  return zone.type === "catchall" || index === zones.length - 1;
}

function formatPreviewResult(result) {
  if (!result.serviceable) {
    return {
      color: "#d72c0d",
      text: `✗ ${result.message}`,
    };
  }

  const days =
    result.minDays === result.maxDays
      ? `${result.minDays} business day${result.minDays === 1 ? "" : "s"}`
      : `${result.minDays}–${result.maxDays} business days`;
  const area = result.zone ? ` (${result.zone})` : "";

  return {
    color: "#008060",
    text: `✓ Delivers in ${days}${area}`,
  };
}

function ZoneEditor({ zones, onChange, countryCode }) {
  const meta = COUNTRY_META[countryCode] || COUNTRY_META.IN;
  const catchallLabel =
    countryCode === "IN" ? "Everywhere else (Rest of India)" : `Everywhere else (${meta.label})`;

  const updateZone = (index, patch) => {
    onChange(zones.map((zone, zoneIndex) => (zoneIndex === index ? { ...zone, ...patch } : zone)));
  };

  const removeZone = (index) => {
    if (isCatchallZone(zones[index], index, zones) || zones.length <= 1) {
      return;
    }
    onChange(zones.filter((_, zoneIndex) => zoneIndex !== index));
  };

  const addZone = () => {
    const catchall = zones[zones.length - 1];
    const specificZones = zones.slice(0, -1);
    onChange([
      ...specificZones,
      {
        name: "New area",
        type: "prefix",
        prefixes: [],
        ranges: [],
        minDays: 7,
        maxDays: 10,
        serviceable: true,
      },
      catchall?.type === "catchall"
        ? catchall
        : {
            name: catchallLabel,
            type: "catchall",
            minDays: 10,
            maxDays: 14,
            serviceable: true,
          },
    ]);
  };

  const catchallIndex = zones.length - 1;

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {zones.map((zone, index) => {
        const isCatchall = isCatchallZone(zone, index, zones);

        if (isCatchall) {
          return (
            <div key={`catchall-${index}`} style={cardStyle}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>{catchallLabel}</h3>
              <p style={{ ...helperStyle, margin: 0 }}>
                Applies to any {meta.postalLabel.toLowerCase()} not matched by the areas above.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label style={labelStyle}>
                  From
                  <input
                    style={fieldStyle}
                    type="number"
                    min="1"
                    value={String(zone.minDays ?? 10)}
                    onChange={(event) =>
                      updateZone(index, {
                        type: "catchall",
                        name: zone.name || catchallLabel,
                        minDays: Number.parseInt(event.target.value, 10) || 0,
                      })
                    }
                  />
                  <span style={helperStyle}>days</span>
                </label>
                <label style={labelStyle}>
                  To
                  <input
                    style={fieldStyle}
                    type="number"
                    min="1"
                    value={String(zone.maxDays ?? 14)}
                    onChange={(event) =>
                      updateZone(index, {
                        type: "catchall",
                        name: zone.name || catchallLabel,
                        maxDays: Number.parseInt(event.target.value, 10) || 0,
                      })
                    }
                  />
                  <span style={helperStyle}>days</span>
                </label>
              </div>

              <label style={{ marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={zone.serviceable !== false}
                  onChange={(event) =>
                    updateZone(index, {
                      type: "catchall",
                      name: zone.name || catchallLabel,
                      serviceable: event.target.checked,
                    })
                  }
                />{" "}
                We deliver here
              </label>
            </div>
          );
        }

        return (
          <div key={`zone-${index}`} style={cardStyle}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Area {index + 1}</h3>

            <label style={labelStyle}>
              Delivery area name
              <input
                style={fieldStyle}
                placeholder="e.g. Metro cities, West Coast"
                value={zone.name}
                onChange={(event) => updateZone(index, { name: event.target.value, type: "prefix" })}
              />
            </label>

            <label style={labelStyle}>
              {meta.postalLabel} starts with
              <input
                style={fieldStyle}
                placeholder={countryCode === "IN" ? "110, 400, 560" : "90, 100, 200"}
                value={(zone.prefixes || []).join(", ")}
                onChange={(event) =>
                  updateZone(index, {
                    type: "prefix",
                    prefixes: event.target.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean),
                  })
                }
              />
              <span style={helperStyle}>
                Enter first digits of the {meta.postalLabel.toLowerCase()}, separated by commas.
              </span>
            </label>

            <div>
              <span style={{ fontWeight: 500, display: "block", marginBottom: "8px" }}>Delivery time</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  From
                  <input
                    style={fieldStyle}
                    type="number"
                    min="1"
                    value={String(zone.minDays ?? 7)}
                    onChange={(event) =>
                      updateZone(index, { minDays: Number.parseInt(event.target.value, 10) || 0 })
                    }
                  />
                  <span style={helperStyle}>days</span>
                </label>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  To
                  <input
                    style={fieldStyle}
                    type="number"
                    min="1"
                    value={String(zone.maxDays ?? 10)}
                    onChange={(event) =>
                      updateZone(index, { maxDays: Number.parseInt(event.target.value, 10) || 0 })
                    }
                  />
                  <span style={helperStyle}>days</span>
                </label>
              </div>
            </div>

            <label style={{ marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={zone.serviceable !== false}
                onChange={(event) => updateZone(index, { serviceable: event.target.checked })}
              />{" "}
              We deliver here
            </label>

            {index < catchallIndex && zones.length > 1 && (
              <button type="button" style={buttonStyle} onClick={() => removeZone(index)}>
                Remove this area
              </button>
            )}
          </div>
        );
      })}

      <button type="button" style={buttonStyle} onClick={addZone}>
        Add delivery area
      </button>
    </div>
  );
}

export default function Index() {
  const { config: initialConfig } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();

  const [config, setConfig] = useState(initialConfig);
  const [activeCountry, setActiveCountry] = useState("IN");
  const [testPostal, setTestPostal] = useState("110001");
  const [checkedPostal, setCheckedPostal] = useState(null);

  useEffect(() => {
    if (actionData?.config) {
      setConfig(actionData.config);
      setCheckedPostal(null);
    }
  }, [actionData?.config]);

  useEffect(() => {
    if (actionData?.message && window.shopify?.toast) {
      window.shopify.toast.show(actionData.message);
    }
  }, [actionData?.message]);

  const activeMeta = COUNTRY_META[activeCountry] || COUNTRY_META.IN;
  const activeCountryConfig = config.countries?.[activeCountry] || {
    enabled: true,
    label: activeMeta.label,
    zones: config.zones,
  };

  const preview = useMemo(() => {
    if (!checkedPostal && checkedPostal !== "") {
      return null;
    }
    return checkPostal(activeCountry, checkedPostal, config);
  }, [checkedPostal, config, activeCountry]);

  const previewDisplay = preview ? formatPreviewResult(preview) : null;
  const isSaving = navigation.state !== "idle";

  const updateCountry = (countryCode, patch) => {
    setConfig((current) => ({
      ...current,
      countries: {
        ...current.countries,
        [countryCode]: {
          ...current.countries?.[countryCode],
          ...patch,
        },
      },
      ...(countryCode === "IN" && patch.zones ? { zones: patch.zones } : {}),
    }));
  };

  const handleCheckPostal = () => {
    setCheckedPostal(testPostal.trim());
  };

  const countryTabs = [
    { code: "IN", label: "India" },
    { code: "US", label: "US" },
    { code: "GB", label: "UK" },
    { code: "AE", label: "UAE" },
    { code: "JP", label: "Japan" },
    { code: "CA", label: "Canada" },
    { code: "AU", label: "Australia" },
    { code: "EU", label: "EU", isGroup: true },
  ];

  const visibleCountryCode =
    activeCountry === "EU" ? EU_COUNTRY_CODES[0] : normalizeCountryCode(activeCountry);

  return (
    <div style={pageStyle}>
      <h1 style={{ fontSize: "1.5rem", marginTop: 0, marginBottom: "8px" }}>Delivery by postal code</h1>
      <p style={{ marginTop: 0, marginBottom: "24px", color: "#6d7175", lineHeight: 1.5 }}>
        Set delivery timelines by country and postal code. Customers see this on the product page
        for their current market.
      </p>

      <section style={sectionStyle}>
        <label style={labelStyle}>
          Your warehouse pincode
          <input
            style={fieldStyle}
            inputMode="numeric"
            maxLength={6}
            value={config.warehousePincode}
            onChange={(event) =>
              setConfig((current) => ({ ...current, warehousePincode: event.target.value }))
            }
          />
          <span style={helperStyle}>Where orders ship from (for your reference).</span>
        </label>
      </section>

      <section style={sectionStyle}>
        <label style={labelStyle}>
          Message when we don&apos;t deliver
          <input
            style={fieldStyle}
            placeholder="Sorry, we do not deliver to this location yet."
            value={config.defaultMessage}
            onChange={(event) =>
              setConfig((current) => ({ ...current, defaultMessage: event.target.value }))
            }
          />
        </label>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0, marginBottom: "12px" }}>Countries</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
          {countryTabs.map((tab) => (
            <button
              key={tab.code}
              type="button"
              style={tabStyle(activeCountry === tab.code)}
              onClick={() => {
                setActiveCountry(tab.code);
                setCheckedPostal(null);
                if (tab.code === "EU") {
                  setTestPostal(COUNTRY_META.DE.placeholder.replace("e.g. ", ""));
                } else {
                  setTestPostal(COUNTRY_META[tab.code].placeholder.replace("e.g. ", ""));
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeCountry === "EU" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
            {EU_COUNTRY_CODES.map((code) => (
              <button
                key={code}
                type="button"
                style={tabStyle(visibleCountryCode === code)}
                onClick={() => {
                  setActiveCountry(code);
                  setCheckedPostal(null);
                  setTestPostal(COUNTRY_META[code].placeholder.replace("e.g. ", ""));
                }}
              >
                {COUNTRY_META[code].label}
              </button>
            ))}
          </div>
        )}

        {activeCountry !== "EU" && (
          <>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <input
                type="checkbox"
                checked={activeCountryConfig.enabled !== false}
                onChange={(event) =>
                  updateCountry(activeCountry, { enabled: event.target.checked })
                }
              />
              Enable delivery checker for {activeMeta.label}
            </label>

            {activeCountryConfig.enabled !== false && (
              <ZoneEditor
                countryCode={activeCountry}
                zones={activeCountryConfig.zones || []}
                onChange={(zones) => updateCountry(activeCountry, { zones })}
              />
            )}
          </>
        )}

        {activeCountry === "EU" &&
          EU_COUNTRY_CODES.map((code) => (
            <div key={code} style={{ marginBottom: "24px" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "1rem" }}>{COUNTRY_META[code].label}</h3>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <input
                  type="checkbox"
                  checked={config.countries?.[code]?.enabled !== false}
                  onChange={(event) => updateCountry(code, { enabled: event.target.checked })}
                />
                Enable delivery checker
              </label>
              {config.countries?.[code]?.enabled !== false && (
                <ZoneEditor
                  countryCode={code}
                  zones={config.countries?.[code]?.zones || []}
                  onChange={(zones) => updateCountry(code, { zones })}
                />
              )}
            </div>
          ))}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0, marginBottom: "12px" }}>Try a postal code</h2>
        <label style={labelStyle}>
          Country
          <select
            style={fieldStyle}
            value={visibleCountryCode}
            onChange={(event) => {
              const code = normalizeCountryCode(event.target.value);
              setActiveCountry(code);
              setCheckedPostal(null);
              setTestPostal(COUNTRY_META[code].placeholder.replace("e.g. ", ""));
            }}
          >
            {OCTOBER_COUNTRY_CODES.map((code) => (
              <option key={code} value={code}>
                {COUNTRY_META[code].label}
              </option>
            ))}
          </select>
        </label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <input
            style={{ ...fieldStyle, flex: "1 1 200px", marginTop: 0 }}
            inputMode={activeMeta.inputMode}
            maxLength={activeMeta.maxlength}
            placeholder={COUNTRY_META[visibleCountryCode].placeholder}
            value={testPostal}
            onChange={(event) => setTestPostal(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleCheckPostal();
              }
            }}
          />
          <button type="button" style={primaryButtonStyle} onClick={handleCheckPostal}>
            Check
          </button>
        </div>
        {checkedPostal !== null &&
          !isValidPostal(visibleCountryCode, checkedPostal) &&
          !(visibleCountryCode === "AE" && !checkedPostal) && (
            <p style={{ color: "#d72c0d", marginBottom: 0, marginTop: "12px" }}>
              ✗ Please enter a valid {COUNTRY_META[visibleCountryCode].postalLabel.toLowerCase()}.
            </p>
          )}
        {previewDisplay && (
          <p
            style={{
              color: previewDisplay.color,
              marginBottom: 0,
              marginTop: "12px",
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {previewDisplay.text}
          </p>
        )}
      </section>

      <Form method="post">
        <input type="hidden" name="warehousePincode" value={config.warehousePincode} />
        <input type="hidden" name="defaultMessage" value={config.defaultMessage} />
        <input type="hidden" name="zonesJson" value={JSON.stringify(config.countries?.IN?.zones || config.zones)} />
        <input type="hidden" name="countriesJson" value={JSON.stringify(config.countries || {})} />
        <button type="submit" style={primaryButtonStyle} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </button>
      </Form>

      <Form method="post" style={{ marginTop: "12px" }}>
        <input type="hidden" name="intent" value="reset" />
        <button type="submit" style={buttonStyle} disabled={isSaving}>
          Reset to default zones
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
    <div style={pageStyle}>
      <h1 style={{ fontSize: "1.25rem", marginTop: 0 }}>Delivery by postal code</h1>
      <p>{message}</p>
    </div>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
