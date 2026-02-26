import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import {
  uploadCoverArt as uploadCoverArtToStorage,
  deleteCoverArt,
} from "../supabase/storage";
import { getBooksSortedByTotalSales } from "./books-queries";

/** Build YYYY-MM sort key from publication date */
export function publicationSortKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// Flat Book type for table display (similar to Sale type)
export interface BookListItem {
  id: number;
  title: string;
  author: string;
  isbn13: string;
  isbn10: string | null;
  /** First day of publication month (e.g. 2024-01-01) */
  publicationDate: Date;
  /** YYYY-MM string for sorting */
  publicationSortKey: string;
  distRoyaltyRate: number; // Distributor royalty as percentage (e.g., 50 for 50%)
  handSoldRoyaltyRate: number; // Hand-sold royalty as percentage (e.g., 20 for 20%)
  coverPrice: number; // Retail cover price
  printCost: number; // Cost to print one copy
  totalSales: number;
  seriesName: string | null;
  seriesOrder: number | null;
  coverArtPath: string | null;
}

// Series type for UI
export interface SeriesListItem {
  id: number;
  name: string;
  description: string | null;
}

// Form input DTOs (use these for create/update forms)
export interface CreateBookInput {
  title: string;
  /** Unique identifier for an existing author. If provided, used to link the book. */
  authorId?: number | null;
  author: string; // name of author
  email: string; // email of author
  isbn13: string;
  isbn10?: string;
  /** First day of publication month (e.g. new Date(2024, 0, 1) for Jan 2024) */
  publicationDate: Date;
  distRoyaltyRate?: number; // Distributor royalty percentage (e.g., 50), default handled by server
  handSoldRoyaltyRate?: number; // Hand-sold royalty percentage (e.g., 20), default handled by server
  coverPrice: number; // Retail cover price
  printCost: number; // Cost to print one copy
  seriesId?: number | null; // Existing series ID, or null for no series
  seriesOrder?: number | null; // Position in series (1, 2, 3, ...)
  newSeriesName?: string; // Name for new series (if creating new series)
  coverArtPath?: string | null; // Optional; cover is usually added on edit
}

export interface UpdateBookInput extends Partial<CreateBookInput> {
  id: number;
  email: string;
  authorId: number;
  /** Set to null to remove book from series. */
  seriesId?: number | null;
  seriesOrder?: number | null;
  /** Set to null to clear cover art path. */
  coverArtPath?: string | null;
}

export interface BookDetail {
  id: number;
  title: string;
  author: string;
  authorId: number;
  email: string;
  isbn13: string;
  isbn10: string | null;
  /** First day of publication month */
  publicationDate: Date;
  distRoyaltyRate: number;
  handSoldRoyaltyRate: number;
  coverPrice: number;
  printCost: number;
  createdAt: Date;
  updatedAt: Date;
  totalSales: number;
  totalPublisherRevenue: number;
  unpaidAuthorRoyalty: number;
  paidAuthorRoyalty: number;
  totalAuthorRoyalty: number;
  seriesId: number | null;
  seriesOrder: number | null;
  seriesName: string | null;
  coverArtPath: string | null;
  sales?: import("./records").SaleListItem[]; // Sales records for this book
}

/** Single sort key with direction for multi-column sort */
export type BookSortEntry = { field: string; dir: "asc" | "desc" };

/** Default sort: author, then series/position (non-series last), then title */
export const DEFAULT_BOOK_SORT_SPEC: BookSortEntry[] = [
  { field: "author", dir: "asc" },
  { field: "series", dir: "asc" },
  { field: "title", dir: "asc" },
];

// Column keys from BooksTable that support server-side sort.
// Series: alphabetical by series name, then by series order (1,2,...,9,10); books with no series last (PostgreSQL ASC nulls last).
const SORT_FIELD_MAP: Record<
  string,
  Prisma.BookOrderByWithRelationInput | Prisma.BookOrderByWithRelationInput[]
> = {
  title: { title: "asc" },
  author: { author: { name: "asc" } },
  isbn13: { isbn13: "asc" },
  isbn10: { isbn10: "asc" },
  publication: { publicationDate: "asc" },
  distRoyaltyRate: { distAuthorRoyaltyRate: "asc" },
  // Prisma can only order by relation _count, not sum(quantity). When sortBy is totalSales we use in-memory sort in getBooksData.
  totalSales: { sales: { _count: "desc" } },
  // Series name (nulls last in PostgreSQL ASC), then series order (numeric; nulls last)
  series: [{ series: { name: "asc" } }, { seriesOrder: "asc" }],
};

