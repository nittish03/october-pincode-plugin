/** @typedef {{ name: string, type: "prefix" | "range" | "catchall", prefixes?: string[], ranges?: { from: string, to: string }[], minDays: number, maxDays: number, serviceable?: boolean }} PincodeZone */

/** @typedef {{ enabled: boolean, label: string, zones: PincodeZone[] }} CountryConfig */

/** @typedef {{ warehousePincode: string, defaultMessage: string, zones: PincodeZone[], countries?: Record<string, CountryConfig> }} PincodeConfig */

export const OCTOBER_COUNTRY_CODES = [
  "IN",
  "US",
  "GB",
  "AE",
  "JP",
  "CA",
  "AU",
  "DE",
  "FR",
  "IT",
  "ES",
];

/** @type {Record<string, { label: string, postalLabel: string, placeholder: string, maxlength: number, inputMode: string, optional: boolean }>} */
export const COUNTRY_META = {
  IN: {
    label: "India",
    postalLabel: "Pincode",
    placeholder: "e.g. 110001",
    maxlength: 6,
    inputMode: "numeric",
    optional: false,
  },
  US: {
    label: "United States",
    postalLabel: "ZIP code",
    placeholder: "e.g. 90210",
    maxlength: 10,
    inputMode: "numeric",
    optional: false,
  },
  GB: {
    label: "United Kingdom",
    postalLabel: "Postcode",
    placeholder: "e.g. SW1A 1AA",
    maxlength: 8,
    inputMode: "text",
    optional: false,
  },
  AE: {
    label: "United Arab Emirates",
    postalLabel: "Area",
    placeholder: "Optional — enter area or leave blank",
    maxlength: 20,
    inputMode: "text",
    optional: true,
  },
  JP: {
    label: "Japan",
    postalLabel: "Postal code",
    placeholder: "e.g. 100-0001",
    maxlength: 8,
    inputMode: "numeric",
    optional: false,
  },
  CA: {
    label: "Canada",
    postalLabel: "Postal code",
    placeholder: "e.g. M5H 2N2",
    maxlength: 7,
    inputMode: "text",
    optional: false,
  },
  AU: {
    label: "Australia",
    postalLabel: "Postcode",
    placeholder: "e.g. 2000",
    maxlength: 4,
    inputMode: "numeric",
    optional: false,
  },
  DE: {
    label: "Germany",
    postalLabel: "Postcode",
    placeholder: "e.g. 10115",
    maxlength: 5,
    inputMode: "numeric",
    optional: false,
  },
  FR: {
    label: "France",
    postalLabel: "Postcode",
    placeholder: "e.g. 75001",
    maxlength: 5,
    inputMode: "numeric",
    optional: false,
  },
  IT: {
    label: "Italy",
    postalLabel: "Postcode",
    placeholder: "e.g. 00118",
    maxlength: 5,
    inputMode: "numeric",
    optional: false,
  },
  ES: {
    label: "Spain",
    postalLabel: "Postcode",
    placeholder: "e.g. 28001",
    maxlength: 5,
    inputMode: "numeric",
    optional: false,
  },
};

const DEFAULT_IN_ZONES = [
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
];

/** @param {string} countryCode @returns {PincodeZone[]} */
function defaultCatchallZones(countryCode) {
  const label = COUNTRY_META[countryCode]?.label || countryCode;
  return [
    {
      name: `All ${label}`,
      type: "catchall",
      minDays: 10,
      maxDays: 14,
      serviceable: true,
    },
  ];
}

/** @returns {Record<string, CountryConfig>} */
export function buildDefaultCountries() {
  return {
    IN: {
      enabled: true,
      label: COUNTRY_META.IN.label,
      zones: structuredClone(DEFAULT_IN_ZONES),
    },
    US: { enabled: true, label: COUNTRY_META.US.label, zones: defaultCatchallZones("US") },
    GB: { enabled: true, label: COUNTRY_META.GB.label, zones: defaultCatchallZones("GB") },
    AE: { enabled: true, label: COUNTRY_META.AE.label, zones: defaultCatchallZones("AE") },
    JP: { enabled: true, label: COUNTRY_META.JP.label, zones: defaultCatchallZones("JP") },
    CA: { enabled: true, label: COUNTRY_META.CA.label, zones: defaultCatchallZones("CA") },
    AU: { enabled: true, label: COUNTRY_META.AU.label, zones: defaultCatchallZones("AU") },
    DE: { enabled: true, label: COUNTRY_META.DE.label, zones: defaultCatchallZones("DE") },
    FR: { enabled: true, label: COUNTRY_META.FR.label, zones: defaultCatchallZones("FR") },
    IT: { enabled: true, label: COUNTRY_META.IT.label, zones: defaultCatchallZones("IT") },
    ES: { enabled: true, label: COUNTRY_META.ES.label, zones: defaultCatchallZones("ES") },
  };
}

