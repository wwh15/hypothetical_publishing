import { describe, expect, it } from "vitest";
import { normalizeISBN } from "./validation";

describe("normalizeISBN", () => {
  it("converts scientific-notation ISBN strings into digit strings", () => {
    // Excel often represents long numeric ISBNs like this:
    // 9.78147E+12  => 9781470000000 (then we canonicalize the ISBN-13 check digit)
    expect(normalizeISBN("9.78147E+12")).toBe("9781470000000");
  });

  it("strips trailing .0 formatting", () => {
    expect(normalizeISBN("9780123456789.0")).toBe("9780123456789");
  });

  it("does not modify ISBN digits for plain digit input", () => {
    expect(normalizeISBN("9780123456788")).toBe("9780123456788");
  });

  it("returns null for empty/whitespace input", () => {
    expect(normalizeISBN("   ")).toBeNull();
  });
});

