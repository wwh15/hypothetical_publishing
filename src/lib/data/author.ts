import { Author, Prisma } from "@prisma/client";
import { prisma } from "../prisma";

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

// Sort field map for server-side sorting (column key -> Prisma orderBy asc)
const SORT_ASC: Record<string, Prisma.AuthorOrderByWithRelationInput> = {
  id: { id: "asc" },
  email: { email: "asc" },
  authoredBooks: { books: { _count: "asc" } },
  totalAuthorRoyalty: { totalAuthorRoyalty: "asc" },
  paidAuthorRoyalty: { paidAuthorRoyalty: "asc" },
  unPaidAuthorRoyalty: { unpaidAuthorRoyalty: "asc" },
};

const SORT_DESC: Record<string, Prisma.AuthorOrderByWithRelationInput> = {
  id: { id: "desc" },
  email: { email: "desc" },
  authoredBooks: { books: { _count: "desc" } },
  totalAuthorRoyalty: { totalAuthorRoyalty: "desc" },
  paidAuthorRoyalty: { paidAuthorRoyalty: "desc" },
  unPaidAuthorRoyalty: { unpaidAuthorRoyalty: "desc" },
};

function buildOrderBy(
  sortBy: string,
  sortDir: "asc" | "desc"
): Prisma.AuthorOrderByWithRelationInput {
  const map = sortDir === "desc" ? SORT_DESC : SORT_ASC;
  return (
    map[sortBy] ?? (sortDir === "desc" ? { name: "desc" } : { name: "asc" })
  );
}

export async function getAuthorsData({
  search,
  page = 1,
  pageSize = 20,
  sortBy = "name",
  sortDir = "desc",
}: GetAuthorDataParams): Promise<GetAuthorsDataResult> {
  const currentPage = Math.max(1, page);
  const limit = Math.max(1, Math.min(pageSize, 100));

  const where: Prisma.AuthorWhereInput = {};

  // 1. Build Filter Logic
  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    where.OR = [
      { name: { contains: trimmedSearch, mode: "insensitive" } },
      { email: { contains: trimmedSearch, mode: "insensitive" } },
    ];
  }

  // 3. Single, Optimized Database Query
  const [authors, total] = await Promise.all([
    prisma.author.findMany({
      where,
      include: {
        _count: {
          select: { books: true }, // This counts the related 'books' array
        },
      },
      // Database handles the sort
      orderBy: buildOrderBy(sortBy, sortDir),
      // Database handles the pagination
      skip: (currentPage - 1) * limit,
      take: limit,
    }),
    prisma.author.count({ where }),
  ]);

  return {
    items: authors.map(toAuthorListItem),
    total,
    page: currentPage,
    pageSize: limit,
  };
}

// Define what the database query result looks like
type AuthorWithCount = Author & {
  _count: {
    books: number;
  };
};

export function toAuthorListItem(author: AuthorWithCount): AuthorListItem {
  return {
    id: author.id,
    name: author.name,
    email: author.email ?? "",
    // Use the count from the Prisma relation
    authoredBooks: author._count.books,
    // Convert Prisma Decimals to numbers for the frontend
    totalAuthorRoyalty: author.totalAuthorRoyalty.toNumber(),
    paidAuthorRoyalty: author.paidAuthorRoyalty.toNumber(),
    unpaidAuthorRoyalty: author.unpaidAuthorRoyalty.toNumber(),
  };
}
