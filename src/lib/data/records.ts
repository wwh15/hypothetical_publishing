// lib/data/records.ts
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { Decimal } from "@prisma/client/runtime/library";

export interface SaleListItem {
  id: number;
  bookId: number;
  title: string;
  author: string;
  date: Date; // First day of sale month
  quantity: number;
  publisherRevenue: number;
  authorRoyalty: number;
  paid: "paid" | "pending";
  comment: string | null;
  source: "DISTRIBUTOR" | "HAND_SOLD";
}

export interface PendingSaleItem {
  // No id - these aren't saved yet
  bookId: number;
  title: string;
  author: string;
  date: Date; // MM-YYYY format
  quantity: number;
  publisherRevenue: number;
  authorRoyalty: number;
  royaltyOverridden: boolean; // Whether user manually overrode the calculated royalty
  paid: boolean; // Always false for pending, but included for consistency
  comment?: string | null;
  source: "DISTRIBUTOR" | "HAND_SOLD";
}

// This represents the data AFTER it has been converted to numbers
export type SaleDetailPayload = {
  id: number;
  date: Date;
  quantity: number;
  publisherRevenue: number; // Changed from Decimal to number
  authorRoyalty: number; // Changed from Decimal to number
  paid: boolean;
  royaltyOverridden: boolean;
  comment: string | null;
  source: "DISTRIBUTOR" | "HAND_SOLD";
  book: {
    id: number;
    title: string;
    author: {
      id: number;
      name: string;
    };
  };
};

// Sort field map for server-side sorting (column key -> Prisma orderBy asc)
const SORT_ASC: Record<string, Prisma.SaleOrderByWithRelationInput> = {
  id: { id: "asc" },
  title: { book: { title: "asc" } },
  author: { book: { author: { name: "asc" } } },
  date: { date: "asc" },
  quantity: { quantity: "asc" },
  publisherRevenue: { publisherRevenue: "asc" },
  authorRoyalty: { authorRoyalty: "asc" },
  paid: { paid: "asc" },
  source: { source: "asc" },
};

const SORT_DESC: Record<string, Prisma.SaleOrderByWithRelationInput> = {
  id: { id: "desc" },
  title: { book: { title: "desc" } },
  author: { book: { author: { name: "desc" } } },
  date: { date: "desc" },
  quantity: { quantity: "desc" },
  publisherRevenue: { publisherRevenue: "desc" },
  authorRoyalty: { authorRoyalty: "desc" },
  paid: { paid: "desc" },
  source: { source: "desc" },
};

function buildOrderBy(
  sortBy: string,
  sortDir: "asc" | "desc"
): Prisma.SaleOrderByWithRelationInput {
  const map = sortDir === "desc" ? SORT_DESC : SORT_ASC;
  return (
    map[sortBy] ?? (sortDir === "desc" ? { date: "desc" } : { date: "asc" })
  );
}

/**
 * Parses "YYYY-MM" into a UTC Date object.
 * @param dateStr The date string (YYYY-MM)
 * @param endOfMonth If true, returns the last millisecond of the month in UTC.
 */
function parseDate(
  dateStr: string,
  endOfMonth: boolean = false
): Date | undefined {
  const trimmed = dateStr?.trim();
  if (!trimmed) return undefined;

  // Since we enforced YYYY-MM in the frontend, we split simply
  const [year, month] = trimmed.split("-").map(Number);

  if (!year || !month || month < 1 || month > 12) {
    return undefined;
  }

  if (endOfMonth) {
    // Last moment of the month: Year, Month, Day 0 (last day of prev month), 23:59:59
    // e.g., 2026-02 -> Date.UTC(2026, 2, 0...) -> Feb 28th 23:59:59.999Z
    return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  }
  
  // First moment: Year, Month-1 (0-indexed), Day 1, 00:00:00.000Z
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
}


export interface GetSalesDataParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  dateFrom?: string; // YYYY-MM (parsed in parseDate)
  dateTo?: string; // YYYY-MM (parsed in parseDate)
  source?: "DISTRIBUTOR" | "HAND_SOLD";
}

