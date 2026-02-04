import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

// Flat Book type for table display (similar to Sale type)
export interface BookListItem {
    id: number;
    title: string;
    authors: string;
    isbn13: string | null;
    isbn10: string | null;
    publicationMonth: string | null; // "01" to "12"
    publicationYear: number | null;
    /** YYYY-MM string for sorting; nulls become 9999-99 so they sort last */
    publicationSortKey: string;
    defaultRoyaltyRate: number; // As percentage (e.g., 50 for 50%)
    totalSales: number; // Total sales to date
}

// Form input DTOs (use these for create/update forms)
export interface CreateBookInput {
    title: string;
    authors: string; // later: could be string[] when authors becomes a relation
    isbn13?: string;
    isbn10?: string;
    publicationMonth?: string; // "01" to "12"
    publicationYear?: number;
    defaultRoyaltyRate?: number; // percentage (e.g., 50), default handled by server
}

export interface UpdateBookInput extends Partial<CreateBookInput> {
    id: number;
}

export interface BookDetail {
    id: number;
    title: string;
    authors: string;
    isbn13: string | null;
    isbn10: string | null;
    publicationMonth: string | null; // "01" to "12"
    publicationYear: number | null;
    defaultRoyaltyRate: number;
    createdAt: Date;
    updatedAt: Date;
    totalSales: number;
    totalPublisherRevenue: number;
    unpaidAuthorRoyalty: number;
    paidAuthorRoyalty: number;
    totalAuthorRoyalty: number;
    sales?: import('./records').SaleListItem[]; // Sales records for this book
}

// Database functions
export async function getBooksData({
  search,
  page = 1,
  pageSize = 20,
}: {
  search?: string;
  page?: number;
  pageSize?: number;
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
        authors: {
          some: {
            name: {
              contains: query,
              mode: "insensitive",
            },
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
        },
      );
    }

    where.OR = orConditions;
  }

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      include: {
        authors: true,
        sales: true, // Include sales to calculate totalSales
      },
      orderBy: {
        title: "asc",
      },
      skip: (currentPage - 1) * limit,
      take: limit,
    }),
    prisma.book.count({ where }),
  ]);

  const items: BookListItem[] = books.map((book) => {
    // Calculate total sales (sum of quantity from all sales)
    const totalSales = book.sales.reduce(
      (sum, sale) => sum + sale.quantity,
      0,
    );

    // Join authors into a comma-separated string
    const authors = book.authors.map((a) => a.name).join(", ");

    // Convert authorRoyaltyRate from decimal (0.25) to percentage (25)
    const defaultRoyaltyRate = Math.round(book.authorRoyaltyRate * 100);

    // publicationSortKey: YYYY-MM for sorting; nulls use 9999-99 so they sort last
    const year = book.publicationYear ?? 9999;
    const month = book.publicationMonth ?? "99";
    const publicationSortKey = `${year}-${month}`;

    return {
      id: book.id,
      title: book.title,
      authors,
      isbn13: book.isbn13,
      isbn10: book.isbn10,
      publicationMonth: book.publicationMonth,
      publicationYear: book.publicationYear,
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
    include: {
      authors: true,
      sales: {
        orderBy: {
          date: 'desc',
        },
      },
    },
  });

  if (!book) {
    return null;
  }

  // Calculate aggregated fields from sales
  const totalSales = book.sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const totalPublisherRevenue = book.sales.reduce((sum, sale) => sum + sale.publisherRevenue, 0);
  const unpaidAuthorRoyalty = book.sales
    .filter(sale => !sale.paid)
    .reduce((sum, sale) => sum + sale.authorRoyalty, 0);
  const paidAuthorRoyalty = book.sales
    .filter(sale => sale.paid)
    .reduce((sum, sale) => sum + sale.authorRoyalty, 0);
  const totalAuthorRoyalty = book.sales.reduce((sum, sale) => sum + sale.authorRoyalty, 0);

  // Join authors into a comma-separated string
  const authors = book.authors.map(a => a.name).join(", ");

  // Convert authorRoyaltyRate from decimal (0.25) to percentage (25)
  const defaultRoyaltyRate = Math.round(book.authorRoyaltyRate * 100);

  // Map sales to SaleListItem format
  const sales = book.sales.map(sale => ({
    id: sale.id,
    bookId: sale.bookId,
    title: book.title,
    author: authors,
    date: sale.date,
    quantity: sale.quantity,
    publisherRevenue: sale.publisherRevenue,
    authorRoyalty: sale.authorRoyalty,
    paid: sale.paid ? "paid" as const : "pending" as const,
  }));

  return {
    id: book.id,
    title: book.title,
    authors,
    isbn13: book.isbn13,
    isbn10: book.isbn10,
    publicationMonth: book.publicationMonth,
    publicationYear: book.publicationYear,
    defaultRoyaltyRate,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    totalSales,
    totalPublisherRevenue,
    unpaidAuthorRoyalty,
    paidAuthorRoyalty,
    totalAuthorRoyalty,
    sales,
  };
}

