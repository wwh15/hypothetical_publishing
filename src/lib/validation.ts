export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const cleanNumericString = (val: string | number): string => 
  String(val).trim().replace(/[,\s]/g, ""); // Fixed regex to include spaces correctly

/** * Identity & String Validation 
 */

export const normalizeString = (input: string | null | undefined): string => {
  if (!input) return "";
  
  return input
    .trim()
    .replace(/\s+/g, " "); // Replaces any sequence of whitespace with a single space
};
export const validateRequiredString = (val: string | null | undefined, label: string): ValidationResult<string> => {
  const trimmed = val?.trim();
  return trimmed ? { success: true, data: trimmed } : { success: false, error: `Field [${label}] is missing a value` };
};

export const validateSaleFormat = (format: string): ValidationResult<string> => {
  const trimmed = format.trim();
  const valid = ["Paperback", "Hardcover"];
  if (!trimmed) return { success: false, error: "Field [Format] is missing" };
  return valid.includes(trimmed) 
    ? { success: true, data: trimmed } 
    : { success: false, error: `Field [Format] expected "Paperback" or "Hardcover" (received "${trimmed}")` };
};

export const validateEmail = (email: string): ValidationResult<string> => {
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!trimmed) return { success: false, error: "Email is required" };
  return emailRegex.test(trimmed) ? { success: true, data: trimmed } : { success: false, error: "Invalid email address" };
};

export const normalizeEmail = (email: string | null | undefined): string => {
  if (!email) return "";
  return email.trim().toLowerCase();
};

/** * Currency & Numeric Logic 
 */

export const normalizeCurrency = (val: string | number): number => {
  const num = Number(cleanNumericString(val));
  return isNaN(num) ? 0 : Math.round((num + Number.EPSILON) * 100) / 100;
};

export const validateCurrency = (val: string | number, label: string="Field"): ValidationResult<number> => {
  const normalized = normalizeCurrency(val);
  const rawString = String(val).trim();
  if (rawString === "" || isNaN(Number(cleanNumericString(val)))) {
    return { success: false, error: `Missing or not a valid number (received "${val}").` };
  }
  
  if (normalized <= 0) {
    return { success: false, error: `Must be greater than 0 (received "${val}")` };
  }

  return { success: true, data: normalized };
};

export const validateRoyaltyLimit = (royalty: number, revenue: number): ValidationResult<{royalty: number, revenue: number}> => {
  // Multiply by 100 to compare integers (cents) to avoid float jitters
  if (Math.round(royalty * 100) > Math.round(revenue * 100)) {
    return { success: false, error: "Author royalty cannot exceed publisher revenue" };
  }
  return { success: true, data: { royalty, revenue } };
};

export const isValidCurrencyInput = (value: string): boolean => /^\d*\.?\d{0,2}$/.test(value) || value === "";

/** * Quantity & Integer Logic 
 */

export const normalizeQuantity = (val: string | number): number => {
  const num = Number(cleanNumericString(val));
  return isNaN(num) ? 0 : Math.round(num);
};

export const validateQuantity = (val: string | number): ValidationResult<number> => {
  const cleanStr = cleanNumericString(val);
  const num = Number(cleanStr);
  if (cleanStr === "" || isNaN(num)) {
    return { success: false, error: `Not a valid number (received "${val}").` };
  }

  if (!Number.isInteger(num)) return { success: false, error: `Must be a whole number (received "${val}")` };
  return num <= 0 ? { success: false, error: `Must be greater than 0 (received "${val}")` } : { success: true, data: num };
};

export const isValidQuantityInput = (value: string): boolean => /^\d*$/.test(value) || value === "";

/** Non-negative number. Allows 0 and decimals. */
export const validateNonNegativeNumber = (
  val: string | number,
  label: string = "Value"
): ValidationResult<number> => {
  const cleanStr = cleanNumericString(val);
  const num = Number(cleanStr);
  if (cleanStr === "" || isNaN(num)) {
    return { success: false, error: `${label} must be a valid number.` };
  }
  if (num < 0) {
    return { success: false, error: `${label} must be non-negative.` };
  }
  return { success: true, data: num };
};

/** Kindle Unlimited KENP: positive integer only. */
export const validateKenp = (val: string | number): ValidationResult<number> => {
  const cleanStr = cleanNumericString(val);
  const num = Number(cleanStr);
  if (cleanStr === "" || isNaN(num)) {
    return { success: false, error: "KENP must be a valid number." };
  }
  if (!Number.isInteger(num)) {
    return { success: false, error: "KENP must be a whole number." };
  }
  if (num < 1) {
    return { success: false, error: "KENP must be greater than 0." };
  }
  return { success: true, data: num };
};

export const isValidKenpInput = (value: string): boolean =>
  /^\d*$/.test(value) || value === "";

/** * Date & ISBN 
 */

export const validateDatePeriod = (yearStr: string, monthStr: string): ValidationResult<Date> => {
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month)) return { success: false, error: "Invalid date format" };
  const date = new Date(Date.UTC(year, month - 1, 1));
  if (date.getUTCMonth() !== month - 1 || date.getUTCFullYear() !== year) {
    return { success: false, error: "Invalid month/year" };
  }
  return { success: true, data: date };
};

