import { convertCurrencyToUsd } from "@/app/(main)/sales/action";

export {
  SUPPORTED_CURRENCIES,
  CURRENCY_SYMBOLS,
} from "./currency-constants";

/**
 * Converts an original currency amount to USD (client-safe).
 * Delegates to the convertCurrencyToUsd server action (Frankfurter on the server),
 * same pattern as ISBN lookup → Open Library.
 *
 * Per Req 3.3, if currency is not USD, it should be converted to USD.
 */
export async function convertCurrency(
  amount: number,
  currencyCode: string = "USD"
): Promise<number> {
  const from = currencyCode.trim().toUpperCase();
  if (from === "USD") return amount;

  return convertCurrencyToUsd(amount, from);
}