export async function createBook(input: CreateBookInput): Promise<{ success: true; bookId: number } | { success: false; error: string }> {
  try {
    // Parse authors (comma-separated string)
    const authorNames = input.authors
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (authorNames.length === 0) {
      return { success: false, error: 'At least one author is required' };
    }

    // Convert royalty rate from percentage to decimal (e.g., 50 -> 0.50)
    const authorRoyaltyRate = input.defaultRoyaltyRate 
      ? input.defaultRoyaltyRate / 100 
      : 0.25; // Default to 25%

    // Wrap author creation and book creation in a single transaction
    const book = await prisma.$transaction(async (tx) => {
      // Find or create authors within the transaction
      const authorConnections = await Promise.all(
        authorNames.map(async (name) => {
          // Try to find existing author
          let author = await tx.author.findUnique({
            where: { name },
          });

          // Create if doesn't exist
          if (!author) {
            author = await tx.author.create({
              data: { name },
            });
          }

          return { id: author.id };
        })
      );

      // Create the book, connected to all authors
      return tx.book.create({
        data: {
          title: input.title,
          isbn13: input.isbn13 || null,
          isbn10: input.isbn10 || null,
          authorRoyaltyRate,
          publicationMonth: input.publicationMonth ?? null,
          publicationYear: input.publicationYear ?? null,
          authors: {
            connect: authorConnections,
          },
        },
        include: {
          authors: true,
        },
      });
    });

    return { success: true, bookId: book.id };
  } catch (error: unknown) {
    // Handle unique constraint violations (ISBN duplicates)
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      const field = (error as { meta?: { target?: string[] } }).meta?.target?.[0];
      return {
        success: false,
        error: `A book with this ${field === "isbn13" ? "ISBN-13" : "ISBN-10"} already exists`,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create book",
    };
  }
}

export async function updateBook(input: UpdateBookInput): Promise<{ success: true; bookId: number } | { success: false; error: string }> {
  try {
    // Check if book exists
    const existingBook = await prisma.book.findUnique({
      where: { id: input.id },
      include: { authors: true },
    });

    if (!existingBook) {
      return { success: false, error: 'Book not found' };
    }

    // Parse authors if provided (comma-separated string)
    let authorConnections: { id: number }[] | undefined;
    if (input.authors !== undefined) {
      const authorNames = input.authors
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);

      if (authorNames.length === 0) {
        return { success: false, error: 'At least one author is required' };
      }

      // Wrap author lookup/creation and book update in a transaction
      const updatedBook = await prisma.$transaction(async (tx) => {
        // Find or create authors within the transaction
        authorConnections = await Promise.all(
          authorNames.map(async (name) => {
            let author = await tx.author.findUnique({
              where: { name },
            });

            if (!author) {
              author = await tx.author.create({
                data: { name },
              });
            }

            return { id: author.id };
          })
        );

        // Update the book
        const updateData: Prisma.BookUpdateInput = {};

        if (input.title !== undefined) updateData.title = input.title;
        if (input.isbn13 !== undefined) updateData.isbn13 = input.isbn13 || null;
        if (input.isbn10 !== undefined) updateData.isbn10 = input.isbn10 || null;
        if (input.defaultRoyaltyRate !== undefined) {
          updateData.authorRoyaltyRate = input.defaultRoyaltyRate / 100;
        }
        if (input.publicationMonth !== undefined) updateData.publicationMonth = input.publicationMonth ?? null;
        if (input.publicationYear !== undefined) updateData.publicationYear = input.publicationYear ?? null;

        // Update authors if provided
        if (authorConnections) {
          // Disconnect all existing authors and connect new ones
          updateData.authors = {
            set: [], // Disconnect all
            connect: authorConnections, // Connect new ones
          };
        }

        return tx.book.update({
          where: { id: input.id },
          data: updateData,
          include: { authors: true },
        });
      });

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
      if (input.publicationMonth !== undefined) updateData.publicationMonth = input.publicationMonth ?? null;
      if (input.publicationYear !== undefined) updateData.publicationYear = input.publicationYear ?? null;

      const updatedBook = await prisma.book.update({
        where: { id: input.id },
        data: updateData,
        include: { authors: true },
      });

      return { success: true, bookId: updatedBook.id };
    }
  } catch (error: unknown) {
    // Handle unique constraint violations (ISBN duplicates)
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      const field = (error as { meta?: { target?: string[] } }).meta?.target?.[0];
      return {
        success: false,
        error: `A book with this ${field === "isbn13" ? "ISBN-13" : "ISBN-10"} already exists`,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update book",
    };
  }
}

export async function deleteBook(id: number): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const book = await prisma.book.findUnique({
      where: { id },
    });

    if (!book) {
      return { success: false, error: "Book not found" };
    }

    // Delete the book. Sales records are deleted automatically (FK onDelete: Cascade).
    // Authors are unchanged (many-to-many; other books may reference them).
    await prisma.book.delete({
      where: { id },
    });

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete book",
    };
  }
}
