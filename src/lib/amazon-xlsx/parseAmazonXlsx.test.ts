import * as XLSX from "xlsx";
import { describe, expect, it, vi } from "vitest";
import { parseAmazonXlsx, parseAmazonMonthYearString, normalizeAmazonAsin } from "./parseAmazonXlsx";
import type { AmazonImportBook } from "./types";

function buildWorkbook(sheets: Record<string, unknown[][]>): Uint8Array {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
}

function book(overrides: Partial<AmazonImportBook> = {}): AmazonImportBook {
  return {
    id: 1,
    title: "Test Title",
    author: "Test Author",
    distRoyaltyRate: 50,
    ...overrides,
  };
}

describe("parseAmazonMonthYearString", () => {
  it("parses Month YYYY", () => {
    const d = parseAmazonMonthYearString("January 2024");
    expect(d?.toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });

  it("parses YYYY-MM", () => {
    const d = parseAmazonMonthYearString("2024-03");
    expect(d?.toISOString()).toBe("2024-03-01T00:00:00.000Z");
  });
});

describe("normalizeAmazonAsin", () => {
  it("strips non-alphanumeric", () => {
    expect(normalizeAmazonAsin(" b00abc123x ")).toBe("B00ABC123X");
  });
});

describe("parseAmazonXlsx", () => {
  it("reads sales period from row 1 and imports a print row", async () => {
    const isbn = "9780123456789";
    const buf = buildWorkbook({
      "Paperback Royalty": [
        ["Sales Period", "January 2024"],
        ["Royalty", "ISBN", "Units Sold", "Currency", "Marketplace", "Units Refunded"],
        [12.34, isbn, 3, "USD", "US", 0],
      ],
    });

    const booksByIsbn = new Map([[isbn.replace(/[-\s]/g, "").toUpperCase(), book()]]);
    const booksByAsin = new Map<string, AmazonImportBook>();

    const result = await parseAmazonXlsx(buf, {
      filename: "report.xlsx",
      booksByIsbn,
      booksByAsin,
      now: new Date("2025-03-22T15:30:00.000Z"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records).toHaveLength(1);
    expect(result.salesPeriod.toISOString()).toBe("2024-01-01T00:00:00.000Z");
    const r = result.records[0];
    expect(r.format).toBe("PRINT");
    expect(r.quantity).toBe(3);
    expect(r.kenp).toBeNull();
    expect(r.distributor).toBe("AMAZON");
    expect(r.publisherRevenueOriginal).toBe(12.34);
    expect(r.publisherRevenueUSD).toBe(12.34);
    expect(r.authorRoyalty).toBe(6.17);
    expect(r.comment).toContain("Amazon:");
    expect(r.comment).toContain("report.xlsx");
    expect(r.comment).toContain("Paperback Royalty");
  });

  it("matches columns by header name regardless of order", async () => {
    const isbn = "9780123456789";
    const key = isbn.replace(/[-\s]/g, "").toUpperCase();
    const buf = buildWorkbook({
      "Paperback Royalty": [
        ["Sales Period", "Jan 2024"],
        ["Marketplace", "ISBN", "Units Refunded", "Currency", "Units Sold", "Royalty"],
        ["UK", isbn, 0, "GBP", 1, 10],
      ],
    });

    const result = await parseAmazonXlsx(buf, {
      filename: "f.xlsx",
      booksByIsbn: new Map([[key, book()]]),
      booksByAsin: new Map(),
      now: new Date("2025-01-01T00:00:00.000Z"),
      convertToUsd: async (amount, code) => {
        if (code.toUpperCase() === "GBP" && amount === 10) return 13.4;
        if (code.toUpperCase() === "USD") return amount;
        return amount;
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records[0].currency).toBe("GBP");
    expect(result.records[0].publisherRevenueUSD).toBe(13.4);
  });

  it("errors when Units Refunded is not 0", async () => {
    const isbn = "9780123456789";
    const key = isbn.replace(/[-\s]/g, "").toUpperCase();
    const buf = buildWorkbook({
      "Hardcover Royalty": [
        ["Sales Period", "2024-02"],
        ["ISBN", "Royalty", "Currency", "Units Sold", "Units Refunded"],
        [isbn, 5, "USD", 1, 2],
      ],
    });

    const result = await parseAmazonXlsx(buf, {
      filename: "f.xlsx",
      booksByIsbn: new Map([[key, book()]]),
      booksByAsin: new Map(),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.message.includes("Units Refunded must be 0"))).toBe(true);
    expect(result.errors[0].sheet).toBe("Hardcover Royalty");
    expect(result.errors[0].row).toBe(3);
  });

  it("errors on eBook when Net Units Sold does not equal Units Sold", async () => {
    const buf = buildWorkbook({
      "eBook Royalty": [
        ["Sales Period", "March 2024"],
        ["ASIN", "Royalty", "Currency", "Units Sold", "Net Units Sold", "Units Refunded"],
        ["B00TEST123", 4, "USD", 5, 4, 0],
      ],
    });

    const result = await parseAmazonXlsx(buf, {
      filename: "f.xlsx",
      booksByIsbn: new Map(),
      booksByAsin: new Map([["B00TEST123", book()]]),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.message.includes("Net Units Sold"))).toBe(true);
  });

  it("skips KENP rows with N/A eBook ASIN and adds a warning", async () => {
    const buf = buildWorkbook({
      KENP: [
        ["Sales Period", "April 2024"],
        ["eBook ASIN", "KENP", "Royalty", "Currency", "Units Refunded"],
        ["N/A", 100, 1.5, "USD", 0],
        ["B00KU12345", 200, 2, "USD", 0],
      ],
    });

    const result = await parseAmazonXlsx(buf, {
      filename: "f.xlsx",
      booksByIsbn: new Map(),
      booksByAsin: new Map([["B00KU12345", book({ id: 2 })]]),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records).toHaveLength(1);
    expect(result.records[0].format).toBe("KINDLE_UNLIMITED");
    expect(result.records[0].kenp).toBe(200);
    expect(result.records[0].quantity).toBeNull();
    expect(result.warnings.some((w) => w.includes("KENP") && w.includes("skipped"))).toBe(true);
  });

  it("accepts KENP column named Kindle Edition Normalized Pages (KENP)", async () => {
    const buf = buildWorkbook({
      KENP: [
        ["Sales Period", "April 2024"],
        ["eBook ASIN", "Kindle Edition Normalized Pages (KENP)", "Royalty", "Currency", "Units Refunded"],
        ["B00KU99999", 150, 3.5, "USD", 0],
      ],
    });

    const result = await parseAmazonXlsx(buf, {
      filename: "f.xlsx",
      booksByIsbn: new Map(),
      booksByAsin: new Map([["B00KU99999", book({ id: 9 })]]),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records).toHaveLength(1);
    expect(result.records[0].kenp).toBe(150);
    expect(result.records[0].publisherRevenueOriginal).toBe(3.5);
  });

  it("warns when Audiobook Royalty has data rows", async () => {
    const isbn = "9780123456789";
    const key = isbn.replace(/[-\s]/g, "").toUpperCase();
    const buf = buildWorkbook({
      "Paperback Royalty": [
        ["Sales Period", "May 2024"],
        ["ISBN", "Royalty", "Currency", "Units Sold", "Units Refunded"],
        [isbn, 1, "USD", 1, 0],
      ],
      "Audiobook Royalty": [
        ["Sales Period", "May 2024"],
        ["Title", "Royalty"],
        ["Something", 99],
      ],
    });

    const result = await parseAmazonXlsx(buf, {
      filename: "f.xlsx",
      booksByIsbn: new Map([[key, book()]]),
      booksByAsin: new Map(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.some((w) => w.toLowerCase().includes("audiobook"))).toBe(true);
  });

  it("errors with sheet and row for unknown ISBN", async () => {
    const buf = buildWorkbook({
      "Paperback Royalty": [
        ["Sales Period", "June 2024"],
        ["ISBN", "Royalty", "Currency", "Units Sold", "Units Refunded"],
        ["9780000000000", 1, "USD", 1, 0],
      ],
    });

    const result = await parseAmazonXlsx(buf, {
      filename: "f.xlsx",
      booksByIsbn: new Map(),
      booksByAsin: new Map(),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].sheet).toBe("Paperback Royalty");
    expect(result.errors[0].row).toBe(3);
    expect(result.errors[0].message).toMatch(/Unknown book/);
  });

  it("uses fixed timestamp in comment when now is mocked", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T10:20:30.000Z"));
    const isbn = "9780123456789";
    const key = isbn.replace(/[-\s]/g, "").toUpperCase();
    const buf = buildWorkbook({
      "Paperback Royalty": [
        ["Sales Period", "July 2024"],
        ["ISBN", "Royalty", "Currency", "Units Sold"],
        [isbn, 2, "USD", 1],
      ],
    });

    const result = await parseAmazonXlsx(buf, {
      filename: "z.xlsx",
      booksByIsbn: new Map([[key, book()]]),
      booksByAsin: new Map(),
    });
    vi.useRealTimers();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records[0].comment).toContain("2024-06-15 10:20:30");
  });
});
