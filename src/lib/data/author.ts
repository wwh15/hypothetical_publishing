import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { Decimal } from "decimal.js";

export interface AuthorListItem {
  id: number;
  name: string;
  email: string;
  authoredBooks: number;
  totalAuthorRoyalty: number;
  paidAuthorRoyalty: number;
  unpaidAuthorRoyalty: number;
}

export interface GetAuthorDataParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface GetAuthorsDataResult {
  items: AuthorListItem[];
  total: number;
  page: number;
  pageSize: number;
}

// 1. Define the SQL Column Map
// We use the actual DB column names (snake_case) defined in your @map attributes
const SQL_SORT_MAP: Record<string, string> = {
  id: "a.id",
  name: "a.name",
  email: "a.email",
  authoredBooks: '"authoredBooks"',
  totalAuthorRoyalty: '"totalAuthorRoyalty"',
  paidAuthorRoyalty: '"paidAuthorRoyalty"',
  unpaidAuthorRoyalty: '"unpaidAuthorRoyalty"',
};

// 2. Define the Raw Query Result Shape
interface RawAuthorResult {
  id: number;
  name: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
  authoredBooks: number;
  totalAuthorRoyalty: string | number | Prisma.Decimal;
  paidAuthorRoyalty: string | number | Prisma.Decimal;
  unpaidAuthorRoyalty: string | number | Prisma.Decimal;
}

// 3. The Mapping Helper
export function toAuthorListItem(author: RawAuthorResult): AuthorListItem {
  const formatSafe = (val: string | number | Prisma.Decimal): number => {
    if (val === null || val === undefined) return 0;
    // Using decimal.js constructor is the safest way to avoid precision loss
    // before converting to a JS number for the UI.
    // 1. If it's already a Decimal object, it has the .toNumber method
    if (typeof val === "object" && "toNumber" in val) {
      return (val as Prisma.Decimal).toNumber();
    }

    // 2. If it's a string or number, the constructor handles it without 'any'
    return new Decimal(val).toNumber();
  };

  return {
    id: author.id,
    name: author.name,
    email: author.email ?? "",
    authoredBooks: author.authoredBooks,
    totalAuthorRoyalty: formatSafe(author.totalAuthorRoyalty),
    paidAuthorRoyalty: formatSafe(author.paidAuthorRoyalty),
    unpaidAuthorRoyalty: formatSafe(author.unpaidAuthorRoyalty),
  };
}

// 4. The Main Query Function
export async function getAuthorsData({
  search,
  page = 1,
  pageSize = 20,
  sortBy = "name",
  sortDir = "asc",
}: GetAuthorDataParams): Promise<GetAuthorsDataResult> {
  const currentPage = Math.max(1, page);
  const limit = Math.max(1, Math.min(pageSize, 100));
  const offset = (currentPage - 1) * limit;

  const searchPattern = search ? `%${search}%` : "%";
  const sortColumn = SQL_SORT_MAP[sortBy] || "a.name";
  const direction =
    sortDir.toLowerCase() === "desc" ? Prisma.sql`DESC` : Prisma.sql`ASC`;

  /**
   * IMPORTANT: We use database-level names here:
   * - Tables: "authors", "books", "sales"
   * - Columns: "author_id", "book_id", "author_royalty", "created_at"
   */
  const authors = await prisma.$queryRaw<RawAuthorResult[]>`
    SELECT 
      a.id, 
      a.name, 
      a.email,
      a.created_at AS "createdAt",
      a.updated_at AS "updatedAt",
      COUNT(DISTINCT b.id)::int AS "authoredBooks",
      SUM(COALESCE(s.author_royalty, 0)) AS "totalAuthorRoyalty",
      SUM(CASE WHEN s.paid = true THEN COALESCE(s.author_royalty, 0) ELSE 0 END) AS "paidAuthorRoyalty",
      SUM(CASE WHEN s.paid = false THEN COALESCE(s.author_royalty, 0) ELSE 0 END) AS "unpaidAuthorRoyalty"
    FROM authors a
    LEFT JOIN books b ON b."authorId" = a.id
    LEFT JOIN sales s ON s.book_id = b.id
    WHERE a.name ILIKE ${searchPattern} OR a.email ILIKE ${searchPattern}
    GROUP BY a.id, a.name, a.email, a.created_at, a.updated_at
    ORDER BY ${Prisma.raw(sortColumn)} ${direction}
    LIMIT ${limit} OFFSET ${offset}
  `;

  const totalCount = await prisma.author.count({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {},
  });

  return {
    items: authors.map(toAuthorListItem),
    total: totalCount,
    page: currentPage,
    pageSize: limit,
  };
}
