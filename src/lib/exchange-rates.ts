/**
 * Convert an amount in `currencyCode` to USD using a rate table where each entry is
 * "units of that currency per 1 USD" (same shape as ExchangeRate-API `conversion_rates`
 * with base USD, and Frankfurter `latest?from=USD` `rates`).
 */
export function convertOriginalToUsd(
  amount: number,
  currencyCode: string,
  rates: Record<string, number> | null | undefined
): number | null {
  if (!Number.isFinite(amount)) return null;
  if (amount <= 0) return 0;

  const code = currencyCode.trim().toUpperCase();
  if (code === "USD") return amount;

  if (!rates) return null;
  const perUsd = rates[code];
  if (perUsd == null || perUsd === 0 || !Number.isFinite(perUsd)) return null;

  return amount / perUsd;
}
