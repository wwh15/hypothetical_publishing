import { convertCurrencyToUsd } from "@/app/(main)/sales/action";

export {
  SUPPORTED_CURRENCIES,
  CURRENCY_SYMBOLS,
} from "./currency-constants";

export { convertOriginalToUsd } from "./exchange-rates";

/**
 * Converts an original currency amount to USD via the server (one HTTP call per invocation).
 * Prefer `convertOriginalToUsd` with `getUsdConversionRates()` for interactive forms.
 */
export async function convertCurrency(
  amount: number,
  currencyCode: string = "USD"
): Promise<number> {
  const from = currencyCode.trim().toUpperCase();
  if (from === "USD") return amount;

  return convertCurrencyToUsd(amount, from);
}
