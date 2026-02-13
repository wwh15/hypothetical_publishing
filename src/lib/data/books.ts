import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

/** Build YYYY-MM sort key from publication date; nulls become 9999-99 so they sort last */
function publicationSortKeyFromDate(d: Date | null): string {
  if (!d) return "9999-99";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// Flat Book type for table display (similar to Sale type)
export interface BookListItem {
  id: number;
  title: string;
  author: string;
  isbn13: string | null;
  isbn10: string | null;
  /** First day of publication month (e.g. 2024-01-01); null if unknown */
  publicationDate: Date | null;
  /** YYYY-MM string for sorting; nulls become 9999-99 so they sort last */
  publicationSortKey: string;
  defaultRoyaltyRate: number; // As percentage (e.g., 50 for 50%)
  totalSales: number; // Total sales to date
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
  author: string; // later: could be string[] when authors becomes a relation
  isbn13?: string;
  isbn10?: string;
  /** First day of publication month (e.g. new Date(2024, 0, 1) for Jan 2024) */
  publicationDate?: Date | null;
  defaultRoyaltyRate?: number; // percentage (e.g., 50), default handled by server
  seriesId?: number | null; // Existing series ID, or null for no series
  seriesOrder?: number | null; // Position in series (1, 2, 3, ...)
  newSeriesName?: string; // Name for new series (if creating new series)
}

export interface UpdateBookInput extends Partial<CreateBookInput> {
  id: number;
  /** Set to null to remove book from series. */
  seriesId?: number | null;
  seriesOrder?: number | null;
}

export interface BookDetail {
  id: number;
  title: string;
  author: string;
  isbn13: string | null;
  isbn10: string | null;
  /** First day of publication month; null if unknown */
  publicationDate: Date | null;
  defaultRoyaltyRate: number;
  createdAt: Date;
  updatedAt: Date;
  totalSales: number;
  totalPublisherRevenue: number;
  unpaidAuthorRoyalty: number;
  paidAuthorRoyalty: number;
  totalAuthorRoyalty: number;
  seriesId: number | null;
  seriesOrder: number | null;
  sales?: import("./records").SaleListItem[]; // Sales records for this book
}

// Column keys from BooksTable that support server-side sort.
// Note: "authors" sorts by number of authors (_count); Prisma relation orderBy does not support ordering by relation field (e.g. name).
const SORT_FIELD_MAP: Record<
  string,
  Prisma.BookOrderByWithRelationInput | Prisma.BookOrderByWithRelationInput[]
> = {
  title: { title: "asc" },
  author: { author: { name: "asc" } },
  isbn13: { isbn13: "asc" },
  isbn10: { isbn10: "asc" },
  publication: { publicationDate: "asc" },
  defaultRoyaltyRate: { authorRoyaltyRate: "asc" },
  // Prisma can only order by relation _count, not sum(quantity). When sortBy is totalSales we use in-memory sort in getBooksData.
  totalSales: { sales: { _count: "desc" } },
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
    include: { author: true, sales: true },
    orderBy: { title: "asc" },
  });

  return books.map((book) => {
    const totalSales = book.sales.reduce((sum, sale) => sum + sale.quantity, 0);
    const defaultRoyaltyRate = Math.round(book.authorRoyaltyRate * 100);
    const publicationSortKey = publicationSortKeyFromDate(book.publicationDate);
    return {
      id: book.id,
      title: book.title,
      author: book.author.name,
      isbn13: book.isbn13,
      isbn10: book.isbn10,
      publicationDate: book.publicationDate,
      publicationSortKey,
      defaultRoyaltyRate,
      totalSales,
    };
  });
}

