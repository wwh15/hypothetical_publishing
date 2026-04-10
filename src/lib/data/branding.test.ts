import { describe, it, expect } from "vitest";
import {
  BRANDING_DEFAULTS,
  isValidHexColor,
  sanitizeBrandingInput,
} from "./branding";

describe("BRANDING_DEFAULTS", () => {
  it("has expected default values", () => {
    expect(BRANDING_DEFAULTS.companyName).toBe("Hypothetical Publishing");
    expect(BRANDING_DEFAULTS.tagline).toBe("Book publishing & royalty management");
    expect(BRANDING_DEFAULTS.logoPath).toBeNull();
    expect(BRANDING_DEFAULTS.primaryColor).toBe("#2563eb");
  });
});

describe("isValidHexColor", () => {
  it("accepts valid 6-digit hex", () => {
    expect(isValidHexColor("#2563eb")).toBe(true);
    expect(isValidHexColor("#FFFFFF")).toBe(true);
    expect(isValidHexColor("#000000")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidHexColor("2563eb")).toBe(false);
    expect(isValidHexColor("#fff")).toBe(false);
    expect(isValidHexColor("#gggggg")).toBe(false);
    expect(isValidHexColor("")).toBe(false);
    expect(isValidHexColor("#2563eb00")).toBe(false);
  });
});

describe("sanitizeBrandingInput", () => {
  it("trims whitespace", () => {
    const result = sanitizeBrandingInput({
      companyName: "  My Company  ",
      tagline: "  tagline  ",
      primaryColor: "#2563eb",
    });
    expect(result.companyName).toBe("My Company");
    expect(result.tagline).toBe("tagline");
  });

  it("rejects company name over 100 chars", () => {
    expect(() =>
      sanitizeBrandingInput({
        companyName: "a".repeat(101),
        tagline: "ok",
        primaryColor: "#2563eb",
      })
    ).toThrow("Company name must be 100 characters or fewer");
  });

  it("rejects tagline over 200 chars", () => {
    expect(() =>
      sanitizeBrandingInput({
        companyName: "ok",
        tagline: "a".repeat(201),
        primaryColor: "#2563eb",
      })
    ).toThrow("Tagline must be 200 characters or fewer");
  });

  it("rejects empty company name", () => {
    expect(() =>
      sanitizeBrandingInput({
        companyName: "",
        tagline: "ok",
        primaryColor: "#2563eb",
      })
    ).toThrow("Company name is required");
  });

  it("rejects invalid hex color", () => {
    expect(() =>
      sanitizeBrandingInput({
        companyName: "ok",
        tagline: "ok",
        primaryColor: "not-a-color",
      })
    ).toThrow("Invalid color format");
  });
});
