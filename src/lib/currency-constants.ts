export const SUPPORTED_CURRENCIES = [
  { code: "AED", name: "United Arab Emirates Dirham", symbol: "د.إ" },
  { code: "AUD", name: "Australian Dollar", symbol: "$" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "$" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  { code: "SAR", name: "Saudi Riyal", symbol: "ر.س" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "SGD", name: "Singapore Dollar", symbol: "$" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "USD", name: "US Dollar", symbol: "$" },
];

/**
 * Static fallback rates (Units per 1 USD). 
 * Used only if all external API calls fail.
 */
export const STATIC_FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  AED: 3.67,  // Pegged
  AUD: 1.53,
  BRL: 5.10,
  CAD: 1.36,
  CNY: 7.23,
  EGP: 47.50,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.30,
  JPY: 151.50,
  MXN: 16.75,
  PLN: 3.98,
  SAR: 3.75,  // Pegged
  SEK: 10.55,
  SGD: 1.35,
  TRY: 32.40,
};

export const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
  SUPPORTED_CURRENCIES.map((curr) => [curr.code, curr.symbol])
);