// Database functions
export async function getBooksData({
  search,
  page = 1,
  pageSize = 20,
  sortBy,
  sortDir,
}: {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}): Promise<{
  items: BookListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const currentPage = Math.max(1, page || 1);
  const limit = Math.max(1, Math.min(pageSize || 20, 100));

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

  // When sorting by totalSales we order by sum(sales.quantity); Prisma only supports _count. Fetch all, sort in memory, then paginate.
  // TODO: This is a hack to get the total sales to work. We should find a better way to do this.
  const sortByTotalSales = sortBy === "totalSales" && sortDir;

  if (sortByTotalSales) {
    const books = await prisma.book.findMany({
      where,
      include: { author: true, sales: true },
    });

    const allItems: BookListItem[] = books.map((book) => {
      const totalSales = book.sales.reduce(
        (sum, sale) => sum + sale.quantity,
        0
      );
      const defaultRoyaltyRate = Math.round(book.authorRoyaltyRate * 100);
      const publicationSortKey = publicationSortKeyFromDate(
        book.publicationDate
      );
      return {
        id: book.id,
        title: book.title,
        author: book.author.name,
        isbn13: book.isbn13,
        isbn10: book.isbn10,
        publicationDate: book.publicationDate,
        publicationSortKey,
        defaultRoyaltyRate,
        totalSales,
      };
    });

    allItems.sort((a, b) =>
      sortDir === "desc"
        ? b.totalSales - a.totalSales
        : a.totalSales - b.totalSales
    );

    const total = allItems.length;
    const items = allItems.slice(
      (currentPage - 1) * limit,
      currentPage * limit
    );

    return { items, total, page: currentPage, pageSize: limit };
  }

  const orderBy =
    sortBy && sortDir
      ? buildOrderBy(sortBy, sortDir)
      : { title: "asc" as const };

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      include: { author: true, sales: true },
      orderBy,
      skip: (currentPage - 1) * limit,
      take: limit,
    }),
    prisma.book.count({ where }),
  ]);

  const items: BookListItem[] = books.map((book) => {
    const totalSales = book.sales.reduce((sum, sale) => sum + sale.quantity, 0);
    const defaultRoyaltyRate = Math.round(book.authorRoyaltyRate * 100);
    const publicationSortKey = publicationSortKeyFromDate(book.publicationDate);
    return {
      id: book.id,
      title: book.title,
      author: book.author.name,
      isbn13: book.isbn13,
      isbn10: book.isbn10,
      publicationDate: book.publicationDate,
      publicationSortKey,
      defaultRoyaltyRate,
      totalSales,
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
    include: { author: true },
  });

  if (!book) {
    return null;
  }

  const defaultRoyaltyRate = Math.round(book.authorRoyaltyRate * 100);

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

  const totalSales = totals._sum.quantity ?? 0;
  const totalPublisherRevenue = totals._sum.publisherRevenue ?? 0;
  const unpaidAuthorRoyalty = unpaidAgg._sum.authorRoyalty ?? 0;
  const paidAuthorRoyalty = paidAgg._sum.authorRoyalty ?? 0;
  const totalAuthorRoyalty = totals._sum.authorRoyalty ?? 0;

  return {
    id: book.id,
    title: book.title,
    author: book.author.name,
    isbn13: book.isbn13,
    isbn10: book.isbn10,
    publicationDate: book.publicationDate,
    defaultRoyaltyRate,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    totalSales,
    totalPublisherRevenue,
    unpaidAuthorRoyalty,
    paidAuthorRoyalty,
    totalAuthorRoyalty,
    seriesId: book.seriesId,
    seriesOrder: book.seriesOrder,
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
    // Convert royalty rate from percentage to decimal (e.g., 50 -> 0.50)
    const authorRoyaltyRate = input.defaultRoyaltyRate
      ? input.defaultRoyaltyRate / 100
      : 0.5; // Default to 50%

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
      // 1. Find or create the single author
      let author = await tx.author.findUnique({
        where: {
          name: input.author, // Ensure this matches the field in your input
        },
      });

      // Create if doesn't exist
      if (!author) {
        author = await tx.author.create({
          data: {
            name: input.author,
          },
        });
      }

      // 2. Create the book, connected to the single author
      return tx.book.create({
        data: {
          title: input.title,
          isbn13: input.isbn13 || null,
          isbn10: input.isbn10 || null,
          authorRoyaltyRate,
          publicationDate: input.publicationDate ?? null,
          seriesId: seriesId,
          seriesOrder: input.seriesOrder ?? null,
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

    // Capture author name as a constant
    const authorName = input.author;

    // Parse authors if provided (comma-separated string)
    if (authorName) {
      // Wrap author lookup/creation and book update in a transaction
      const updatedBook = await prisma.$transaction(async (tx) => {
        let authorIdToConnect: number | undefined;

        // Logic: If author name provided, find or create it and get the ID
        if (authorName) {
          let author = await tx.author.findUnique({
            where: { name: authorName },
          });
          if (!author) {
            author = await tx.author.create({ data: { name: authorName } });
          }
          authorIdToConnect = author.id;
        }

        // Update the book
        const updateData: Prisma.BookUpdateInput = {};

        if (input.title !== undefined) updateData.title = input.title;
        if (input.isbn13 !== undefined)
          updateData.isbn13 = input.isbn13 || null;
        if (input.isbn10 !== undefined)
          updateData.isbn10 = input.isbn10 || null;
        if (input.defaultRoyaltyRate !== undefined) {
          updateData.authorRoyaltyRate = input.defaultRoyaltyRate / 100;
        }
        if (input.publicationDate !== undefined)
          updateData.publicationDate = input.publicationDate ?? null;
        if (input.seriesId !== undefined)
          updateData.series =
            input.seriesId == null
              ? { disconnect: true }
              : { connect: { id: input.seriesId } };
        if (input.seriesOrder !== undefined)
          updateData.seriesOrder = input.seriesOrder ?? null;

        if (authorIdToConnect) {
          updateData.author = {
            connect: { id: authorIdToConnect },
          };
        }

        return tx.book.update({
          where: { id: input.id },
          data: updateData,
          include: { author: true },
        });
      });

      // Delete the old series if it now has no books (series are auto-deleted when empty).
      const oldSeriesIdTx = existingBook.seriesId ?? null;
      const newSeriesIdTx = updatedBook.seriesId ?? null;
      if (oldSeriesIdTx !== null && oldSeriesIdTx !== newSeriesIdTx) {
        await deleteSeriesIfEmpty(oldSeriesIdTx);
      }

      return { success: true, bookId: updatedBook.id };
    } else {
      // No author changes, just update other fields
      const updateData: Prisma.BookUpdateInput = {};

      if (input.title !== undefined) updateData.title = input.title;
      if (input.isbn13 !== undefined) updateData.isbn13 = input.isbn13 || null;
      if (input.isbn10 !== undefined) updateData.isbn10 = input.isbn10 || null;
      if (input.defaultRoyaltyRate !== undefined) {
        updateData.authorRoyaltyRate = input.defaultRoyaltyRate / 100;
      }
      if (input.publicationDate !== undefined)
        updateData.publicationDate = input.publicationDate ?? null;
      if (input.seriesId !== undefined)
        updateData.series =
          input.seriesId == null
            ? { disconnect: true }
            : { connect: { id: input.seriesId } };
      if (input.seriesOrder !== undefined)
        updateData.seriesOrder = input.seriesOrder ?? null;

      const updatedBook = await prisma.book.update({
        where: { id: input.id },
        data: updateData,
        include: { author: true },
      });

      // Delete the old series if it now has no books (series are auto-deleted when empty).
      const oldSeriesId = existingBook.seriesId ?? null;
      const newSeriesId = updatedBook.seriesId ?? null;
      if (oldSeriesId !== null && oldSeriesId !== newSeriesId) {
        await deleteSeriesIfEmpty(oldSeriesId);
      }

      return { success: true, bookId: updatedBook.id };
    }
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

/** Deletes a series if it has no books left. Call after removing a book from a series (delete or update). */
async function deleteSeriesIfEmpty(seriesId: number): Promise<void> {
  const count = await prisma.book.count({ where: { seriesId } });
  if (count === 0) {
    await prisma.series.delete({ where: { id: seriesId } });
  }
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

    // Delete the book. Sales records are deleted automatically (FK onDelete: Cascade).
    // Authors are unchanged (many-to-many; other books may reference them).
    await prisma.book.delete({
      where: { id },
    });

    // Series are not user-editable; delete the series when it has no books left.
    if (seriesIdBeforeDelete !== null) {
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
