import type { PendingSaleItem } from "@/lib/data/records";

/** Resolved book info required to build royalties for an imported row. */
export type AmazonImportBook = {
  id: number;
  title: string;
  author: string;
  distRoyaltyRate: number;
};

export type AmazonParseError = {
  sheet: string;
  /** 1-based row number as in Excel */
  row: number;
  message: string;
};

export type ParseAmazonXlsxOptions = {
  filename: string;
  /** Maps normalized ISBN (via `normalizeISBN`) → book */
  booksByIsbn: Map<string, AmazonImportBook>;
  /** Maps normalized ASIN (via `normalizeAmazonAsin`) → book */
  booksByAsin: Map<string, AmazonImportBook>;
  /** Used for comment timestamps; defaults to `new Date()` */
  now?: Date;
  /** When a row has no Marketplace column value */
  defaultMarketplace?: string;
  /**
   * Convert royalty in the row’s currency to USD. Defaults to `convertCurrency`.
   * Inject in tests to avoid network/API.
   */
  convertToUsd?: (amount: number, currencyCode: string) => Promise<number>;
};

export type ParseAmazonXlsxSuccess = {
  ok: true;
  salesPeriod: Date;
  records: PendingSaleItem[];
  warnings: string[];
};

export type ParseAmazonXlsxFailure = {
  ok: false;
  errors: AmazonParseError[];
  warnings: string[];
};

export type ParseAmazonXlsxResult = ParseAmazonXlsxSuccess | ParseAmazonXlsxFailure;