export const DEFAULT_PINCODE_CONFIG = /** @type {PincodeConfig} */ ({
  warehousePincode: "110001",
  defaultMessage:
    "Sorry, we do not deliver to this location yet. Please contact us for assistance.",
  zones: structuredClone(DEFAULT_IN_ZONES),
  countries: buildDefaultCountries(),
});

const POSTAL_PATTERNS = {
  IN: /^[1-9][0-9]{5}$/,
  US: /^[0-9]{5}(-[0-9]{4})?$/,
  GB: /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i,
  CA: /^[A-Z][0-9][A-Z]\s?[0-9][A-Z][0-9]$/i,
  AU: /^[0-9]{4}$/,
  DE: /^[0-9]{5}$/,
  FR: /^[0-9]{5}$/,
  IT: /^[0-9]{5}$/,
  ES: /^[0-9]{5}$/,
  JP: /^[0-9]{3}-?[0-9]{4}$/,
};

const INDIAN_PINCODE_REGEX = POSTAL_PATTERNS.IN;

/**
 * @param {string} countryCode
 * @returns {string}
 */
export function normalizeCountryCode(countryCode) {
  const normalized = String(countryCode || "IN").trim().toUpperCase();
  return OCTOBER_COUNTRY_CODES.includes(normalized) ? normalized : "IN";
}

/**
 * @param {string} countryCode
 * @param {string} postal
 * @returns {string}
 */
export function normalizePostal(countryCode, postal) {
  const country = normalizeCountryCode(countryCode);
  const value = String(postal || "").trim();

  if (!value) {
    return "";
  }

  if (country === "GB") {
    return value.toUpperCase().replace(/\s+/g, " ").trim();
  }

  if (country === "CA") {
    const compact = value.toUpperCase().replace(/\s+/g, "");
    if (/^[A-Z][0-9][A-Z][0-9][A-Z][0-9]$/.test(compact)) {
      return `${compact.slice(0, 3)} ${compact.slice(3)}`;
    }
    return value.toUpperCase().replace(/\s+/g, " ").trim();
  }

  if (country === "JP") {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 7) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    return value;
  }

  if (country === "US") {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 9) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    if (digits.length === 5) {
      return digits;
    }
  }

  return value;
}

/**
 * @param {string} pincode
 * @returns {boolean}
 */
export function isValidIndianPincode(pincode) {
  return isValidPostal("IN", pincode);
}

/**
 * @param {string} countryCode
 * @param {string} postal
 * @returns {boolean}
 */
export function isValidPostal(countryCode, postal) {
  const country = normalizeCountryCode(countryCode);
  const normalized = normalizePostal(country, postal);

  if (country === "AE") {
    return true;
  }

  if (!normalized) {
    return COUNTRY_META[country]?.optional === true;
  }

  const pattern = POSTAL_PATTERNS[country];
  return pattern ? pattern.test(normalized) : false;
}

/**
 * @param {string} countryCode
 * @param {string} postal
 * @returns {string}
 */
export function invalidPostalMessage(countryCode, postal) {
  const country = normalizeCountryCode(countryCode);
  const meta = COUNTRY_META[country] || COUNTRY_META.IN;
  const normalized = normalizePostal(country, postal);

  if (country === "AE" && !normalized) {
    return "";
  }

  if (country === "IN") {
    return "Please enter a valid 6-digit Indian pincode.";
  }

  return `Please enter a valid ${meta.postalLabel.toLowerCase()}.`;
}

/**
 * @param {string} postal
 * @param {PincodeZone} zone
 * @param {string} countryCode
 * @returns {boolean}
 */
