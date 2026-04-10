import { describe, it, expect } from "vitest";
import {
  hexToHsl,
  hslToHex,
  deriveBrandColors,
} from "./branding-colors";

describe("hexToHsl", () => {
  it("converts pure blue #2563eb", () => {
    const hsl = hexToHsl("#2563eb");
    expect(hsl.h).toBeCloseTo(217, -1);
    expect(hsl.s).toBeGreaterThan(0.8);
    expect(hsl.l).toBeCloseTo(0.53, 1);
  });

  it("converts pure white #ffffff", () => {
    const hsl = hexToHsl("#ffffff");
    expect(hsl.l).toBeCloseTo(1, 2);
  });

  it("converts pure black #000000", () => {
    const hsl = hexToHsl("#000000");
    expect(hsl.l).toBeCloseTo(0, 2);
  });
});

describe("hslToHex", () => {
  it("round-trips through hexToHsl", () => {
    const original = "#2563eb";
    const hsl = hexToHsl(original);
    const result = hslToHex(hsl.h, hsl.s, hsl.l);
    expect(result.toLowerCase()).toBe(original.toLowerCase());
  });
});

describe("deriveBrandColors", () => {
  it("returns all four CSS variable values", () => {
    const colors = deriveBrandColors("#2563eb");
    expect(colors).toHaveProperty("--brand-primary", "#2563eb");
    expect(colors).toHaveProperty("--brand-primary-hover");
    expect(colors).toHaveProperty("--brand-primary-light");
    expect(colors).toHaveProperty("--brand-primary-text");
  });

  it("derives white text for dark primary", () => {
    const colors = deriveBrandColors("#1e3a5f");
    expect(colors["--brand-primary-text"]).toBe("#ffffff");
  });

  it("derives black text for light primary", () => {
    const colors = deriveBrandColors("#f0e68c");
    expect(colors["--brand-primary-text"]).toBe("#000000");
  });

  it("hover is darker than primary", () => {
    const colors = deriveBrandColors("#2563eb");
    const primaryL = hexToHsl(colors["--brand-primary"]).l;
    const hoverL = hexToHsl(colors["--brand-primary-hover"]).l;
    expect(hoverL).toBeLessThan(primaryL);
  });

  it("light variant has high lightness", () => {
    const colors = deriveBrandColors("#2563eb");
    const lightL = hexToHsl(colors["--brand-primary-light"]).l;
    expect(lightL).toBeGreaterThan(0.85);
  });
});
