import { prisma } from "../prisma";
import { BookListItem, publicationSortKeyFromDate } from "./books";
import { SortColumn } from "../types/sort";

interface SearchFilters {
  search?: string;
}

interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Whitelist mapping column keys to SQL column references.
 * "series" expands to two terms: ser.name, then b.series_order.
 */
const SQL_SORT_FIELD_MAP: Record<string, string[]> = {
  title: ["b.title"],
  author: ["a.name"],
  isbn13: ["b.isbn13"],
  isbn10: ["b.isbn10"],
  publication: ["b.publication_date"],
  distRoyaltyRate: ["b.dist_author_royalty_rate"],
  totalSales: ["total_sales"],
  series: ["ser.name", "b.series_order"],
};

/**
 * Build a multi-column ORDER BY clause from SortColumn[].
 * Whitelist-based — only known fields are emitted; unknown fields are skipped.
 */
export function buildSqlOrderBy(sortColumns: SortColumn[]): string {
  const terms: string[] = [];
  for (const col of sortColumns) {
    const sqlCols = SQL_SORT_FIELD_MAP[col.field];
    if (!sqlCols) continue;
    const dir = col.direction === "desc" ? "DESC" : "ASC";
    for (const sqlCol of sqlCols) {
      terms.push(`${sqlCol} ${dir}`);
    }
  }
  // Fallback: if no valid columns, default to title ASC
  if (terms.length === 0) {
    terms.push("b.title ASC");
  }
  return terms.join(", ");
}

/**
 * Builds WHERE clause conditions for book search filters
 * Returns the SQL WHERE clause string and parameters array
 */
function buildSearchWhereClause(
  trimmedSearch?: string
): { whereClause: string; params: unknown[] } {
  const whereConditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (trimmedSearch) {
    const query = trimmedSearch;
    const normalizedIsbn = trimmedSearch.replace(/[-\s]/g, "");

    // Title match (case-insensitive) - parameterized
    whereConditions.push(`b.title ILIKE $${paramIndex}`);
    params.push(`%${query}%`);
    paramIndex++;

    // Author name match (case-insensitive) - parameterized
    whereConditions.push(`a.name ILIKE $${paramIndex}`);
    params.push(`%${query}%`);
    paramIndex++;

    // Series name match (case-insensitive) - parameterized
    whereConditions.push(`ser.name ILIKE $${paramIndex}`);
    params.push(`%${query}%`);
    paramIndex++;

    // ISBN conditions - parameterized
    if (normalizedIsbn) {
      whereConditions.push(`b.isbn13 LIKE $${paramIndex}`);
      params.push(`%${normalizedIsbn}%`);
      paramIndex++;

      whereConditions.push(`b.isbn10 LIKE $${paramIndex}`);
      params.push(`%${normalizedIsbn}%`);
      paramIndex++;
    }
  }

  const whereClause =
    whereConditions.length > 0
      ? `WHERE (${whereConditions.join(" OR ")})`
      : "";

  return { whereClause, params };
}

/**
 * Fetches books using raw SQL when any sort column is totalSales.
 * Supports multi-column ORDER BY via buildSqlOrderBy.
 */
export async function getBooksSortedByTotalSales(
  filters: SearchFilters,
  pagination: PaginationParams,
  sortColumns: SortColumn[]
): Promise<{
  items: BookListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const { search } = filters;
  const { page, pageSize } = pagination;

  const trimmedSearch = search?.trim();
  const currentPage = Math.max(1, page || 1);
  const limit = Math.max(1, Math.min(pageSize || 20, 100));

  // Build WHERE clause for search filters
  const { whereClause, params: searchParams } =
    buildSearchWhereClause(trimmedSearch);

  // Build multi-column ORDER BY clause
  const orderByClause = buildSqlOrderBy(sortColumns);

  // Calculate parameter indices for LIMIT and OFFSET
  const limitParamIndex = searchParams.length + 1;
  const offsetParamIndex = searchParams.length + 2;

  // Query to get paginated results with total sales computed in DB
  // Note: Column name is "authorId" (camelCase) as created in migration
  const resultsQuery = `
    SELECT
      b.id,
      b.title,
      a.name AS author,
      b.isbn13,
      b.isbn10,
      b.publication_date,
      b.dist_author_royalty_rate,
      b.hand_sold_author_royalty_rate,
      b.cover_price,
      b.print_cost,
      b.series_order,
      ser.name AS series_name,
      b.cover_art_path,
      COALESCE(SUM(s.quantity), 0)::INTEGER AS total_sales
    FROM books b
    INNER JOIN authors a ON a.id = b."authorId"
    LEFT JOIN sales s ON s.book_id = b.id
    LEFT JOIN series ser ON ser.id = b.series_id
    ${whereClause}
    GROUP BY b.id, b.title, a.name, b.isbn13, b.isbn10, b.publication_date, b.dist_author_royalty_rate, b.hand_sold_author_royalty_rate, b.cover_price, b.print_cost, b.series_order, ser.name, b.cover_art_path
    ORDER BY ${orderByClause}
    LIMIT $${limitParamIndex}
    OFFSET $${offsetParamIndex}
  `;

  const allParams = [...searchParams, limit, (currentPage - 1) * limit];

  // Query to get total count (for pagination) - reuse same WHERE clause
  // Join series when searching so WHERE can reference ser.name
  const countQuery = `
    SELECT COUNT(DISTINCT b.id) AS total
    FROM books b
    INNER JOIN authors a ON a.id = b."authorId"
    LEFT JOIN series ser ON ser.id = b.series_id
    ${whereClause}
  `;

  const [results, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{
      id: number;
      title: string;
      author: string;
      isbn13: string;
      isbn10: string | null;
      publication_date: Date;
      dist_author_royalty_rate: number;
      hand_sold_author_royalty_rate: number;
      cover_price: string;
      print_cost: string;
      series_order: number | null;
      series_name: string | null;
      cover_art_path: string | null;
      total_sales: number;
    }>>(resultsQuery, ...allParams),
    prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
      countQuery,
      ...searchParams // Count query doesn't need limit/offset params
    ),
  ]);

  const total = Number(countResult[0]?.total ?? 0);

  // Map database results to BookListItem format
  const items: BookListItem[] = results.map((row) => {
    const distRoyaltyRate = Math.round(row.dist_author_royalty_rate * 100);
    const handSoldRoyaltyRate = Math.round(row.hand_sold_author_royalty_rate * 100);
    const publicationSortKey = publicationSortKeyFromDate(
      row.publication_date
    );
    return {
      id: row.id,
      title: row.title,
      author: row.author,
      isbn13: row.isbn13,
      isbn10: row.isbn10,
      publicationDate: row.publication_date,
      publicationSortKey,
      distRoyaltyRate,
      handSoldRoyaltyRate,
      coverPrice: Number(row.cover_price),
      printCost: Number(row.print_cost),
      seriesName: row.series_name,
      seriesOrder: row.series_order,
      coverArtPath: row.cover_art_path ?? null,
      totalSales: row.total_sales,
    };
  });

  return { items, total, page: currentPage, pageSize: limit };
}
