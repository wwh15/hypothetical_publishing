import { prisma } from "../prisma";
import { BookListItem, publicationSortKeyFromDate } from "./books";

interface SearchFilters {
  search?: string;
}

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface SortParams {
  sortDir: "asc" | "desc";
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
 * Fetches books sorted by total sales using raw SQL aggregation.
 * This is more efficient than loading all books and computing totals in memory.
 */
export async function getBooksSortedByTotalSales(
  filters: SearchFilters,
  pagination: PaginationParams,
  sort: SortParams
): Promise<{
  items: BookListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const { search } = filters;
  const { page, pageSize } = pagination;
  const { sortDir } = sort;

  const trimmedSearch = search?.trim();
  const currentPage = Math.max(1, page || 1);
  const limit = Math.max(1, Math.min(pageSize || 20, 100));

  // Build WHERE clause for search filters
  const { whereClause, params: searchParams } =
    buildSearchWhereClause(trimmedSearch);

  // Build ORDER BY clause
  const orderDirection = sortDir === "desc" ? "DESC" : "ASC";

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
      b.author_royalty_rate,
      COALESCE(SUM(s.quantity), 0)::INTEGER AS total_sales
    FROM books b
    INNER JOIN authors a ON a.id = b."authorId"
    LEFT JOIN sales s ON s.book_id = b.id
    ${whereClause}
    GROUP BY b.id, b.title, a.name, b.isbn13, b.isbn10, b.publication_date, b.author_royalty_rate
    ORDER BY total_sales ${orderDirection}, b.title ASC
    LIMIT $${limitParamIndex}
    OFFSET $${offsetParamIndex}
  `;

  const allParams = [...searchParams, limit, (currentPage - 1) * limit];

  // Query to get total count (for pagination) - reuse same WHERE clause
  const countQuery = `
    SELECT COUNT(DISTINCT b.id) AS total
    FROM books b
    INNER JOIN authors a ON a.id = b."authorId"
    ${whereClause}
  `;

  const [results, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{
      id: number;
      title: string;
      author: string;
      isbn13: string | null;
      isbn10: string | null;
      publication_date: Date | null;
      author_royalty_rate: number;
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
    const defaultRoyaltyRate = Math.round(row.author_royalty_rate * 100);
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
      defaultRoyaltyRate,
      totalSales: row.total_sales,
    };
  });

  return { items, total, page: currentPage, pageSize: limit };
}