export interface GetSalesDataResult {
  items: SaleListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** Database paginated/filtered/sorted sales list */
export async function getSalesData({
  search,
  page = 1,
  pageSize = 20,
  sortBy = "date",
  sortDir = "desc",
  dateFrom,
  dateTo,
  source,
}: GetSalesDataParams): Promise<GetSalesDataResult> {
  const currentPage = Math.max(1, page);
  const limit = Math.max(1, Math.min(pageSize, 100));

  const where: Prisma.SaleWhereInput = {};

  // Source filter
  if (source) {
    where.source = source;
  }

  // 1. Build Filter Logic
  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    where.OR = [
      { book: { title: { contains: trimmedSearch, mode: "insensitive" } } },
      {
        book: {
          author: { name: { contains: trimmedSearch, mode: "insensitive" } },
        },
      },
      {
        book: {
          series: {
            name: { contains: trimmedSearch, mode: "insensitive" },
          },
        },
      },
    ];
  }

  // 2. Handle Date Range Filtering
  const fromDate = dateFrom?.trim() ? parseDate(dateFrom) : undefined;
  const toDate = dateTo?.trim() ? parseDate(dateTo, true) : undefined;
  if (fromDate || toDate) {
    where.date = {};
    if (fromDate) where.date.gte = fromDate;
    if (toDate) where.date.lte = toDate;
  }

  // 3. Single, Optimized Database Query
  // No more "if (sortBy === 'date')" branch!
  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        book: {
          include: { author: true },
        },
      },
      // Database handles the sort
      orderBy: buildOrderBy(sortBy, sortDir),
      // Database handles the pagination
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

/** Server-side paginated/sorted sales for a single book. */
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

  // One single query for everything
  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { book: { include: { author: true } } },
      orderBy: buildOrderBy(sortBy, sortDir), // DB handles chronological sort
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

// Optimized: Get all sales sorted by date natively in the DB
export default async function asyncGetSalesData() {
  return await prisma.sale.findMany({
    include: { book: { include: { author: true } } },
    orderBy: { date: "desc" }, // No more JS .sort() needed!
  });
}

export async function asyncGetSaleById(
  id: number
): Promise<SaleDetailPayload | null> {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { book: { include: { author: true } } },
  });

  if (!sale) return null;

  // Build plain object so Client Components never receive Prisma Decimal or other non-serializable values
  return {
    id: sale.id,
    date: sale.date,
    quantity: sale.quantity,
    publisherRevenue: sale.publisherRevenue.toNumber(),
    authorRoyalty: sale.authorRoyalty.toNumber(),
    royaltyOverridden: sale.royaltyOverridden,
    paid: sale.paid,
    comment: sale.comment ?? null,
    source: sale.source,
    book: {
      id: sale.book.id,
      title: sale.book.title,
      author: {
        id: sale.book.author.id,
        name: sale.book.author.name,
      },
    },
  };
}

// mapper used by list/payment screens
export function toSaleListItem(sale: {
  id: number;
  bookId: number;
  date: Date;
  quantity: number;
  publisherRevenue: Decimal;
  authorRoyalty: Decimal;
  paid: boolean;
  comment: string | null;
  source: "DISTRIBUTOR" | "HAND_SOLD";
  book: { title: string; author: { name: string } };
}): SaleListItem {
  return {
    id: sale.id,
    bookId: sale.bookId,
    title: sale.book.title,
    author: sale.book.author.name,
    date: sale.date,
    quantity: sale.quantity,
    publisherRevenue: sale.publisherRevenue.toNumber(),
    authorRoyalty: sale.authorRoyalty.toNumber(),
    paid: sale.paid ? "paid" : "pending",
    comment: sale.comment ?? null,
    source: sale.source,
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
    date?: Date;
    quantity?: number;
    publisherRevenue?: number;
    authorRoyalty?: number;
    royaltyOverridden?: boolean;
    paid?: boolean;
    comment?: string | null;
    source?: "DISTRIBUTOR" | "HAND_SOLD";
  }
) {
  return await prisma.sale.update({
    where: { id },
    data,
    include: { book: true },
  });
}

export async function asyncDeleteSale(id: number) {
  return await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id },
      include: { book: true },
    });
    if (!sale) return;

    await tx.sale.delete({ where: { id } });
  });
}

export async function asyncTogglePaidStatus(
  id: number,
  currentStatus: boolean
) {
  return await prisma.$transaction(async (tx) => {
    // Perform the update
    const sale = await tx.sale.update({
      where: { id },
      data: { paid: !currentStatus },
      include: { book: true }, // Need this to get the authorId
    });
    return sale;
  });
}
