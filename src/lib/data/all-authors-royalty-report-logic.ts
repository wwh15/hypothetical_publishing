export interface AllAuthorsRoyaltyReportParams {
  startQuarter: number;
  startYear: number;
  endQuarter: number;
  endYear: number;
}

export interface QuarterColumn {
  year: number;
  quarter: number;
  /** e.g. "2025 Q2" (def 22) */
  label: string;
  /** Stable key for maps */
  key: string;
}

export interface AllAuthorsRoyaltyAuthorRow {
  authorId: number;
  authorName: string;
  /** Same order as quarterColumns */
  values: number[];
  rowTotal: number;
}

export interface AllAuthorsRoyaltyReportResult {
  quarterColumns: QuarterColumn[];
  authorRows: AllAuthorsRoyaltyAuthorRow[];
  /** Per quarter column, sum across authors */
  columnTotals: number[];
  grandTotal: number;
}

/** Ordinal for comparing (year, quarter) ranges */
export function quarterOrdinal(year: number, quarter: number): number {
  return year * 4 + (quarter - 1);
}

/**
 * Quarters from start through end inclusive, ascending.
 * Does not include a separate "total" period column.
 */
export function listQuartersInRange(
  startQuarter: number,
  startYear: number,
  endQuarter: number,
  endYear: number
): QuarterColumn[] {
  const periods: QuarterColumn[] = [];
  let q = startQuarter;
  let y = startYear;
  while (y < endYear || (y === endYear && q <= endQuarter)) {
    periods.push({
      year: y,
      quarter: q,
      label: `${y} Q${q}`,
      key: `${y}-Q${q}`,
    });
    if (q === 4) {
      q = 1;
      y += 1;
    } else {
      q += 1;
    }
  }
  return periods;
}

/** Sort key: first token of name (trimmed), else full name */
export function authorFirstNameSortKey(name: string): string {
  const t = name.trim();
  const space = t.indexOf(" ");
  if (space <= 0) return t.toLowerCase();
  return t.slice(0, space).toLowerCase();
}

export function compareAuthorsByFirstName(
  a: { name: string },
  b: { name: string }
): number {
  const ka = authorFirstNameSortKey(a.name);
  const kb = authorFirstNameSortKey(b.name);
  const c = ka.localeCompare(kb);
  if (c !== 0) return c;
  return a.name.localeCompare(b.name);
}

/** Match author-royalty-report.ts */
export function quarterFromDate(d: Date): number {
  return Math.ceil((d.getMonth() + 1) / 3);
}

export type RoyaltySaleInput = {
  authorId: number;
  year: number;
  quarter: number;
  royalty: number;
};

/**
 * Pure aggregation: all authors (each gets a row), sales summed into quarter cells.
 * Sales outside the quarter list are ignored.
 */
export function computeAllAuthorsRoyaltyMatrix(
  authors: { id: number; name: string }[],
  sales: RoyaltySaleInput[],
  quarterColumns: QuarterColumn[]
): AllAuthorsRoyaltyReportResult {
  const quarterKeys = new Set(quarterColumns.map((c) => c.key));

  const byAuthorQuarter = new Map<string, number>();
  for (const s of sales) {
    const k = `${s.year}-Q${s.quarter}`;
    if (!quarterKeys.has(k)) continue;
    const cellKey = `${s.authorId}|${k}`;
    byAuthorQuarter.set(
      cellKey,
      (byAuthorQuarter.get(cellKey) ?? 0) + s.royalty
    );
  }

  const sortedAuthors = [...authors].sort(compareAuthorsByFirstName);

  const authorRows: AllAuthorsRoyaltyAuthorRow[] = sortedAuthors.map((auth) => {
    const values = quarterColumns.map((col) => {
      const cellKey = `${auth.id}|${col.key}`;
      return Math.round((byAuthorQuarter.get(cellKey) ?? 0) * 100) / 100;
    });
    const rowTotal =
      Math.round(values.reduce((s, v) => s + v, 0) * 100) / 100;
    return {
      authorId: auth.id,
      authorName: auth.name,
      values,
      rowTotal,
    };
  });

  const columnTotals = quarterColumns.map((_, colIdx) => {
    const sum = authorRows.reduce((s, row) => s + row.values[colIdx], 0);
    return Math.round(sum * 100) / 100;
  });

  const grandTotal =
    Math.round(authorRows.reduce((s, row) => s + row.rowTotal, 0) * 100) / 100;

  return {
    quarterColumns,
    authorRows,
    columnTotals,
    grandTotal,
  };
}