function zoneMatches(postal, zone, countryCode) {
  if (zone.type === "catchall") {
    return true;
  }

  const normalized = normalizePostal(countryCode, postal);
  const matchValue =
    countryCode === "GB" || countryCode === "CA"
      ? normalized.replace(/\s+/g, "")
      : normalized;

  if (zone.type === "prefix" && zone.prefixes?.length) {
    return zone.prefixes.some((prefix) => matchValue.startsWith(prefix));
  }

  if (zone.type === "range" && zone.ranges?.length) {
    const numeric = Number.parseInt(matchValue.replace(/\D/g, ""), 10);
    if (!Number.isFinite(numeric)) {
      return false;
    }

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
 * @param {PincodeConfig} config
 * @param {string} countryCode
 * @returns {CountryConfig | null}
 */
export function getCountryConfig(config, countryCode) {
  const country = normalizeCountryCode(countryCode);
  const countries = config?.countries;

  if (countries?.[country]) {
    return countries[country];
  }

  if (country === "IN" && config?.zones?.length) {
    return {
      enabled: true,
      label: COUNTRY_META.IN.label,
      zones: config.zones,
    };
  }

  const defaults = buildDefaultCountries();
  return defaults[country] || null;
}

/**
 * @param {string} countryCode
 * @param {string} postal
 * @param {PincodeConfig} config
 * @returns {{ serviceable: boolean, minDays?: number, maxDays?: number, message: string, zone?: string, country: string }}
 */
export function checkPostal(countryCode, postal, config) {
  const country = normalizeCountryCode(countryCode);
  const normalized = normalizePostal(country, postal);
  const countryConfig = getCountryConfig(config, country);
  const defaultMessage =
    config?.defaultMessage || DEFAULT_PINCODE_CONFIG.defaultMessage;

  if (!countryConfig || countryConfig.enabled === false) {
    return {
      serviceable: false,
      country,
      message: defaultMessage,
    };
  }

  if (!isValidPostal(country, normalized)) {
    const message = invalidPostalMessage(country, normalized);
    return {
      serviceable: false,
      country,
      message: message || defaultMessage,
    };
  }

  const zones =
    countryConfig.zones?.length
      ? countryConfig.zones
      : country === "IN"
        ? DEFAULT_PINCODE_CONFIG.zones
        : defaultCatchallZones(country);

  for (const zone of zones) {
    if (!zoneMatches(normalized, zone, country)) {
      continue;
    }

    const serviceable = zone.serviceable !== false;
    if (!serviceable) {
      return {
        serviceable: false,
        country,
        message: defaultMessage,
        zone: zone.name,
      };
    }

    return {
      serviceable: true,
      country,
      minDays: zone.minDays,
      maxDays: zone.maxDays,
      message: formatDeliveryMessage(zone.minDays, zone.maxDays),
      zone: zone.name,
    };
  }

  return {
    serviceable: false,
    country,
    message: defaultMessage,
  };
}

/**
 * @param {string} pincode
 * @param {PincodeConfig} config
 * @returns {{ serviceable: boolean, minDays?: number, maxDays?: number, message: string, zone?: string, country?: string }}
 */
export function checkPincode(pincode, config) {
  return checkPostal("IN", pincode, config);
}

/**
 * @param {unknown} zone
 * @returns {PincodeZone}
 */
function normalizeZone(zone) {
  const input = zone && typeof zone === "object" ? zone : {};
  return {
    name: String(input.name || "Zone").trim() || "Zone",
    type:
      input.type === "range" || input.type === "catchall" || input.type === "prefix"
        ? input.type
        : "prefix",
    prefixes: Array.isArray(input.prefixes)
      ? input.prefixes.map((prefix) => String(prefix).trim()).filter(Boolean)
      : [],
    ranges: Array.isArray(input.ranges)
      ? input.ranges.map((range) => ({
          from: String(range.from || "").trim(),
          to: String(range.to || "").trim(),
        }))
      : [],
    minDays: Number.isFinite(Number(input.minDays)) ? Number(input.minDays) : 7,
    maxDays: Number.isFinite(Number(input.maxDays)) ? Number(input.maxDays) : 10,
    serviceable: input.serviceable !== false,
  };
}

/**
 * @param {unknown} value
 * @returns {PincodeZone[]}
 */
function normalizeZones(value) {
  if (!Array.isArray(value) || !value.length) {
    return structuredClone(DEFAULT_IN_ZONES);
  }
  return value.map((zone) => normalizeZone(zone));
}

/**
 * @param {unknown} value
 * @returns {PincodeConfig}
 */
export function normalizePincodeConfig(value) {
  if (!value || typeof value !== "object") {
    return structuredClone(DEFAULT_PINCODE_CONFIG);
  }

  const input = /** @type {Partial<PincodeConfig> & { countries?: Record<string, Partial<CountryConfig>> }>} */ (
    value
  );
  const defaults = buildDefaultCountries();
  const indiaZones = normalizeZones(input.zones);
  const countries = { ...defaults };

  if (input.countries && typeof input.countries === "object") {
    for (const code of OCTOBER_COUNTRY_CODES) {
      const countryInput = input.countries[code];
      if (!countryInput || typeof countryInput !== "object") {
        continue;
      }

      countries[code] = {
        enabled: countryInput.enabled !== false,
        label: String(countryInput.label || defaults[code].label).trim() || defaults[code].label,
        zones:
          Array.isArray(countryInput.zones) && countryInput.zones.length
            ? countryInput.zones.map((zone) => normalizeZone(zone))
            : code === "IN"
              ? indiaZones
              : defaults[code].zones,
      };
    }
  } else {
    countries.IN = {
      enabled: true,
      label: COUNTRY_META.IN.label,
      zones: indiaZones,
    };
  }

  return {
    warehousePincode:
      String(input.warehousePincode || DEFAULT_PINCODE_CONFIG.warehousePincode).trim() ||
      DEFAULT_PINCODE_CONFIG.warehousePincode,
    defaultMessage:
      String(input.defaultMessage || DEFAULT_PINCODE_CONFIG.defaultMessage).trim() ||
      DEFAULT_PINCODE_CONFIG.defaultMessage,
    zones: countries.IN.zones,
    countries,
  };
}