export const normalizeISBN = (val: string | null | undefined): string | null => {
  if (val == null) return null;

  // XLSX/Excel frequently stores ISBNs as numbers, which can come through as
  // scientific notation (e.g. "9.78147E+12"). We normalize those to digits
  // before matching against our stored ISBNs.
  let s = String(val).trim();
  if (!s) return null;

  s = s.replace(/[-\s]/g, "").toUpperCase();
  let didNormalizeExcelFormatting = false;

  // Convert pure "X.XXXXE+N" style scientific notation to an integer digits string.
  // If the exponent makes the decimal shift ambiguous (e.g. negative exp), we
  // fall back to rounding the numeric value.
  if (s.includes("E")) {
    const m = /^(\d+)(?:\.(\d+))?[E]([+\-]?\d+)$/.exec(s);
    if (m) {
      const whole = m[1];
      const frac = m[2] ?? "";
      const exp = parseInt(m[3], 10);

      if (Number.isFinite(exp) && exp >= 0) {
        // Shift decimal point to the right: whole.frac * 10^exp => integer digits.
        if (exp >= frac.length) {
          s = `${whole}${frac}${"0".repeat(exp - frac.length)}`;
          didNormalizeExcelFormatting = true;
        } else {
          // exp < frac.length means decimal shift would still leave fractional digits;
          // for ISBN matching we fall back to rounding the numeric value.
          const n = Number(s);
          if (Number.isFinite(n)) {
            s = String(Math.round(n)).replace(/[-\s]/g, "").toUpperCase();
            didNormalizeExcelFormatting = true;
          }
        }
      }

      // Fallback: if scientific conversion didn't run cleanly, try rounding.
      if (!didNormalizeExcelFormatting) {
        const n = Number(s);
        if (Number.isFinite(n)) {
          s = String(Math.round(n)).replace(/[-\s]/g, "").toUpperCase();
          didNormalizeExcelFormatting = true;
        }
      }
    }
  }

  // Common case: sometimes strings look like "9781234567890.0" due to number formatting.
  if (/^\d+\.0+$/.test(s)) {
    s = s.replace(/\.0+$/, "");
    didNormalizeExcelFormatting = true;
  }

  return s;
};

/** ASIN / marketplace id: strip non-alphanumeric for matching (dashes/spaces ignored). */
export const normalizeASIN = (val: string | null | undefined): string | null => {
  if (!val) return null;
  const n = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return n.length > 0 ? n : null;
};

/** Optional Amazon ASIN (ebook edition); empty clears. Normalized to 10 alphanumeric chars. */
export const validateASINOptional = (
  val: string | null | undefined
): ValidationResult<string | null> => {
  const normalized = normalizeASIN(val);
  if (!normalized) return { success: true, data: null };
  if (normalized.length !== 10) {
    return {
      success: false,
      error: "ASIN must be exactly 10 letters or digits",
    };
  }
  return { success: true, data: normalized };
};

const KICKSTARTER_ITEM_TAG_MAX_LEN = 128;

/** Optional Kickstarter item/reward tag: no whitespace, max 128 chars; blank clears. */
export const validateKickstarterItemTagOptional = (
  val: string | null | undefined,
  label: string
): ValidationResult<string | null> => {
  if (val == null || val.trim() === "") {
    return { success: true, data: null };
  }
  const t = val.trim();
  if (t.length > KICKSTARTER_ITEM_TAG_MAX_LEN) {
    return {
      success: false,
      error: `${label} must be at most ${KICKSTARTER_ITEM_TAG_MAX_LEN} characters`,
    };
  }
  if (/\s/.test(t)) {
    return {
      success: false,
      error: `${label} must not contain whitespace`,
    };
  }
  return { success: true, data: t };
};

export const validateISBN = (val: string): ValidationResult<string> => {
  const clean = normalizeISBN(val);
  if (!clean) return { success: false, error: "ISBN is required" };
  return /^(\d{9}[\dX]|\d{13})$/.test(clean) 
    ? { success: true, data: clean } 
    : { success: false, error: "ISBN must be 10 digits (0-9, X) or 13 digits" };
};

/** ISBN-10: optional field; if provided, must be 9 digits + check digit (digit or X). */
export const validateISBN10 = (val: string | null | undefined): ValidationResult<string | null> => {
  const clean = val != null ? normalizeISBN(val) : null;
  if (!clean) return { success: true, data: null };
  if (clean.length !== 10) {
    return { success: false, error: "ISBN-10 must be exactly 10 characters" };
  }
  if (!/^\d{9}[\dX]$/.test(clean)) {
    return { success: false, error: "ISBN-10 must be 9 digits followed by a digit or X" };
  }
  return { success: true, data: clean };
};

/** * Comparison Helpers and Business Logic
 */
export const validateEquals = (v1: number, v2: number): boolean => v1 === v2;
export const validateReturnedQuantity = (val: string): ValidationResult<number> => {
  const cleaned = val.trim().replace(/,/g, "");
  const num = Number(cleaned);
  if (cleaned === "" || isNaN(num)) return { success: false, error: `Not a valid number (received "${val}").` };
  if (!Number.isInteger(num)) return { success: false, error: `Must be a whole number (received "${val}").` };
  return num !== 0 ? { success: false, error: `Field [Returned Qty] expected to be set to 0 (received "${val}")` } : { success: true, data: num };
};