import { prisma } from "../prisma";
import { Decimal } from "@prisma/client/runtime/library";
import type { Distributor, SaleFormat, SaleSource } from "@prisma/client";

// --- Types ---

export interface AuthorRoyaltyReportParams {
  authorId: number;
  startQuarter: number;
  startYear: number;
  endQuarter: number;
  endYear: number;
}

/** Single cell: aggregates for one (period × book) */
export interface ReportCell {
  /** Print, handsold */
  qtyPrintHandsold: number;
  /** Print, Ingram Spark */
  qtyPrintIngramSpark: number;
  /** Print, Amazon */
  qtyPrintAmazon: number;
  /** eBook, Amazon */
  qtyEbookAmazon: number;
  /** Print, Other distributor */
  qtyPrintOther: number;
  /** eBook, Other distributor */
  qtyEbookOther: number;
  /** Sum of unit sales (print/ebook); excludes KU (KENP only) */
  quantitySold: number;
  /** Handsold units only (same subset as print handsold in this schema) */
  quantityHandsold: number;
  /** Amazon Kindle Unlimited KENP pages */
  kenp: number;
  royaltyUnpaid: number;
  royaltyPaid: number;
  royaltyTotal: number;
}

/** One period column: a quarter or range total */
export interface ReportPeriod {
  label: string;
  /** e.g. "2025-Q2" or "total" */
  key: string;
  /** For quarter periods: 1-4; for total: null */
  quarter: number | null;
  year: number | null;
}

/** One book row (or the "All books" totals row) */
export interface ReportBookRow {
  bookId: number | null;
  title: string;
  seriesName: string | null;
  seriesOrder: number | null;
}

export interface AuthorRoyaltyReportResult {
  author: { id: number; name: string };
  generatedAt: Date;
  periods: ReportPeriod[];
  bookRows: ReportBookRow[];
  /** data[bookRowIndex][periodIndex] */
  cells: ReportCell[][];
}

// --- Quarter / date helpers ---

/**
 * Quarters in range, then "Total (selected range)" (sum of those quarters).
 */
function listQuarters(
  startQuarter: number,
  startYear: number,
  endQuarter: number,
  endYear: number
): ReportPeriod[] {
  const periods: ReportPeriod[] = [];
  let q = startQuarter;
  let y = startYear;
  const endQ = endQuarter;
  const endY = endYear;

  while (y < endY || (y === endY && q <= endQ)) {
    periods.push({
      label: `${y} Q${q}`,
      key: `${y}-Q${q}`,
      quarter: q,
      year: y,
    });
    if (q === 4) {
      q = 1;
      y += 1;
    } else {
      q += 1;
    }
  }

  periods.push({
    label: "Total (selected range)",
    key: "total",
    quarter: null,
    year: null,
  });

  return periods;
}

/** Return 1-4 from a Date's month (1-12) */
function quarterFromDate(d: Date): number {
  return Math.ceil((d.getMonth() + 1) / 3);
}

// --- Data fetching ---

/**
 * Fetch all sales for the given author's books.
 * Quarter columns and range total are assigned in memory by sale date quarter.
 */
type SaleForReport = {
  bookId: number;
  year: number;
  quarter: number;
  source: SaleSource;
  distributor: Distributor | null;
  format: SaleFormat;
  quantity: number;
  kenp: number;
  paid: boolean;
  authorRoyalty: Decimal;
};

async function fetchSalesForReport(authorId: number): Promise<SaleForReport[]> {
  const sales = await prisma.sale.findMany({
    where: { book: { authorId } },
    select: {
      bookId: true,
      date: true,
      quantity: true,
      source: true,
      distributor: true,
      format: true,
      kenp: true,
      paid: true,
      authorRoyalty: true,
    },
  });

  return sales.map((s) => ({
    bookId: s.bookId,
    year: s.date.getFullYear(),
    quarter: quarterFromDate(s.date),
    source: s.source,
    distributor: s.distributor,
    format: s.format,
    quantity: s.quantity ?? 0,
    kenp:
      s.kenp != null ? new Decimal(s.kenp.toString()).toNumber() : 0,
    paid: s.paid,
    authorRoyalty: new Decimal(s.authorRoyalty.toString()),
  }));
}

/**
 * Fetch author's books sorted by series (name), series order, then title.
 * Non-series books last.
 */
async function fetchAuthorBooksSorted(authorId: number) {
  const books = await prisma.book.findMany({
    where: { authorId },
    include: { series: { select: { name: true } } },
  });

  const mapped = books.map((b) => ({
    id: b.id,
    title: b.title,
    seriesName: b.series?.name ?? null,
    seriesOrder: b.seriesOrder ?? null,
  }));

  mapped.sort((a, b) => {
    const nameA = a.seriesName ?? "\uFFFF";
    const nameB = b.seriesName ?? "\uFFFF";
    if (nameA !== nameB) return nameA.localeCompare(nameB);
    const orderA = a.seriesOrder ?? Infinity;
    const orderB = b.seriesOrder ?? Infinity;
    if (orderA !== orderB) return orderA - orderB;
    return a.title.localeCompare(b.title);
  });

  return mapped;
}

