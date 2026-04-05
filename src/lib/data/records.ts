// lib/data/records.ts
import { Prisma, type SaleSource } from "@prisma/client";
import { prisma } from "../prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { validateSaleRecord } from "../validation/sale";

export interface SaleListItem {
  id: number;
  bookId: number;
  title: string;
  author: string;
  date: Date; // First day of sale month
  quantity: number | null;
  kenp: number | null;
  format: "PRINT" | "EBOOK" | "KINDLE_UNLIMITED";
  distributor: "INGRAM_SPARK" | "AMAZON" | "OTHER" | null;
  publisherRevenueUSD: number;
  publisherRevenueOriginal: number;
  currency: string;
  authorRoyalty: number;
  paid: "paid" | "pending";
  comment: string | null;
  source: SaleSource;
  /** False when the sale’s book is not yet released (pre-release / projected). */
  bookReleased: boolean;
}

/** Staging row before DB insert; `id` disambiguates duplicate lines in the UI. */
export interface PendingSaleItem {
  id: string;
  bookId: number;
  title: string;
  author: string;
  date: Date; // First day of sale month
  quantity: number | null;
  kenp: number | null;
  format: "PRINT" | "EBOOK" | "KINDLE_UNLIMITED";
  distributor: "INGRAM_SPARK" | "AMAZON" | "OTHER" | null;
  publisherRevenueUSD: number;
  publisherRevenueOriginal: number;
  currency: string;
  authorRoyalty: number;
  paid: boolean;
  comment?: string | null;
  source: SaleSource;
}

// This represents the data AFTER it has been converted to numbers
export type SaleDetailPayload = {
  id: number;
  date: Date;
  quantity: number | null;
  kenp: number | null;
  format: "PRINT" | "EBOOK" | "KINDLE_UNLIMITED";
  distributor: "INGRAM_SPARK" | "AMAZON" | "OTHER" | null;
  publisherRevenueUSD: number;
  publisherRevenueOriginal: number;
  currency: string;
  authorRoyalty: number;
  paid: boolean;
  comment: string | null;
  source: SaleSource;
  book: {
    id: number;
    title: string;
    author: {
      id: number;
      name: string;
    };
  };
};

export interface UpdateSaleItem {
  bookId?: number;
  date?: Date;
  quantity?: number | null;
  kenp?: number | null;
  publisherRevenueUSD?: number;
  publisherRevenueOriginal?: number;
  currency?: string;
  authorRoyalty?: number;
  paid?: boolean;
  comment?: string | null;
  source?: SaleSource;
  distributor?: "INGRAM_SPARK" | "AMAZON" | "OTHER" | null;
  format?: "PRINT" | "EBOOK" | "KINDLE_UNLIMITED";
}

// Sort field map for server-side sorting (column key -> Prisma orderBy asc)
const SORT_ASC: Record<string, Prisma.SaleOrderByWithRelationInput> = {
  id: { id: "asc" },
  title: { book: { title: "asc" } },
  author: { book: { author: { name: "asc" } } },
  date: { date: "asc" },
  quantity: { quantity: "asc" },
  kenp: { kenp: "asc" },
  format: { format: "asc" },
  distributor: { distributor: "asc" },
  publisherRevenueUSD: { publisherRevenueUSD: "asc" },
  publisherRevenueOriginal: { publisherRevenueOriginal: "asc" },
  currency: { currency: "asc" },
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
  kenp: { kenp: "desc" },
  format: { format: "desc" },
  distributor: { distributor: "desc" },
  publisherRevenueUSD: { publisherRevenueUSD: "desc" },
  publisherRevenueOriginal: { publisherRevenueOriginal: "desc" },
  currency: { currency: "desc" },
  authorRoyalty: { authorRoyalty: "desc" },
  paid: { paid: "desc" },
  source: { source: "desc" },
};

