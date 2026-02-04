// lib/data/records.ts
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

export interface SaleListItem {
  id: number;
  bookId: number;
  title: string;
  author: string;
  date: string;
  quantity: number;
  publisherRevenue: number;
  authorRoyalty: number;
  paid: "paid" | "pending";
}

export interface PendingSaleItem {
  // No id - these aren't saved yet
  bookId: number;
  title: string;
  author: string[];
  date: string; // MM-YYYY format
  quantity: number;
  publisherRevenue: number;
  authorRoyalty: number;
  royaltyOverridden: boolean; // Whether user manually overrode the calculated royalty
  paid: boolean; // Always false for pending, but included for consistency
}

export type SaleDetailPayload = Prisma.SaleGetPayload<{
  include: { book: { include: { authors: true } } };
}>;

// Sort field map for server-side sorting (column key -> Prisma orderBy asc)
const SORT_ASC: Record<string, Prisma.SaleOrderByWithRelationInput> = {
  id: { id: "asc" },
  title: { book: { title: "asc" } },
  author: { book: { title: "asc" } },
  date: { date: "asc" },
  quantity: { quantity: "asc" },
  publisherRevenue: { publisherRevenue: "asc" },
  authorRoyalty: { authorRoyalty: "asc" },
  paid: { paid: "asc" },
};

const SORT_DESC: Record<string, Prisma.SaleOrderByWithRelationInput> = {
  id: { id: "desc" },
  title: { book: { title: "desc" } },
  author: { book: { title: "desc" } },
  date: { date: "desc" },
  quantity: { quantity: "desc" },
  publisherRevenue: { publisherRevenue: "desc" },
  authorRoyalty: { authorRoyalty: "desc" },
  paid: { paid: "desc" },
};

function buildOrderBy(
  sortBy: string,
  sortDir: "asc" | "desc"
): Prisma.SaleOrderByWithRelationInput {
  const map = sortDir === "desc" ? SORT_DESC : SORT_ASC;
  return map[sortBy] ?? (sortDir === "desc" ? { date: "desc" } : { date: "asc" });
}

export interface GetSalesDataParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  dateFrom?: string; // MM-YYYY
  dateTo?: string; // MM-YYYY
}

export interface GetSalesDataResult {
  items: SaleListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** Server-side paginated/filtered/sorted sales list */
export async function getSalesData({
  search,
  page = 1,
  pageSize = 20,
  sortBy = "date",
  sortDir = "desc",
  dateFrom,
  dateTo,
}: GetSalesDataParams): Promise<GetSalesDataResult> {
  const currentPage = Math.max(1, page);
  const limit = Math.max(1, Math.min(pageSize, 100));

  const where: Prisma.SaleWhereInput = {};

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    where.OR = [
      {
        book: {
          title: { contains: trimmedSearch, mode: "insensitive" },
        },
      },
      {
        book: {
          authors: {
            some: {
              name: { contains: trimmedSearch, mode: "insensitive" },
            },
          },
        },
      },
    ];
  }

  const from = dateFrom?.trim();
  const to = dateTo?.trim();
  if (from && to) {
    where.date = { gte: from, lte: to };
  } else if (from) {
    where.date = { gte: from };
  } else if (to) {
    where.date = { lte: to };
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { book: { include: { authors: true } } },
      orderBy: buildOrderBy(sortBy, sortDir),
      skip: (currentPage - 1) * limit,
      take: limit,
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    items: sales.map(toSaleListItem),
    total,
    page: currentPage,
    pageSize: limit,
  };
}

export interface GetSalesByBookIdParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

/** Server-side paginated/sorted sales for a single book (e.g. book detail page). */
export async function getSalesByBookId(
  bookId: number,
  {
    page = 1,
    pageSize = 10,
    sortBy = "date",
    sortDir = "desc",
  }: GetSalesByBookIdParams = {}
): Promise<GetSalesDataResult> {
  const currentPage = Math.max(1, page);
  const limit = Math.max(1, Math.min(pageSize, 100));
  const where: Prisma.SaleWhereInput = { bookId };

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { book: { include: { authors: true } } },
      orderBy: buildOrderBy(sortBy, sortDir),
      skip: (currentPage - 1) * limit,
      take: limit,
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    items: sales.map(toSaleListItem),
    total,
    page: currentPage,
    pageSize: limit,
  };
}

export default async function asyncGetSalesData() {
  return await prisma.sale.findMany({
    include: { book: { include: { authors: true } } },
    orderBy: { date: "desc" },
  });
}

export async function asyncGetSaleById(id: number) {
  return await prisma.sale.findUnique({
    where: { id },
    include: { book: { include: { authors: true } } },
  });
}

// mapper used by list/payment screens
export function toSaleListItem(sale: {
  id: number;
  bookId: number;
  date: string;
  quantity: number;
  publisherRevenue: number;
  authorRoyalty: number;
  paid: boolean;
  book: { title: string; authors: { name: string }[] };
}): SaleListItem {
  return {
    id: sale.id,
    bookId: sale.bookId,
    title: sale.book.title,
    author: sale.book.authors.map((a) => a.name).join(", "),
    date: sale.date,
    quantity: sale.quantity,
    publisherRevenue: sale.publisherRevenue,
    authorRoyalty: sale.authorRoyalty,
    paid: sale.paid ? "paid" : "pending",
  };
}

export async function asyncAddSale(data: Prisma.SaleUncheckedCreateInput) {
  return await prisma.sale.create({ data });
}

// write ops moved here
export async function asyncUpdateSale(
  id: number,
  data: {
    bookId?: number;
    date?: string;
    quantity?: number;
    publisherRevenue?: number;
    authorRoyalty?: number;
    royaltyOverridden?: boolean;
    paid?: boolean;
  },
) {
  return await prisma.sale.update({ where: { id }, data });
}

export async function asyncDeleteSale(id: number) {
  return await prisma.sale.delete({ where: { id } });
}

export async function asyncTogglePaidStatus(
  id: number,
  currentStatus: boolean,
) {
  return await prisma.sale.update({
    where: { id },
    data: { paid: !currentStatus },
  });
}
