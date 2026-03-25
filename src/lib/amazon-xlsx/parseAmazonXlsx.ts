import * as XLSX from "xlsx";
import type { PendingSaleItem } from "@/lib/data/records";
import { convertCurrency } from "@/lib/currency-conversion";
import { normalizeISBN } from "@/lib/validation";
import { validateSaleCurrency, validateSaleRecord } from "@/lib/validation/sale";
import type { AmazonImportBook, AmazonParseError, ParseAmazonXlsxOptions, ParseAmazonXlsxResult } from "./types";

/** Trim, uppercase; ASIN is alphanumeric (Amazon). Returns null if empty after trim. */
export function normalizeAmazonAsin(val: string | null | undefined): string | null {
  if (val == null) return null;
  const s = String(val).trim().toUpperCase();
  if (!s) return null;
  return s.replace(/[^0-9A-Z]/g, "");
}

const MONTH_NAME_TO_NUM: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

/**
 * Parses the month/year cell next to "Sales Period" (first day of month, UTC).
 */
export function parseAmazonMonthYearString(input: string): Date | null {
  const s = input.trim();
  if (!s) return null;

  const isoYm = /^(\d{4})-(\d{1,2})$/.exec(s);
  if (isoYm) {
    const y = parseInt(isoYm[1], 10);
    const m = parseInt(isoYm[2], 10);
    if (m >= 1 && m <= 12) return new Date(Date.UTC(y, m - 1, 1));
  }

  const slash = /^(\d{1,2})\/(\d{4})$/.exec(s);
  if (slash) {
    const m = parseInt(slash[1], 10);
    const y = parseInt(slash[2], 10);
    if (m >= 1 && m <= 12) return new Date(Date.UTC(y, m - 1, 1));
  }

  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const monthPart = parts[0].toLowerCase();
    const yearPart = parts[parts.length - 1];
    const y = parseInt(yearPart, 10);
    const mo = MONTH_NAME_TO_NUM[monthPart];
    if (!Number.isNaN(y) && mo !== undefined) {
      return new Date(Date.UTC(y, mo - 1, 1));
    }
  }

  return null;
}

