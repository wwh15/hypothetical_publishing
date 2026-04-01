/**
 * Server-side validation for Sale records.
 * Mirrors DB CHECK constraints and spec rules for use by the data layer.
 */

import type { Distributor, SaleFormat, SaleSource } from "@prisma/client";
import type { ValidationResult } from "../validation";

/** Allowed format per source/distributor (spec). */
const FORMAT_BY_SOURCE_DISTRIBUTOR: Record<
  string,
  readonly SaleFormat[]
> = {
  HAND_SOLD: ["PRINT"],
  DISTRIBUTOR_INGRAM_SPARK: ["PRINT"],
  DISTRIBUTOR_AMAZON: ["PRINT", "EBOOK", "KINDLE_UNLIMITED"],
  DISTRIBUTOR_OTHER: ["PRINT", "EBOOK"],
};

function allowedFormats(source: SaleSource, distributor: Distributor | null): readonly SaleFormat[] {
  if (source === "HAND_SOLD") return FORMAT_BY_SOURCE_DISTRIBUTOR.HAND_SOLD;
  if (distributor === "INGRAM_SPARK") return FORMAT_BY_SOURCE_DISTRIBUTOR.DISTRIBUTOR_INGRAM_SPARK;
  if (distributor === "AMAZON") return FORMAT_BY_SOURCE_DISTRIBUTOR.DISTRIBUTOR_AMAZON;
  if (distributor === "OTHER") return FORMAT_BY_SOURCE_DISTRIBUTOR.DISTRIBUTOR_OTHER;
  return [];
}

/** Allowed sale formats for a source + distributor (for forms, filters, etc.). */
export function getAllowedSaleFormats(
  source: SaleSource,
  distributor: Distributor | null
): SaleFormat[] {
  return [...allowedFormats(source, distributor)];
}

export interface SaleValidationInput {
  source: SaleSource;
  distributor: Distributor | null;
  format: SaleFormat;
  quantity: number | null;
  kenp: number | null;
  currency: string;
  publisherRevenueOriginal: number;
  publisherRevenueUSD: number;
  authorRoyalty: number;
  comment?: string | null;
}

/**
 * Validates a sale payload against source/distributor/format rules, quantity/kenp, and currency.
 * Use before create/update in the data layer.
 */
export function validateSaleRecord(input: SaleValidationInput): ValidationResult<SaleValidationInput> {
  const { source, distributor, format, quantity, kenp, currency, comment } = input;

  // Distributor: required when source = DISTRIBUTOR, null when HAND_SOLD
  if (source === "DISTRIBUTOR" && distributor == null) {
    return { success: false, error: "Distributor is required when sale source is distributor." };
  }
  if (source === "HAND_SOLD" && distributor != null) {
    return { success: false, error: "Distributor must be unspecified when sale source is handsold." };
  }

  // Format vs source/distributor
  const allowed = allowedFormats(source, distributor);
  if (!allowed.includes(format)) {
    return {
      success: false,
      error: `Format "${format}" is not allowed for source ${source}${distributor ? ` / ${distributor}` : ""}. Allowed: ${allowed.join(", ")}.`,
    };
  }

  // Quantity: required positive integer for PRINT/EBOOK; must be null for KINDLE_UNLIMITED
  if (format === "PRINT" || format === "EBOOK") {
    if (quantity == null) {
      return { success: false, error: "Quantity sold is required when format is print or ebook." };
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { success: false, error: "Quantity sold must be a positive integer for print/ebook." };
    }
  }
  if (format === "KINDLE_UNLIMITED") {
    if (quantity != null) {
      return { success: false, error: "Quantity sold must be unspecified when format is kindle unlimited." };
    }
  }

  // KENP: required positive integer for KINDLE_UNLIMITED; must be null otherwise
  if (format === "KINDLE_UNLIMITED") {
    if (kenp == null) {
      return { success: false, error: "KENP is required when format is kindle unlimited." };
    }
    if (
      typeof kenp !== "number" ||
      isNaN(kenp) ||
      !Number.isInteger(kenp) ||
      kenp < 1
    ) {
      return {
        success: false,
        error: "KENP must be a positive whole number for kindle unlimited.",
      };
    }
  }
  if (format !== "KINDLE_UNLIMITED" && kenp != null) {
    return { success: false, error: "KENP must be unspecified when format is not kindle unlimited." };
  }

  // Currency: three-letter uppercase; locked to USD for handsold
  const curr = String(currency).trim().toUpperCase();
  if (curr.length !== 3) {
    return { success: false, error: "Currency must be a three-letter code (e.g. USD)." };
  }
  if (source === "HAND_SOLD" && curr !== "USD") {
    return { success: false, error: "Currency must be USD for handsold records." };
  }

  // Revenue and royalty non-negative
  if (input.publisherRevenueOriginal < 0 || input.publisherRevenueUSD < 0 || input.authorRoyalty < 0) {
    return { success: false, error: "Publisher revenue and author royalty must be non-negative." };
  }

  // Comment: max 256 characters
  if (comment != null && comment.length > 256) {
    return { success: false, error: "Comment must be at most 256 characters." };
  }

  return { success: true, data: input };
}

/** Validates currency code (three-letter uppercase). Defaults to USD when empty. */
export function validateSaleCurrency(
  val: string | null | undefined,
  source: SaleSource
): ValidationResult<string> {
  const raw = val?.trim().toUpperCase() ?? "";
  const code = raw || "USD";
  if (code.length !== 3) {
    return { success: false, error: "Currency must be a three-letter code (e.g. USD)." };
  }
  if (source === "HAND_SOLD" && code !== "USD") {
    return { success: false, error: "Currency is locked to USD for handsold records." };
  }
  return { success: true, data: code };
}

/** Validates format string for display/API: print, ebook, kindle unlimited. */
export function validateSaleFormatValue(
  format: string,
  source: SaleSource,
  distributor: Distributor | null
): ValidationResult<SaleFormat> {
  const normalized = format.trim().toUpperCase().replace(/\s+/g, "_");
  const map: Record<string, SaleFormat> = {
    PRINT: "PRINT",
    EBOOK: "EBOOK",
    KINDLE_UNLIMITED: "KINDLE_UNLIMITED",
  };
  const f = map[normalized];
  if (!f) {
    return { success: false, error: `Invalid format "${format}". Must be print, ebook, or kindle unlimited.` };
  }
  const allowed = allowedFormats(source, distributor);
  if (!allowed.includes(f)) {
    return { success: false, error: `Format "${f}" is not allowed for this source/distributor.` };
  }
  return { success: true, data: f };
}
