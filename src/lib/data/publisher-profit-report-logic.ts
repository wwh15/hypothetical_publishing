import type { QuarterColumn } from "./all-authors-royalty-report-logic";

export interface PublisherProfitReportParams {
  startQuarter: number;
  startYear: number;
  endQuarter: number;
  endYear: number;
}

/** One released book row before quarter aggregation (caller sorts). */
export type PublisherProfitBookInput = {
  bookId: number;
  author: string;
  /** e.g. "My Series (2)" or "" */
  seriesPosition: string;
  title: string;
  isbn13: string;
  asin: string;
  coverPrice: number;
  printCost: number;
};

export type ProfitSaleInput = {
  bookId: number;
  year: number;
  quarter: number;
  /** publisherRevenueUSD - authorRoyalty */
  profit: number;
};

export type PublisherProfitBookRow = PublisherProfitBookInput & {
  values: number[];
  rowTotal: number;
};

export type PublisherProfitReportResult = {
  quarterColumns: QuarterColumn[];
  bookRows: PublisherProfitBookRow[];
  columnTotals: number[];
  grandTotal: number;
};

/**
 * Pure aggregation: one row per book (order preserved), profit summed per quarter.
 * Sales outside quarterColumns are ignored.
 */
export function computePublisherProfitMatrix(
  books: PublisherProfitBookInput[],
  sales: ProfitSaleInput[],
  quarterColumns: QuarterColumn[]
): PublisherProfitReportResult {
  const quarterKeys = new Set(quarterColumns.map((c) => c.key));

  const byBookQuarter = new Map<string, number>();
  for (const s of sales) {
    const k = `${s.year}-Q${s.quarter}`;
    if (!quarterKeys.has(k)) continue;
    const cellKey = `${s.bookId}|${k}`;
    byBookQuarter.set(
      cellKey,
      (byBookQuarter.get(cellKey) ?? 0) + s.profit
    );
  }

  const bookRows: PublisherProfitBookRow[] = books.map((b) => {
    const values = quarterColumns.map((col) => {
      const raw = byBookQuarter.get(`${b.bookId}|${col.key}`) ?? 0;
      return Math.round(raw * 100) / 100;
    });
    const rowTotal =
      Math.round(values.reduce((s, v) => s + v, 0) * 100) / 100;
    return {
      ...b,
      values,
      rowTotal,
    };
  });

  const columnTotals = quarterColumns.map((_, colIdx) => {
    const sum = bookRows.reduce((s, row) => s + row.values[colIdx], 0);
    return Math.round(sum * 100) / 100;
  });

  const grandTotal =
    Math.round(bookRows.reduce((s, row) => s + row.rowTotal, 0) * 100) / 100;

  return {
    quarterColumns,
    bookRows,
    columnTotals,
    grandTotal,
  };
}