function flipOrderDir(
  o: Prisma.BookOrderByWithRelationInput
): Prisma.BookOrderByWithRelationInput {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === "asc") result[k] = "desc";
    else if (v === "desc") result[k] = "asc";
    else if (typeof v === "object" && v !== null)
      result[k] = flipOrderDir(v as Prisma.BookOrderByWithRelationInput);
    else result[k] = v;
  }
  return result as Prisma.BookOrderByWithRelationInput;
}

function buildOrderBy(
  sortBy: string,
  sortDir: "asc" | "desc"
): Prisma.BookOrderByWithRelationInput | Prisma.BookOrderByWithRelationInput[] {
  const base = SORT_FIELD_MAP[sortBy];
  if (!base) return { title: "asc" };

  const applyDir = (
    o: Prisma.BookOrderByWithRelationInput
  ): Prisma.BookOrderByWithRelationInput =>
    sortDir === "desc" ? flipOrderDir(o) : o;

  if (Array.isArray(base)) {
    return base.map(applyDir) as Prisma.BookOrderByWithRelationInput[];
  }
  return applyDir(base);
}

/** Build Prisma orderBy array from a sequence of sort entries (multi-column sort). */
function buildOrderByMulti(
  sortSpec: BookSortEntry[]
): Prisma.BookOrderByWithRelationInput[] {
  const out: Prisma.BookOrderByWithRelationInput[] = [];
  for (const { field, dir } of sortSpec) {
    const clause = buildOrderBy(field, dir);
    if (Array.isArray(clause)) out.push(...clause);
    else out.push(clause);
  }
  return out;
}

// Get all series
export async function getAllSeries(): Promise<SeriesListItem[]> {
  const series = await prisma.series.findMany({
    orderBy: { name: "asc" },
  });

  return series.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
  }));
}

// Create a new series
export async function createSeries(
  name: string,
  description?: string
): Promise<
  { success: true; seriesId: number } | { success: false; error: string }
> {
  try {
    if (!name.trim()) {
      return { success: false, error: "Series name is required" };
    }

    const series = await prisma.series.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return { success: true, seriesId: series.id };
  } catch (error: unknown) {
    // Handle unique constraint violations (duplicate series names)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return {
        success: false,
        error: "A series with this name already exists",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create series",
    };
  }
}

// Get all books (for client-side pagination/sorting)
export async function getAllBooks(): Promise<BookListItem[]> {
  const books = await prisma.book.findMany({
    include: { author: true, sales: true, series: true },
    orderBy: { title: "asc" },
  });

  return books.map((book) => {
    const totalSales = book.sales.reduce((sum, sale) => sum + sale.quantity, 0);
    const distRoyaltyRate = Math.round(book.distAuthorRoyaltyRate * 100);
    const handSoldRoyaltyRate = Math.round(book.handSoldAuthorRoyaltyRate * 100);
    const publicationSortKey = publicationSortKeyFromDate(book.publicationDate as Date);
    return {
      id: book.id,
      title: book.title,
      author: book.author.name,
      isbn13: book.isbn13 as string,
      isbn10: book.isbn10,
      publicationDate: book.publicationDate as Date,
      publicationSortKey,
      distRoyaltyRate,
      handSoldRoyaltyRate,
      coverPrice: Number(book.coverPrice),
      printCost: Number(book.printCost),
      totalSales,
      seriesName: book.series?.name ?? null,
      seriesOrder: book.seriesOrder ?? null,
      coverArtPath: book.coverArtPath ?? null,
    };
  });
}

const SORT_FIELD_KEYS = new Set([
  "title",
  "author",
  "isbn13",
  "isbn10",
  "publication",
  "distRoyaltyRate",
  "totalSales",
  "series",
]);

