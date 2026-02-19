export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * String & Identity Validation
 */

export const validateName = (name: string): ValidationResult<string> => {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Name of author is required" };
  }
  if (trimmed.length > 50) {
    return { success: false, error: "Name is too long (max 50 characters)" };
  }
  return { success: true, data: trimmed };
};

export const validateEmail = (email: string): ValidationResult<string> => {
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!trimmed) {
    return { success: false, error: "Email address is required" };
  }
  if (!emailRegex.test(trimmed)) {
    return { success: false, error: "Please enter a valid email address" };
  }
  return { success: true, data: trimmed };
};

/**
 * Currency & Numeric Validation
 */

// Ensure author royalty is not greater than publisher revenue
export const validateRoyaltyLimit = (
  royalty: number,
  revenue: number
): ValidationResult<{royalty: number, revenue: number}> => {
  // Use a small epsilon or round to 2 decimals to avoid floating point errors
  // (e.g., 100.0000000001 > 100)
  const roundedRoyalty = Math.round(royalty * 100);
  const roundedRevenue = Math.round(revenue * 100);

  if (roundedRoyalty > roundedRevenue) {
    return {
      success: false,
      error: "Author royalty cannot exceed total publisher revenue.",
    };
  }

  return { success: true, data: {royalty, revenue} };
};

// Ensures input is empty, a whole number, or has at most two decimal places
export const isValidCurrencyInput = (value: string): boolean => {
  return value === "" || /^\d*\.?\d{0,2}$/.test(value);
};

// Rounds numeric values to the nearest cent (two decimal places)
export const normalizeCurrency = (value: number): number => {
  return Math.round(value * 100) / 100;
};

// Checks if a value is a valid, non-negative number
export const validatePositiveNumber = (
  value: number | string,
  fieldName: string
): ValidationResult<number> => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  // Check for empty input or non-numeric strings
  if (isNaN(num) || value === "" || !value)
    return { success: false, error: `${fieldName} is required.` };
  // Check for negative values
  if (num < 0)
    return { success: false, error: `${fieldName} cannot be negative.` };
  return { success: true, data: num };
};

// Validates cover price (must be positive if provided)
export const validateCoverPrice = (
  value: number | null | undefined
): ValidationResult<number | null> => {
  if (value == null) return { success: true, data: null };
  if (value <= 0)
    return { success: false, error: "Cover price must be positive." };
  return { success: true, data: value };
};

// Validates print cost (must be positive and less than cover price if both provided)
export const validatePrintCost = (
  printCost: number | null | undefined,
  coverPrice: number | null | undefined
): ValidationResult<number | null> => {
  if (printCost == null) return { success: true, data: null };
  if (printCost <= 0)
    return { success: false, error: "Print cost must be positive." };
  if (coverPrice != null && printCost >= coverPrice)
    return { success: false, error: "Print cost must be less than cover price." };
  return { success: true, data: printCost };
};

/**
 * Integer Validation
 */

// Restricts input to digits only (no decimals or special characters)
export const isValidQuantityInput = (value: string): boolean => {
  return value === "" || /^\d*$/.test(value);
};

/**
 * Date & Period Validation
 */

export const validateDatePeriod = (
  yearStr: string,
  monthStr: string
): ValidationResult<Date> => {
  // Ensure both year and month components are provided
  if (!yearStr || !monthStr)
    return { success: false, error: "Date is required." };

  // Ensure year and month are numeric strings
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month))
    return { success: false, error: "Invalid date format." };

  // Create date and verify it didn't "roll over" (e.g., Month 13 becoming Jan of next year)
  const date = new Date(year, month - 1, 1);
  if (isNaN(date.getTime()) || date.getMonth() !== month - 1) {
    return { success: false, error: "Please select a valid month and year." };
  }

  return { success: true, data: date };
};
