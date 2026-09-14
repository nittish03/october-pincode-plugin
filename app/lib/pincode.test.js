import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDefaultCountries,
  checkPincode,
  checkPostal,
  isValidPostal,
  normalizePincodeConfig,
  normalizePostal,
} from "./pincode.js";

describe("normalizePincodeConfig", () => {
  it("migrates legacy India-only config to countries.IN", () => {
    const legacy = {
      warehousePincode: "400001",
      defaultMessage: "No delivery",
      zones: [
        {
          name: "Mumbai",
          type: "prefix",
          prefixes: ["400"],
          minDays: 2,
          maxDays: 4,
          serviceable: true,
        },
      ],
    };

    const normalized = normalizePincodeConfig(legacy);

    assert.equal(normalized.countries.IN.zones[0].name, "Mumbai");
    assert.equal(normalized.zones[0].name, "Mumbai");
    assert.equal(normalized.countries.US.enabled, true);
    assert.equal(normalized.countries.US.zones[0].type, "catchall");
  });
});

describe("checkPostal", () => {
  const config = normalizePincodeConfig({
    warehousePincode: "110001",
    defaultMessage: "Not serviceable",
    zones: buildDefaultCountries().IN.zones,
    countries: buildDefaultCountries(),
  });

  it("keeps India backward compatibility via checkPincode", () => {
    const result = checkPincode("110001", config);
    assert.equal(result.serviceable, true);
    assert.match(result.message, /Delivery in/);
  });

  it("rejects invalid India pincode", () => {
    const result = checkPostal("IN", "000000", config);
    assert.equal(result.serviceable, false);
    assert.match(result.message, /6-digit Indian pincode/);
  });

  it("matches US catchall zone", () => {
    const result = checkPostal("US", "90210", config);
    assert.equal(result.serviceable, true);
    assert.equal(result.minDays, 10);
    assert.equal(result.maxDays, 14);
    assert.equal(result.country, "US");
  });

  it("accepts GB postcodes leniently", () => {
    const result = checkPostal("GB", "SW1A 1AA", config);
    assert.equal(result.serviceable, true);
    assert.equal(result.country, "GB");
  });

  it("rejects invalid US ZIP", () => {
    const result = checkPostal("US", "ABCDE", config);
    assert.equal(result.serviceable, false);
  });

  it("allows empty postal for UAE", () => {
    const result = checkPostal("AE", "", config);
    assert.equal(result.serviceable, true);
    assert.equal(result.country, "AE");
  });
});

describe("normalizePostal", () => {
  it("normalizes Canadian postal codes", () => {
    assert.equal(normalizePostal("CA", "m5h2n2"), "M5H 2N2");
  });

  it("normalizes Japanese postal codes", () => {
    assert.equal(normalizePostal("JP", "1000001"), "100-0001");
  });
});

describe("isValidPostal", () => {
  it("validates AU postcodes", () => {
    assert.equal(isValidPostal("AU", "2000"), true);
    assert.equal(isValidPostal("AU", "20"), false);
  });
});