/** Parse sort query string "author:asc,series:asc,title:asc" into BookSortEntry[]. */
export function parseBookSortSpec(sortParam: string | undefined): BookSortEntry[] {
  if (!sortParam?.trim()) return [...DEFAULT_BOOK_SORT_SPEC];
  const entries: BookSortEntry[] = [];
  for (const part of sortParam.split(",")) {
    const [field, dir] = part.trim().split(":");
    const d = dir === "desc" ? "desc" : "asc";
    if (field && SORT_FIELD_KEYS.has(field)) entries.push({ field, dir: d });
  }
  return entries.length ? entries : [...DEFAULT_BOOK_SORT_SPEC];
}

/** Encode BookSortEntry[] to query string. */
export function encodeBookSortSpec(spec: BookSortEntry[]): string {
  return spec.map(({ field, dir }) => `${field}:${dir}`).join(",");
}

// Database functions
export async function getBooksData({
  search,
  page = 1,
  pageSize = 20,
  sortSpec,
}: {
  search?: string;
  page?: number;
  pageSize?: number;
  /** Multi-column sort; defaults to author, series, title. */
  sortSpec?: BookSortEntry[];
}): Promise<{
  items: BookListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const currentPage = Math.max(1, page || 1);
  const limit = Math.max(1, Math.min(pageSize || 20, 100));
  const spec = sortSpec?.length ? sortSpec : DEFAULT_BOOK_SORT_SPEC;

  // Build search filter
  const where: Prisma.BookWhereInput = {};

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    const query = trimmedSearch;
    const normalizedIsbn = trimmedSearch.replace(/[-\s]/g, "");

    const orConditions: Prisma.BookWhereInput[] = [
      // Title match (case-insensitive)
      {
        title: {
          contains: query,
          mode: "insensitive",
        },
      },
      // Author name match (case-insensitive)
      {
        author: {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
      // Series name match (case-insensitive)
      {
        series: {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
    ];

    // Only add ISBN conditions if we have a normalized ISBN (not empty after removing dashes/spaces)
    if (normalizedIsbn) {
      orConditions.push(
        // ISBN-13 match (stored without dashes)
        {
          isbn13: {
            contains: normalizedIsbn,
          },
        },
        // ISBN-10 match (stored without dashes)
        {
          isbn10: {
            contains: normalizedIsbn,
          },
        }
      );
    }

    where.OR = orConditions;
  }

  // When primary sort is totalSales, use raw SQL to compute SUM(sales.quantity) in the database
  const primarySort = spec[0];
  const sortByTotalSales = primarySort?.field === "totalSales";

  if (sortByTotalSales) {
    return getBooksSortedByTotalSales(
      { search: trimmedSearch },
      { page: currentPage, pageSize: limit },
      { sortDir: primarySort.dir }
    );
  }

  const orderBy = buildOrderByMulti(spec);

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      include: { author: true, sales: true, series: true },
      orderBy,
      skip: (currentPage - 1) * limit,
      take: limit,
    }),
    prisma.book.count({ where }),
  ]);

  const items: BookListItem[] = books.map((book) => {
    const totalSales = book.sales.reduce((sum, sale) => sum + sale.quantity, 0);
    const distRoyaltyRate = Math.round(book.distAuthorRoyaltyRate * 100);
    const handSoldRoyaltyRate = Math.round(book.handSoldAuthorRoyaltyRate * 100);
    const publicationSortKey = publicationSortKeyFromDate(book.publicationDate as Date);
    return {
      id: book.id,
      title: book.title,
      author: book.author.name,
      isbn13: book.isbn13 as string,
      isbn10: book.isbn10,
      publicationDate: book.publicationDate as Date,
      publicationSortKey,
      distRoyaltyRate,
      handSoldRoyaltyRate,
      coverPrice: Number(book.coverPrice),
      printCost: Number(book.printCost),
      totalSales,
      seriesName: book.series?.name ?? null,
      seriesOrder: book.seriesOrder ?? null,
      coverArtPath: book.coverArtPath ?? null,
    };
  });

  return {
    items,
    total,
    page: currentPage,
    pageSize: limit,
  };
}

