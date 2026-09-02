/** @typedef {{ name: string, type: "prefix" | "range" | "catchall", prefixes?: string[], ranges?: { from: string, to: string }[], minDays: number, maxDays: number, serviceable?: boolean }} PincodeZone */

/** @typedef {{ warehousePincode: string, defaultMessage: string, zones: PincodeZone[] }} PincodeConfig */

export const DEFAULT_PINCODE_CONFIG = /** @type {PincodeConfig} */ ({
  warehousePincode: "110001",
  defaultMessage:
    "Sorry, we do not deliver to this pincode yet. Please contact us for assistance.",
  zones: [
    {
      name: "Metro",
      type: "prefix",
      prefixes: ["110", "400", "560", "600", "700"],
      minDays: 3,
      maxDays: 5,
      serviceable: true,
    },
    {
      name: "Tier 2",
      type: "prefix",
      prefixes: [
        "12", "13", "14", "20", "22", "30", "38", "40", "41", "45", "46", "47",
        "48", "50", "51", "52", "53", "56", "57", "58", "60", "61", "62", "63",
        "64", "67", "68", "69",
      ],
      minDays: 5,
      maxDays: 7,
      serviceable: true,
    },
    {
      name: "Rest of India",
      type: "catchall",
      minDays: 7,
      maxDays: 10,
      serviceable: true,
    },
  ],
});

const INDIAN_PINCODE_REGEX = /^[1-9][0-9]{5}$/;

/**
 * @param {string} pincode
 * @returns {boolean}
 */
export function isValidIndianPincode(pincode) {
  return INDIAN_PINCODE_REGEX.test(String(pincode || "").trim());
}

/**
 * @param {string} pincode
 * @param {PincodeZone} zone
 * @returns {boolean}
 */
function zoneMatches(pincode, zone) {
  if (zone.type === "catchall") {
    return true;
  }

  if (zone.type === "prefix" && zone.prefixes?.length) {
    return zone.prefixes.some((prefix) => pincode.startsWith(prefix));
  }

  if (zone.type === "range" && zone.ranges?.length) {
    const numeric = Number.parseInt(pincode, 10);
    return zone.ranges.some((range) => {
      const from = Number.parseInt(range.from, 10);
      const to = Number.parseInt(range.to, 10);
      return numeric >= from && numeric <= to;
    });
  }

  return false;
}

/**
 * @param {number} minDays
 * @param {number} maxDays
 * @returns {string}
 */
function formatDeliveryMessage(minDays, maxDays) {
  if (minDays === maxDays) {
    return `Delivery in ${minDays} business day${minDays === 1 ? "" : "s"}`;
  }
  return `Delivery in ${minDays}-${maxDays} business days`;
}

/**
 * @param {string} pincode
 * @param {PincodeConfig} config
 * @returns {{ serviceable: boolean, minDays?: number, maxDays?: number, message: string, zone?: string }}
 */
export function checkPincode(pincode, config) {
  const normalized = String(pincode || "").trim();

  if (!isValidIndianPincode(normalized)) {
    return {
      serviceable: false,
      message: "Please enter a valid 6-digit Indian pincode.",
    };
  }

  const zones = config?.zones?.length ? config.zones : DEFAULT_PINCODE_CONFIG.zones;

  for (const zone of zones) {
    if (!zoneMatches(normalized, zone)) {
      continue;
    }

    const serviceable = zone.serviceable !== false;
    if (!serviceable) {
      return {
        serviceable: false,
        message: config.defaultMessage || DEFAULT_PINCODE_CONFIG.defaultMessage,
        zone: zone.name,
      };
    }

    return {
      serviceable: true,
      minDays: zone.minDays,
      maxDays: zone.maxDays,
      message: formatDeliveryMessage(zone.minDays, zone.maxDays),
      zone: zone.name,
    };
  }

  return {
    serviceable: false,
    message: config.defaultMessage || DEFAULT_PINCODE_CONFIG.defaultMessage,
  };
}

/**
 * @param {unknown} value
 * @returns {PincodeConfig}
 */
export function normalizePincodeConfig(value) {
  if (!value || typeof value !== "object") {
    return structuredClone(DEFAULT_PINCODE_CONFIG);
  }

  const input = /** @type {Partial<PincodeConfig>} */ (value);

  return {
    warehousePincode:
      String(input.warehousePincode || DEFAULT_PINCODE_CONFIG.warehousePincode).trim() ||
      DEFAULT_PINCODE_CONFIG.warehousePincode,
    defaultMessage:
      String(input.defaultMessage || DEFAULT_PINCODE_CONFIG.defaultMessage).trim() ||
      DEFAULT_PINCODE_CONFIG.defaultMessage,
    zones:
      Array.isArray(input.zones) && input.zones.length
        ? input.zones.map((zone) => ({
            name: String(zone.name || "Zone").trim() || "Zone",
            type: zone.type === "range" || zone.type === "catchall" ? zone.type : "prefix",
            prefixes: Array.isArray(zone.prefixes)
              ? zone.prefixes.map((p) => String(p).trim()).filter(Boolean)
              : [],
            ranges: Array.isArray(zone.ranges)
              ? zone.ranges.map((range) => ({
                  from: String(range.from || "").trim(),
                  to: String(range.to || "").trim(),
                }))
              : [],
            minDays: Number.isFinite(Number(zone.minDays)) ? Number(zone.minDays) : 7,
            maxDays: Number.isFinite(Number(zone.maxDays)) ? Number(zone.maxDays) : 10,
            serviceable: zone.serviceable !== false,
          }))
        : structuredClone(DEFAULT_PINCODE_CONFIG.zones),
  };
}
