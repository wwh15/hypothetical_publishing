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

/** * Date & ISBN 
 */

export const validateDatePeriod = (yearStr: string, monthStr: string): ValidationResult<Date> => {
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month)) return { success: false, error: "Invalid date format" };
  const date = new Date(year, month - 1, 1);
  return (date.getMonth() === month - 1) ? { success: true, data: date } : { success: false, error: "Invalid month/year" };
};

export const normalizeISBN = (val: string | null | undefined): string | null => 
  val ? val.trim().replace(/[-\s]/g, "").toUpperCase() : null;

export const validateISBN = (val: string): ValidationResult<string> => {
  const clean = normalizeISBN(val);
  if (!clean) return { success: false, error: "ISBN is required" };
  return /^(\d{9}[\dX]|\d{13})$/.test(clean) 
    ? { success: true, data: clean } 
    : { success: false, error: "ISBN must be 10 digits (0-9, X) or 13 digits" };
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