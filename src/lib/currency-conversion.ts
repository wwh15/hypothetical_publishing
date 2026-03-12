export const SUPPORTED_CURRENCIES = [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "CAD", name: "Canadian Dollar", symbol: "$" },
    { code: "AUD", name: "Australian Dollar", symbol: "$" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  ];
  
  // Create a mapping of Code -> Symbol
  export const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
    SUPPORTED_CURRENCIES.map((curr) => [curr.code, curr.symbol])
  );

/**
 * Converts an original currency amount to USD.
 * Per Req 3.3, if currency is not USD, it should be converted to USD.
 */
export function convertCurrency(amount: number, currencyCode: string = "USD"): number {
    // 1. Define exchange rates (e.g., how much 1 unit of X is worth in USD)
    const exchangeRates: Record<string, number> = {
      USD: 1.0,   // Base
      GBP: 1.34,  // 1 GBP = $1.34 USD
      EUR: 1.16,  // 1 EUR = $1.16 USD
      CAD: 0.73,  // 1 CAD = $0.73 USD
      JPY: 0.0063, // 1 JPY = $0.0063 USD
      AUD: 0.70,  // 1 AUD = $0.70 USD
    };
  
    // 2. Look up the rate, defaulting to 1.0 if the code is unknown
    const rate = exchangeRates[currencyCode.toUpperCase()] ?? 1.0;
  
    // 3. Return the converted amount rounded to 2 decimal places
    return Math.round((amount * rate) * 100) / 100;
  }