export async function getBookById(id: number): Promise<BookDetail | null> {
  const book = await prisma.book.findUnique({
    where: { id },
    include: { author: true, series: true },
  });

  if (!book) {
    return null;
  }

  const distRoyaltyRate = Math.round(book.distAuthorRoyaltyRate * 100);
  const handSoldRoyaltyRate = Math.round(book.handSoldAuthorRoyaltyRate * 100);

  // Use aggregates so we don't load all sales (sales list is paginated separately)
  const [totals, unpaidAgg, paidAgg] = await Promise.all([
    prisma.sale.aggregate({
      where: { bookId: id },
      _sum: { quantity: true, publisherRevenue: true, authorRoyalty: true },
    }),
    prisma.sale.aggregate({
      where: { bookId: id, paid: false },
      _sum: { authorRoyalty: true },
    }),
    prisma.sale.aggregate({
      where: { bookId: id, paid: true },
      _sum: { authorRoyalty: true },
    }),
  ]);

  const totalSales = totals._sum.quantity ?? 0; // Quantity is usually an Int, so this is fine

  // For currency/royalty fields (Decimal types), convert to number for the UI
  const totalPublisherRevenue = new Prisma.Decimal(totals._sum.publisherRevenue ?? 0).toNumber();
  const unpaidAuthorRoyalty = new Prisma.Decimal(unpaidAgg._sum.authorRoyalty ?? 0).toNumber();
  const paidAuthorRoyalty = new Prisma.Decimal(paidAgg._sum.authorRoyalty ?? 0).toNumber();
  const totalAuthorRoyalty = new Prisma.Decimal(totals._sum.authorRoyalty ?? 0).toNumber();

  return {
    id: book.id,
    title: book.title,
    author: book.author.name,
    authorId: book.author.id,
    email: book.author.email,
    isbn13: book.isbn13 as string,
    isbn10: book.isbn10,
    publicationDate: book.publicationDate as Date,
    distRoyaltyRate,
    handSoldRoyaltyRate,
    coverPrice: Number(book.coverPrice),
    printCost: Number(book.printCost),
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    totalSales,
    totalPublisherRevenue,
    unpaidAuthorRoyalty,
    paidAuthorRoyalty,
    totalAuthorRoyalty,
    seriesId: book.seriesId,
    seriesOrder: book.seriesOrder,
    seriesName: book.series?.name ?? null,
    coverArtPath: book.coverArtPath ?? null,
    // Sales list is loaded separately via getSalesByBookId (paginated)
    sales: undefined,
  };
}

export async function createBook(
  input: CreateBookInput
): Promise<
  { success: true; bookId: number } | { success: false; error: string }
> {
  try {
    // Convert royalty rates from percentage to decimal (e.g., 50 -> 0.50)
    const distAuthorRoyaltyRate = input.distRoyaltyRate
      ? input.distRoyaltyRate / 100
      : 0.5; // Default to 50%
    const handSoldAuthorRoyaltyRate = input.handSoldRoyaltyRate
      ? input.handSoldRoyaltyRate / 100
      : 0.2; // Default to 20%

    // Determine series handling
    let seriesId: number | null = null;
    if (input.newSeriesName && input.newSeriesName.trim()) {
      // Create new series
      const newSeries = await prisma.series.create({
        data: { name: input.newSeriesName.trim() },
      });
      seriesId = newSeries.id;
    } else if (input.seriesId !== undefined && input.seriesId !== null) {
      // Use existing series
      seriesId = input.seriesId;
    }

    // Wrap author creation and book creation in a single transaction
    const book = await prisma.$transaction(async (tx) => {
      let author = null;

      // 1. Find or create the single author
      if (input.authorId) {
        author = await tx.author.findUnique({
          where: { id: input.authorId },
        });
      }

      // 2. Try finding by Email (if ID failed or wasn't provided)
      if (!author && input.email) {
        author = await tx.author.findUnique({
          where: { email: input.email },
        });
      }

      // Enforce author selection: throw Error if no author found
      if (!author) {
        throw new Error(`Author not found. Please select or create the author first.`);
      }

      // When adding to a series without explicit order, assign next available
      let seriesOrderVal = input.seriesOrder ?? null;
      if (seriesId !== null && seriesOrderVal === null) {
        const max = await tx.book.aggregate({
          where: { seriesId },
          _max: { seriesOrder: true },
        });
        seriesOrderVal = (max._max.seriesOrder ?? 0) + 1;
      }

      // 2. Create the book, connected to the single author
      return tx.book.create({
        data: {
          title: input.title,
          isbn13: input.isbn13,
          isbn10: input.isbn10 || null,
          distAuthorRoyaltyRate,
          handSoldAuthorRoyaltyRate,
          coverPrice: input.coverPrice,
          printCost: input.printCost,
          publicationDate: input.publicationDate,
          seriesId: seriesId,
          seriesOrder: seriesOrderVal,
          // Fixed: Use 'author' (singular) and connect to one ID
          authorId: author.id,
        },
        // Optional: include if you need author data returned in the 'book' object
        include: {
          author: true,
        },
      });
    });

    return { success: true, bookId: book.id };
  } catch (error: unknown) {
    // Handle unique constraint violations (ISBN duplicates)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      const field = (error as { meta?: { target?: string[] } }).meta
        ?.target?.[0];
      return {
        success: false,
        error: `A book with this ${
          field === "isbn13" ? "ISBN-13" : "ISBN-10"
        } already exists`,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create book",
    };
  }
}