function buildOrderBy(
  sortBy: string,
  sortDir: "asc" | "desc"
): Prisma.SaleOrderByWithRelationInput | Prisma.SaleOrderByWithRelationInput[] {
  const map = sortDir === "desc" ? SORT_DESC : SORT_ASC;
  
  if (sortBy === "publisherRevenueOriginal") {
    return [
      { currency: "asc" },
      { publisherRevenueOriginal: sortDir },
      { id: "asc" },
    ];
  }
  
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


/** Filter list sales by whether the book is released (real) or not (projected). */
export type SaleReleaseFilter = "projected" | "real";

export interface GetSalesDataParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  dateFrom?: string; // YYYY-MM (parsed in parseDate)
  dateTo?: string; // YYYY-MM (parsed in parseDate)
  source?: SaleSource;
  distributor?: "INGRAM_SPARK" | "AMAZON" | "OTHER";
  format?: "PRINT" | "EBOOK" | "KINDLE_UNLIMITED";
  /** projected = book.released false; real = book.released true */
  saleRelease?: SaleReleaseFilter;
  pagination?: boolean;
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
  distributor,
  format,
  saleRelease,
  pagination = true,
}: GetSalesDataParams): Promise<GetSalesDataResult> {
  const currentPage = Math.max(1, page);
  const limit = Math.max(1, Math.min(pageSize, 100));

  const where: Prisma.SaleWhereInput = {};

  if (saleRelease === "projected") {
    where.book = { released: false };
  } else if (saleRelease === "real") {
    where.book = { released: true };
  }

  // Source filter
  if (source) {
    where.source = source;
  }

  // Distributor filter (only applies to distributor sales)
  if (distributor) {
    where.distributor = distributor;
  }

  // Format filter
  if (format) {
    where.format = format;
  }

  // Build Filter Logic
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

  // Handle Date Range Filtering
  const fromDate = dateFrom?.trim() ? parseDate(dateFrom) : undefined;
  const toDate = dateTo?.trim() ? parseDate(dateTo, true) : undefined;
  if (fromDate || toDate) {
    where.date = {};
    if (fromDate) where.date.gte = fromDate;
    if (toDate) where.date.lte = toDate;
  }

  // Conditionally add pagination (limit and offset) to query
  const queryOptions = {
    where,
    include: {
      book: {
        include: { author: true },
      },
    },
    orderBy: buildOrderBy(sortBy, sortDir),
    ...(pagination
      ? {
          skip: (currentPage - 1) * limit,
          take: limit,
        }
      : {}),
  };

  const [sales, total] = await Promise.all([
    prisma.sale.findMany(queryOptions),
    prisma.sale.count({ where }),
  ]);

  return {
    items: sales.map(toSaleListItem),
    total,
    page: pagination ? currentPage : 1,
    pageSize: pagination ? limit : total,
  };
}

export interface GetSalesByBookIdParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export async function asyncAddSalesBulk(records: PendingSaleItem[]) {
  try {
    // Map the UI items to exactly what the Prisma Schema expects
    const data = records.map((record) => ({
      bookId: record.bookId,
      date: record.date,
      quantity: record.quantity,
      kenp: record.kenp,
      format: record.format,
      // Distributor only when source is DISTRIBUTOR
      distributor: record.source === "DISTRIBUTOR" ? record.distributor : null,
      publisherRevenueUSD: record.publisherRevenueUSD,
      publisherRevenueOriginal: record.publisherRevenueOriginal,
      currency: record.currency,
      authorRoyalty: record.authorRoyalty,
      paid: record.paid,
      comment: record.comment ?? null,
      source: record.source,
    }));

    await prisma.sale.createMany({
      data,
      skipDuplicates: false, // Set to true if you have a unique constraint you want to ignore
    });

    return { success: true };
  } catch (error) {
    console.error("Bulk Save Error:", error);
    return { success: false, error: "Failed to save records to database." };
  }
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
    kenp: sale.kenp != null ? sale.kenp.toNumber() : null,
    format: sale.format,
    distributor: sale.distributor,
    publisherRevenueUSD: sale.publisherRevenueUSD.toNumber(),
    publisherRevenueOriginal: sale.publisherRevenueOriginal.toNumber(),
    currency: sale.currency,
    authorRoyalty: sale.authorRoyalty.toNumber(),
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
  quantity: number | null;
  kenp: Decimal | null;
  format: "PRINT" | "EBOOK" | "KINDLE_UNLIMITED";
  distributor: "INGRAM_SPARK" | "AMAZON" | "OTHER" | null;
  publisherRevenueUSD: Decimal;
  publisherRevenueOriginal: Decimal;
  currency: string;
  authorRoyalty: Decimal;
  paid: boolean;
  comment: string | null;
  source: SaleSource;
  book: { title: string; released: boolean; author: { name: string } };
}): SaleListItem {
  return {
    id: sale.id,
    bookId: sale.bookId,
    title: sale.book.title,
    author: sale.book.author.name,
    date: sale.date,
    quantity: sale.quantity,
    kenp: sale.kenp != null ? sale.kenp.toNumber() : null,
    format: sale.format,
    distributor: sale.distributor,
    publisherRevenueUSD: sale.publisherRevenueUSD.toNumber(),
    publisherRevenueOriginal: sale.publisherRevenueOriginal.toNumber(),
    currency: sale.currency,
    authorRoyalty: sale.authorRoyalty.toNumber(),
    paid: sale.paid ? "paid" : "pending",
    comment: sale.comment ?? null,
    source: sale.source,
    bookReleased: sale.book.released,
  };
}

