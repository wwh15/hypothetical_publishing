import { prisma } from "../prisma";
import { Decimal } from "@prisma/client/runtime/library";

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
  quantitySold: number;
  quantityHandsold: number;
  royaltyUnpaid: number;
  royaltyPaid: number;
  royaltyTotal: number;
}

/** One period column: a quarter or "Total" (sum of selected quarters) */
export interface ReportPeriod {
  label: string;
  /** "2025-Q2" or "total" */
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

/** First day of quarter (month 0-indexed for Date) */
function quarterStartDate(quarter: number, year: number): Date {
  const startMonth = (quarter - 1) * 3; // 0, 3, 6, 9
  return new Date(year, startMonth, 1, 0, 0, 0, 0);
}

/** Last moment of quarter (e.g. Q1 → March 31 23:59:59.999) */
function quarterEndDate(quarter: number, year: number): Date {
  const monthAfterQuarter = quarter * 3; // 3, 6, 9, 12 (1-indexed)
  return new Date(year, monthAfterQuarter, 0, 23, 59, 59, 999);
}

/** List quarters from (startQ, startY) through (endQ, endY) inclusive, plus Total (sum of those quarters) */
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
    label: "Total",
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
 * Fetch all sales for the given author's books (no date filter).
 * Quarter columns and the Total column are filtered in memory to the selected quarter range.
 */
async function fetchSalesForReport(authorId: number) {
  const sales = await prisma.sale.findMany({
    where: { book: { authorId } },
    select: {
      bookId: true,
      date: true,
      quantity: true,
      source: true,
      paid: true,
      authorRoyalty: true,
    },
  });

  return sales.map((s) => ({
    bookId: s.bookId,
    year: s.date.getFullYear(),
    quarter: quarterFromDate(s.date),
    quantity: s.quantity,
    handsold: s.source === "HAND_SOLD",
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
    quantitySold: 0,
    quantityHandsold: 0,
    royaltyUnpaid: 0,
    royaltyPaid: 0,
    royaltyTotal: 0,
  };
}

/** Add a sale's contribution into a cell (mutates) */
function addToCell(
  cell: ReportCell,
  quantity: number,
  handsold: boolean,
  paid: boolean,
  royalty: Decimal
) {
  const r = royalty.toNumber();
  cell.quantitySold += quantity;
  if (handsold) cell.quantityHandsold += quantity;
  if (paid) cell.royaltyPaid += r;
  else cell.royaltyUnpaid += r;
  cell.royaltyTotal += r;
}

/**
 * Get full author royalty report data: books × periods with quantity sold,
 * quantity handsold, royalty unpaid/paid/total. Includes a Total column (sum of selected quarters) and all-book totals.
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
  const totalPeriodIndex = numPeriods - 1; // "Total" = sum of selected quarters
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

    if (inRange && periodIdx != null) {
      const cell = cells[rowIdx][periodIdx];
      addToCell(cell, s.quantity, s.handsold, s.paid, s.authorRoyalty);
      const allBooksCell = cells[allBooksRowIndex][periodIdx];
      addToCell(allBooksCell, s.quantity, s.handsold, s.paid, s.authorRoyalty);
      // Total column = sum of selected quarters only
      const totalCell = cells[rowIdx][totalPeriodIndex];
      addToCell(totalCell, s.quantity, s.handsold, s.paid, s.authorRoyalty);
      const allBooksTotal = cells[allBooksRowIndex][totalPeriodIndex];
      addToCell(allBooksTotal, s.quantity, s.handsold, s.paid, s.authorRoyalty);
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