export async function updateBook(
  input: UpdateBookInput
): Promise<
  { success: true; bookId: number } | { success: false; error: string }
> {
  try {
    // Check if book exists
    const existingBook = await prisma.book.findUnique({
      where: { id: input.id },
      include: { author: true },
    });

    if (!existingBook) {
      return { success: false, error: "Book not found" };
    }

    // Update the book
    const updatedBook = await prisma.$transaction(async (tx) => {
      // Prepare data
      const updateData: Prisma.BookUpdateInput = {};

      // Handle Author Connection by ID
      if (input.authorId !== undefined) {
        if (input.authorId !== null) {
          updateData.author = {
            connect: { id: input.authorId },
          };
        } else {
          // If you REALLY want to allow no author, see Solution B below.
          // Otherwise, throw an error or handle it as a validation failure.
          throw new Error("An author is required for this book.");
        }
      } 
      // Fallback: If no ID but email is provided (legacy support)
      else if (input.email) {
        updateData.author = { connect: { email: input.email } };
      }

      if (input.title !== undefined) updateData.title = input.title;
      if (input.isbn13 !== undefined)
        updateData.isbn13 = input.isbn13;
      if (input.isbn10 !== undefined)
        updateData.isbn10 = input.isbn10 || null;
      if (input.distRoyaltyRate !== undefined) {
        updateData.distAuthorRoyaltyRate = input.distRoyaltyRate / 100;
      }
      if (input.handSoldRoyaltyRate !== undefined) {
        updateData.handSoldAuthorRoyaltyRate = input.handSoldRoyaltyRate / 100;
      }
      if (input.coverPrice !== undefined) {
        updateData.coverPrice = input.coverPrice;
      }
      if (input.printCost !== undefined) {
        updateData.printCost = input.printCost;
      }
      if (input.publicationDate !== undefined)
        updateData.publicationDate = input.publicationDate;
      if (input.seriesId !== undefined) {
        updateData.series =
          input.seriesId == null
            ? { disconnect: true }
            : { connect: { id: input.seriesId } };
        if (input.seriesId == null) updateData.seriesOrder = null;
      }
      if (input.seriesOrder !== undefined) {
        updateData.seriesOrder = input.seriesOrder ?? null;
      }
      if (input.coverArtPath !== undefined) {
        updateData.coverArtPath = input.coverArtPath ?? null;
      } else if (
        input.seriesId != null &&
        existingBook.seriesId !== input.seriesId
      ) {
        // Newly connecting to series without explicit order: assign next available
        const max = await tx.book.aggregate({
          where: { seriesId: input.seriesId },
          _max: { seriesOrder: true },
        });
        updateData.seriesOrder = (max._max.seriesOrder ?? 0) + 1;
      }

      return tx.book.update({
        where: { id: input.id },
        data: updateData,
        include: { author: true },
      });
    });

    // Shift series order for remaining books when disconnecting from a series.
    const oldSeriesId = existingBook.seriesId ?? null;
    const newSeriesId = updatedBook.seriesId ?? null;
    const removedOrder = existingBook.seriesOrder ?? null;
    if (
      oldSeriesId !== null &&
      oldSeriesId !== newSeriesId &&
      removedOrder !== null
    ) {
      await shiftSeriesOrderAfterRemoval(oldSeriesId, removedOrder);
      await deleteSeriesIfEmpty(oldSeriesId);
    }

    // Delete the old series if it now has no books (series are auto-deleted when empty).
    if (oldSeriesId !== null && oldSeriesId !== newSeriesId) {
      await deleteSeriesIfEmpty(oldSeriesId);
    }

    return { success: true, bookId: updatedBook.id };
  } catch (error: unknown) {
    // Handle unique constraint violations (ISBN duplicates)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      const field = (error as { meta?: { target?: string[] } }).meta
        ?.target?.[0];
      return {
        success: false,
        error: `A book with this ${
          field === "isbn13" ? "ISBN-13" : "ISBN-10"
        } already exists`,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update book",
    };
  }
}