export async function asyncAddSale(data: Prisma.SaleUncheckedCreateInput) {
  const kenpNum =
    data.kenp != null
      ? typeof data.kenp === "object" &&
          data.kenp !== null &&
          "toNumber" in data.kenp
        ? (data.kenp as Decimal).toNumber()
        : Number(data.kenp)
      : null;

  const validated = validateSaleRecord({
    source: data.source,
    distributor: data.distributor ?? null,
    format: data.format,
    quantity: data.quantity ?? null,
    kenp: kenpNum,
    currency: String(data.currency ?? "USD"),
    publisherRevenueOriginal: Number(data.publisherRevenueOriginal),
    publisherRevenueUSD: Number(data.publisherRevenueUSD),
    authorRoyalty: Number(data.authorRoyalty),
    comment: data.comment ?? null,
  });
  if (!validated.success) {
    throw new Error(validated.error);
  }

  const v = validated.data;
  return await prisma.sale.create({
    data: {
      bookId: data.bookId,
      date: data.date,
      source: v.source,
      distributor: v.distributor,
      format: v.format,
      quantity: v.quantity,
      kenp: v.kenp != null ? new Decimal(v.kenp) : null,
      currency: v.currency,
      publisherRevenueOriginal: new Decimal(v.publisherRevenueOriginal),
      publisherRevenueUSD: new Decimal(v.publisherRevenueUSD),
      authorRoyalty: new Decimal(v.authorRoyalty),
      paid: data.paid ?? false,
      comment: v.comment ?? null,
    },
  });
}

// write ops moved here
export async function asyncUpdateSale(id: number, data: UpdateSaleItem) {
  const existing = await prisma.sale.findUnique({ where: { id } });
  if (!existing) throw new Error("Sale not found.");

  const mergedBookId = data.bookId ?? existing.bookId;
  const mergedDate = data.date ?? existing.date;
  const mergedSource = data.source ?? existing.source;
  const mergedDistributor =
    data.distributor !== undefined ? data.distributor : existing.distributor;
  const mergedFormat = data.format ?? existing.format;
  const mergedQuantity =
    data.quantity !== undefined ? data.quantity : existing.quantity;
  const mergedKenp =
    data.kenp !== undefined
      ? data.kenp
      : existing.kenp != null
        ? existing.kenp.toNumber()
        : null;
  const mergedCurrency = (data.currency ?? existing.currency).trim().toUpperCase();
  const mergedPubOrig =
    data.publisherRevenueOriginal ??
    existing.publisherRevenueOriginal.toNumber();
  const mergedPubUsd =
    data.publisherRevenueUSD ?? existing.publisherRevenueUSD.toNumber();
  const mergedRoyalty =
    data.authorRoyalty ?? existing.authorRoyalty.toNumber();
  const mergedComment =
    data.comment !== undefined ? data.comment : existing.comment;

  const validated = validateSaleRecord({
    source: mergedSource,
    distributor: mergedDistributor,
    format: mergedFormat,
    quantity: mergedQuantity,
    kenp: mergedKenp,
    currency: mergedCurrency,
    publisherRevenueOriginal: mergedPubOrig,
    publisherRevenueUSD: mergedPubUsd,
    authorRoyalty: mergedRoyalty,
    comment: mergedComment,
  });

  if (!validated.success) {
    throw new Error(validated.error);
  }

  const v = validated.data;

  return await prisma.sale.update({
    where: { id },
    data: {
      bookId: mergedBookId,
      date: mergedDate,
      source: v.source,
      distributor: v.distributor,
      format: v.format,
      quantity: v.quantity,
      kenp: v.kenp != null ? new Decimal(v.kenp) : null,
      currency: v.currency,
      publisherRevenueOriginal: new Decimal(v.publisherRevenueOriginal),
      publisherRevenueUSD: new Decimal(v.publisherRevenueUSD),
      authorRoyalty: new Decimal(v.authorRoyalty),
      comment: v.comment ?? null,
    },
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