function normalizeHeaderKey(cell: unknown): string {
  return String(cell ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function rowToHeaderMap(row: unknown[]): Map<string, number> {
  const m = new Map<string, number>();
  row.forEach((cell, i) => {
    const key = normalizeHeaderKey(cell);
    if (key && !m.has(key)) m.set(key, i);
  });
  return m;
}

function findColumn(headerMap: Map<string, number>, candidates: string[]): number | undefined {
  for (const c of candidates) {
    const idx = headerMap.get(c);
    if (idx !== undefined) return idx;
  }
  return undefined;
}

function findRoyaltyColumn(headerMap: Map<string, number>): number | undefined {
  const direct = findColumn(headerMap, ["royalty"]);
  if (direct !== undefined) return direct;
  for (const [k, idx] of headerMap) {
    if (k.includes("royalty") && !k.includes("refund")) return idx;
  }
  return undefined;
}

function parseNumericCell(val: unknown): number | null {
  if (val == null || val === "") return null;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  const s = String(val).trim().replace(/,/g, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function formatImportTimestamp(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

function sanitizeCommentPart(s: string): string {
  return s.replace(/'/g, "");
}

function buildAmazonComment(
  market: string,
  filename: string,
  sheetName: string,
  now: Date
): string {
  return `Amazon: Market='${sanitizeCommentPart(market)}' File='${sanitizeCommentPart(filename)}' Sheet:'${sanitizeCommentPart(sheetName)}' (${formatImportTimestamp(now)})`;
}

type SheetKind = "print-paperback" | "print-hardcover" | "ebook" | "kenp" | "audiobook" | "skip";

function classifySheet(name: string): SheetKind {
  const n = name.trim().toLowerCase();
  if (n === "paperback royalty") return "print-paperback";
  if (n === "hardcover royalty") return "print-hardcover";
  if (n === "ebook royalty") return "ebook";
  if (n === "kenp") return "kenp";
  if (n === "audiobook royalty") return "audiobook";
  return "skip";
}

const SHEET_KIND_ORDER: Record<Exclude<SheetKind, "skip" | "audiobook">, number> = {
  "print-paperback": 0,
  "print-hardcover": 1,
  ebook: 2,
  kenp: 3,
};

function isKenpAsinSkipped(raw: unknown): boolean {
  if (raw == null) return true;
  const t = String(raw).trim();
  if (!t) return true;
  const u = t.toUpperCase();
  return u === "N/A" || u === "NA" || u === "-";
}

function sheetToMatrix(ws: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
}

function hasAudiobookDataRows(matrix: unknown[][]): boolean {
  if (matrix.length < 3) return false;
  for (let r = 2; r < matrix.length; r++) {
    const row = matrix[r] as unknown[];
    if (!row?.length) continue;
    const nonEmpty = row.some((c) => {
      if (c == null || c === "") return false;
      const s = String(c).trim();
      return s.length > 0;
    });
    if (nonEmpty) return true;
  }
  return false;
}

function pushError(errors: AmazonParseError[], sheet: string, row: number, message: string) {
  errors.push({ sheet, row, message });
}

/**
 * Parses an Amazon sales royalty `.xlsx` workbook and returns pending sale rows or blocking errors.
 * Warnings (non-blocking) include audiobook data rows and skipped KENP rows with N/A ASIN.
 */
export function parseAmazonXlsx(data: ArrayBuffer | Uint8Array, options: ParseAmazonXlsxOptions): ParseAmazonXlsxResult {
  const { filename, booksByIsbn, booksByAsin } = options;
  const now = options.now ?? new Date();
  const defaultMarketplace = options.defaultMarketplace ?? "";

  const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  const workbook = XLSX.read(u8, { type: "array", cellDates: true });

  const errors: AmazonParseError[] = [];
  const warnings: string[] = [];
  const records: PendingSaleItem[] = [];

  let salesPeriod: Date | null = null;
  let kenpSkippedRows = 0;

  const sheetNames = [...workbook.SheetNames];
  for (const sheetName of sheetNames) {
    if (classifySheet(sheetName) !== "audiobook") continue;
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;
    const matrix = sheetToMatrix(ws);
    if (hasAudiobookDataRows(matrix)) {
      warnings.push(
        `Audiobook Royalty sheet "${sheetName}" contains data rows. Per import rules, verify this sheet should be empty except headers/summary before proceeding.`
      );
    }
  }

  const sortedImportSheets = sheetNames
    .filter((n) => {
      const k = classifySheet(n);
      return k !== "skip" && k !== "audiobook";
    })
    .sort((a, b) => {
      const ka = classifySheet(a) as keyof typeof SHEET_KIND_ORDER;
      const kb = classifySheet(b) as keyof typeof SHEET_KIND_ORDER;
      return (SHEET_KIND_ORDER[ka] ?? 99) - (SHEET_KIND_ORDER[kb] ?? 99);
    });

  if (sortedImportSheets.length === 0) {
    errors.push({
      sheet: "(workbook)",
      row: 0,
      message:
        'No importable sheets found. Expected one or more of: "Paperback Royalty", "Hardcover Royalty", "eBook Royalty", "KENP".',
    });
    return { ok: false, errors, warnings };
  }

  for (const sheetName of sortedImportSheets) {
    const kind = classifySheet(sheetName);
    if (kind === "skip" || kind === "audiobook") continue;

    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    const matrix = sheetToMatrix(ws);
    if (matrix.length < 2) {
      pushError(errors, sheetName, 1, "Sheet is missing the Sales Period row or headers.");
      continue;
    }

    const periodLabel = normalizeHeaderKey(matrix[0]?.[0]);
    if (periodLabel !== "sales period") {
      pushError(errors, sheetName, 1, `Expected cell A1 to be "Sales Period" (got "${String(matrix[0]?.[0] ?? "")}").`);
      continue;
    }

    const periodCell = matrix[0]?.[1];
    const period = parseAmazonMonthYearString(String(periodCell ?? ""));
    if (!period) {
      pushError(errors, sheetName, 1, `Could not parse sales period from cell B1 (got "${String(periodCell ?? "")}").`);
      continue;
    }

    if (salesPeriod === null) {
      salesPeriod = period;
    } else if (salesPeriod.getTime() !== period.getTime()) {
      pushError(
        errors,
        sheetName,
        1,
        `Sales period in B1 (${formatImportTimestamp(period)}) does not match the first sheet (${formatImportTimestamp(salesPeriod)}).`
      );
      continue;
    }

    const headerRow = matrix[1] as unknown[];
    const headerMap = rowToHeaderMap(headerRow);

    const colRoyalty = findRoyaltyColumn(headerMap);
    const colCurrency = findColumn(headerMap, ["currency"]);
    const colMarketplace = findColumn(headerMap, ["marketplace", "market"]);
    const colUnitsSold = findColumn(headerMap, ["units sold"]);
    const colNetUnits = findColumn(headerMap, ["net units sold"]);
    const colUnitsRefunded = findColumn(headerMap, ["units refunded"]);

    if (colRoyalty === undefined) {
      pushError(errors, sheetName, 2, 'Missing required column "Royalty".');
      continue;
    }
    if (colCurrency === undefined) {
      pushError(errors, sheetName, 2, 'Missing required column "Currency".');
      continue;
    }

    if (kind === "ebook") {
      if (colNetUnits === undefined) {
        pushError(errors, sheetName, 2, 'eBook sheet requires column "Net Units Sold".');
        continue;
      }
    }

    if (kind === "print-paperback" || kind === "print-hardcover" || kind === "ebook") {
      if (colUnitsSold === undefined) {
        pushError(errors, sheetName, 2, 'Missing required column "Units Sold".');
        continue;
      }
    }

    const colIsbn = findColumn(headerMap, ["isbn"]);
    const colAsin = findColumn(headerMap, ["asin"]);
    const colEbookAsin = findColumn(headerMap, ["ebook asin", "ebookasin"]);
    const colKenp = findColumn(headerMap, [
      "kenp",
      "kenp pages",
      "kenp pages read",
      "kindle edition normalized pages (kenp)",
    ]);

    if (kind === "print-paperback" || kind === "print-hardcover") {
      if (colIsbn === undefined) {
        pushError(errors, sheetName, 2, 'Missing required column "ISBN".');
        continue;
      }
    } else if (kind === "ebook") {
      if (colAsin === undefined) {
        pushError(errors, sheetName, 2, 'Missing required column "ASIN".');
        continue;
      }
    } else if (kind === "kenp") {
      if (colEbookAsin === undefined) {
        pushError(errors, sheetName, 2, 'Missing required column "eBook ASIN".');
        continue;
      }
      if (colKenp === undefined) {
        pushError(errors, sheetName, 2, 'Missing required column "KENP".');
        continue;
      }
    }

    for (let r = 2; r < matrix.length; r++) {
      const excelRow = r + 1;
      const row = matrix[r] as unknown[];

      const isEmpty =
        !row ||
        row.every((c) => {
          if (c == null || c === "") return true;
          return String(c).trim() === "";
        });
      if (isEmpty) continue;

      const royaltyRaw = row[colRoyalty];
      const royalty = parseNumericCell(royaltyRaw);
      if (royalty == null) {
        pushError(errors, sheetName, excelRow, `Invalid or missing Royalty (got "${String(royaltyRaw ?? "")}").`);
        continue;
      }

      const currencyRaw = String(row[colCurrency] ?? "").trim();
      const currencyCheck = validateSaleCurrency(currencyRaw, "DISTRIBUTOR");
      if (!currencyCheck.success) {
        pushError(errors, sheetName, excelRow, currencyCheck.error);
        continue;
      }
      const currency = currencyCheck.data;

      let marketplace = defaultMarketplace;
      if (colMarketplace !== undefined) {
        const m = String(row[colMarketplace] ?? "").trim();
        if (m) marketplace = m;
      }

      const format: PendingSaleItem["format"] =
        kind === "print-paperback" || kind === "print-hardcover"
          ? "PRINT"
          : kind === "ebook"
            ? "EBOOK"
            : "KINDLE_UNLIMITED";

      let book: AmazonImportBook | null = null;
      let quantity: number | null = null;
      let kenp: number | null = null;

      if (format === "PRINT") {
        const rawIsbn = row[colIsbn!];
        const isbnNorm = normalizeISBN(String(rawIsbn ?? ""));
        if (!isbnNorm) {
          pushError(errors, sheetName, excelRow, `Missing or invalid ISBN (got "${String(rawIsbn ?? "")}").`);
          continue;
        }
        book = booksByIsbn.get(isbnNorm) ?? null;
        if (!book) {
          pushError(errors, sheetName, excelRow, `Unknown book for ISBN "${isbnNorm}".`);
          continue;
        }

        const units = parseNumericCell(colUnitsSold !== undefined ? row[colUnitsSold] : null);
        if (units == null || !Number.isInteger(units)) {
          pushError(errors, sheetName, excelRow, `Units Sold must be a whole number (got "${String(row[colUnitsSold!] ?? "")}").`);
          continue;
        }
        quantity = units;

        if (colUnitsRefunded !== undefined) {
          const refunded = parseNumericCell(row[colUnitsRefunded]);
          if (refunded == null) {
            pushError(errors, sheetName, excelRow, `Units Refunded must be 0 (got "${String(row[colUnitsRefunded] ?? "")}").`);
            continue;
          }
          if (refunded !== 0) {
            pushError(errors, sheetName, excelRow, `Units Refunded must be 0 (got ${refunded}).`);
            continue;
          }
        }

        if (colNetUnits !== undefined) {
          const net = parseNumericCell(row[colNetUnits]);
          const gross = parseNumericCell(colUnitsSold !== undefined ? row[colUnitsSold] : null);
          if (net != null && gross != null && net !== gross) {
            pushError(errors, sheetName, excelRow, `Net Units Sold (${net}) must equal Units Sold (${gross}).`);
            continue;
          }
        }
      } else if (format === "EBOOK") {
        const rawAsin = row[colAsin!];
        const asinNorm = normalizeAmazonAsin(String(rawAsin ?? ""));
        if (!asinNorm) {
          pushError(errors, sheetName, excelRow, `Missing or invalid ASIN (got "${String(rawAsin ?? "")}").`);
          continue;
        }
        book = booksByAsin.get(asinNorm) ?? null;
        if (!book) {
          pushError(errors, sheetName, excelRow, `Unknown book for ASIN "${asinNorm}".`);
          continue;
        }

        const units = parseNumericCell(colUnitsSold !== undefined ? row[colUnitsSold] : null);
        if (units == null || !Number.isInteger(units)) {
          pushError(errors, sheetName, excelRow, `Units Sold must be a whole number (got "${String(row[colUnitsSold!] ?? "")}").`);
          continue;
        }
        quantity = units;

        if (colUnitsRefunded !== undefined) {
          const refunded = parseNumericCell(row[colUnitsRefunded]);
          if (refunded == null || refunded !== 0) {
            pushError(
              errors,
              sheetName,
              excelRow,
              `Units Refunded must be 0 (got "${String(row[colUnitsRefunded] ?? "")}").`
            );
            continue;
          }
        }

        const net = parseNumericCell(row[colNetUnits!]);
        if (net == null || !Number.isInteger(net)) {
          pushError(errors, sheetName, excelRow, `Net Units Sold must be a whole number (got "${String(row[colNetUnits!] ?? "")}").`);
          continue;
        }
        if (net !== units) {
          pushError(errors, sheetName, excelRow, `Net Units Sold (${net}) must equal Units Sold (${units}).`);
          continue;
        }
      } else {
        const rawE = row[colEbookAsin!];
        if (isKenpAsinSkipped(rawE)) {
          kenpSkippedRows++;
          continue;
        }
        const asinNorm = normalizeAmazonAsin(String(rawE ?? ""));
        if (!asinNorm) {
          pushError(errors, sheetName, excelRow, `Missing or invalid eBook ASIN (got "${String(rawE ?? "")}").`);
          continue;
        }
        book = booksByAsin.get(asinNorm) ?? null;
        if (!book) {
          pushError(errors, sheetName, excelRow, `Unknown book for eBook ASIN "${asinNorm}".`);
          continue;
        }

        const kenpVal = parseNumericCell(row[colKenp!]);
        if (kenpVal == null || kenpVal < 0) {
          pushError(errors, sheetName, excelRow, `KENP must be a non-negative number (got "${String(row[colKenp!] ?? "")}").`);
          continue;
        }
        kenp = kenpVal;
        quantity = null;

        if (colUnitsRefunded !== undefined) {
          const refunded = parseNumericCell(row[colUnitsRefunded]);
          if (refunded != null && refunded !== 0) {
            pushError(errors, sheetName, excelRow, `Units Refunded must be 0 (got ${refunded}).`);
            continue;
          }
        }
      }

      if (!book) continue;

      const publisherRevenueOriginal = royalty;
      const publisherRevenueUSD = convertCurrency(publisherRevenueOriginal, currency);
      const rate = book.distRoyaltyRate ?? 0;
      const authorRoyalty = Math.round(publisherRevenueUSD * (rate / 100) * 100) / 100;

      const comment = buildAmazonComment(marketplace, filename, sheetName, now);
      const commentFinal = comment.length > 256 ? comment.slice(0, 256) : comment;

      const pending: PendingSaleItem = {
        id: crypto.randomUUID(),
        bookId: book.id,
        title: book.title,
        author: book.author,
        date: salesPeriod,
        quantity,
        kenp,
        format,
        distributor: "AMAZON",
        publisherRevenueUSD,
        publisherRevenueOriginal,
        currency,
        authorRoyalty,
        paid: false,
        source: "DISTRIBUTOR",
        comment: commentFinal,
      };

      const vr = validateSaleRecord({
        source: "DISTRIBUTOR",
        distributor: "AMAZON",
        format: pending.format,
        quantity: pending.quantity,
        kenp: pending.kenp,
        currency: pending.currency,
        publisherRevenueOriginal: pending.publisherRevenueOriginal,
        publisherRevenueUSD: pending.publisherRevenueUSD,
        authorRoyalty: pending.authorRoyalty,
        comment: pending.comment,
      });
      if (!vr.success) {
        pushError(errors, sheetName, excelRow, vr.error);
        continue;
      }

      records.push(pending);
    }
  }

  if (kenpSkippedRows > 0) {
    warnings.push(`${kenpSkippedRows} KENP row(s) with eBook ASIN of N/A or empty were skipped.`);
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  if (salesPeriod === null || records.length === 0) {
    errors.push({
      sheet: "(workbook)",
      row: 0,
      message: "No sale rows could be imported. Check that data rows exist under each sheet's headers.",
    });
    return { ok: false, errors, warnings };
  }

  return { ok: true, salesPeriod, records, warnings };
}