/** Build empty cell */
function emptyCell(): ReportCell {
  return {
    qtyPrintHandsold: 0,
    qtyPrintIngramSpark: 0,
    qtyPrintAmazon: 0,
    qtyEbookAmazon: 0,
    qtyPrintOther: 0,
    qtyEbookOther: 0,
    quantitySold: 0,
    quantityHandsold: 0,
    kenp: 0,
    royaltyUnpaid: 0,
    royaltyPaid: 0,
    royaltyTotal: 0,
  };
}

/** Add a sale's contribution into a cell (mutates) */
function addSaleToCell(cell: ReportCell, s: SaleForReport) {
  const r = s.authorRoyalty.toNumber();
  if (s.paid) cell.royaltyPaid += r;
  else cell.royaltyUnpaid += r;
  cell.royaltyTotal += r;

  const qty = s.quantity;
  if (s.source === "HAND_SOLD" && s.format === "PRINT") {
    cell.qtyPrintHandsold += qty;
    cell.quantityHandsold += qty;
    cell.quantitySold += qty;
    return;
  }

  if (s.source !== "DISTRIBUTOR" || s.distributor == null) return;

  if (s.distributor === "INGRAM_SPARK" && s.format === "PRINT") {
    cell.qtyPrintIngramSpark += qty;
    cell.quantitySold += qty;
    return;
  }

  if (s.distributor === "AMAZON") {
    if (s.format === "PRINT") {
      cell.qtyPrintAmazon += qty;
      cell.quantitySold += qty;
    } else if (s.format === "EBOOK") {
      cell.qtyEbookAmazon += qty;
      cell.quantitySold += qty;
    } else if (s.format === "KINDLE_UNLIMITED") {
      cell.kenp += s.kenp;
    }
    return;
  }

  if (s.distributor === "OTHER") {
    if (s.format === "PRINT") {
      cell.qtyPrintOther += qty;
      cell.quantitySold += qty;
    } else if (s.format === "EBOOK") {
      cell.qtyEbookOther += qty;
      cell.quantitySold += qty;
    }
  }
}

/**
 * Books × periods: per-cell quantity breakdown (handsold, Ingram, Amazon print/ebook,
 * Other print/ebook, totals, handsold, KENP), royalties unpaid/paid/total.
 * Periods: each quarter in range and "Total (selected range)". Last row is all-book totals.
 */
export async function getAuthorRoyaltyReportData(
  params: AuthorRoyaltyReportParams
): Promise<AuthorRoyaltyReportResult | null> {
  const {
    authorId,
    startQuarter,
    startYear,
    endQuarter,
    endYear,
  } = params;

  const author = await prisma.author.findUnique({
    where: { id: authorId },
    select: { id: true, name: true },
  });
  if (!author) return null;

  const [books, sales] = await Promise.all([
    fetchAuthorBooksSorted(authorId),
    fetchSalesForReport(authorId),
  ]);

  const periods = listQuarters(
    startQuarter,
    startYear,
    endQuarter,
    endYear
  );
  const periodKeys = new Map(
    periods.map((p, i) => [p.key, i])
  );
  const numPeriods = periods.length;
  const totalPeriodIndex = numPeriods - 1;
  const quarterPeriodKeys = new Set(
    periods.slice(0, -1).map((p) => p.key)
  );

  const bookRows: ReportBookRow[] = [
    ...books.map((b) => ({
      bookId: b.id as number,
      title: b.title,
      seriesName: b.seriesName,
      seriesOrder: b.seriesOrder,
    })),
    { bookId: null, title: "All books", seriesName: null, seriesOrder: null },
  ];
  const numRows = bookRows.length;
  const allBooksRowIndex = numRows - 1;

  const bookIdToRowIndex = new Map<number, number>();
  books.forEach((b, i) => bookIdToRowIndex.set(b.id, i));

  const cells: ReportCell[][] = bookRows.map(() =>
    Array.from({ length: numPeriods }, () => emptyCell())
  );

  for (const s of sales) {
    const rowIdx = bookIdToRowIndex.get(s.bookId);
    if (rowIdx == null) continue;

    const quarterKey = `${s.year}-Q${s.quarter}`;
    const inRange = quarterPeriodKeys.has(quarterKey);
    const periodIdx = periodKeys.get(quarterKey);

    const addTo = (col: number) => {
      addSaleToCell(cells[rowIdx][col], s);
      addSaleToCell(cells[allBooksRowIndex][col], s);
    };

    if (inRange && periodIdx != null) {
      addTo(periodIdx);
      addTo(totalPeriodIndex);
    }
  }

  return {
    author: { id: author.id, name: author.name },
    generatedAt: new Date(),
    periods,
    bookRows,
    cells,
  };
}