/** Shift series order down for remaining books after a book is removed. Call after disconnect or delete. */
async function shiftSeriesOrderAfterRemoval(
  seriesId: number,
  removedOrder: number
): Promise<void> {
  const toShift = await prisma.book.findMany({
    where: {
      seriesId,
      seriesOrder: { gt: removedOrder },
    },
    select: { id: true },
  });
  await prisma.$transaction(
    toShift.map((b) =>
      prisma.book.update({
        where: { id: b.id },
        data: { seriesOrder: { decrement: 1 } },
      })
    )
  );
}

/** Deletes a series if it has no books left. Call after removing a book from a series (delete or update). */
async function deleteSeriesIfEmpty(seriesId: number): Promise<void> {
  const count = await prisma.book.count({ where: { seriesId } });
  if (count === 0) {
    await prisma.series.delete({ where: { id: seriesId } });
  }
}

/** Book in a series for the order modal */
export interface SeriesBook {
  id: number;
  title: string;
  author: string;
  seriesOrder: number;
}

/** Get all books in a series, ordered by seriesOrder (nulls last) */
export async function getBooksInSeries(
  seriesId: number
): Promise<SeriesBook[]> {
  const books = await prisma.book.findMany({
    where: { seriesId },
    include: { author: true },
    orderBy: [{ seriesOrder: "asc" }, { title: "asc" }],
  });

  return books.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author.name,
    seriesOrder: book.seriesOrder ?? 0,
  }));
}

/** Reorder books in a series. orderedBookIds is the desired order (ids in order 1, 2, 3, ...). */
export async function reorderSeriesBooks(
  seriesId: number,
  orderedBookIds: number[]
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await prisma.$transaction(
      orderedBookIds.map((bookId, index) =>
        prisma.book.update({
          where: { id: bookId, seriesId },
          data: { seriesOrder: index + 1 },
        })
      )
    );
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reorder",
    };
  }
}

/** Upload cover art file and set book.coverArtPath. */
export async function uploadBookCoverArt(
  bookId: number,
  file: File
): Promise<
  { success: true; path: string } | { success: false; error: string }
> {
  const result = await uploadCoverArtToStorage(bookId, file);
  if ("error" in result) {
    return { success: false, error: result.error };
  }
  await prisma.book.update({
    where: { id: bookId },
    data: { coverArtPath: result.path },
  });
  return { success: true, path: result.path };
}

/** Remove cover art from storage and clear book.coverArtPath. */
export async function removeBookCoverArt(
  bookId: number
): Promise<{ success: true } | { success: false; error: string }> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { coverArtPath: true },
  });
  if (!book) {
    return { success: false, error: "Book not found." };
  }
  if (book.coverArtPath) {
    await deleteCoverArt(book.coverArtPath);
  }
  await prisma.book.update({
    where: { id: bookId },
    data: { coverArtPath: null },
  });
  return { success: true };
}

export async function deleteBook(
  id: number
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const book = await prisma.book.findUnique({
      where: { id },
    });

    if (!book) {
      return { success: false, error: "Book not found" };
    }

    const seriesIdBeforeDelete = book.seriesId ?? null;
    const deletedSeriesOrder = book.seriesOrder ?? null;

    // Remove cover art from storage if present
    if (book.coverArtPath) {
      await deleteCoverArt(book.coverArtPath);
    }

    // Delete the book. Sales records are deleted automatically (FK onDelete: Cascade).
    await prisma.book.delete({
      where: { id },
    });

    // Shift series order for remaining books in the same series
    if (seriesIdBeforeDelete !== null) {
      if (deletedSeriesOrder !== null) {
        await shiftSeriesOrderAfterRemoval(
          seriesIdBeforeDelete,
          deletedSeriesOrder
        );
      }
      await deleteSeriesIfEmpty(seriesIdBeforeDelete);
    }

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete book",
    };
  }
}
