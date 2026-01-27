import { prisma } from "../prisma";

// Flat Book type for table display (similar to Sale type)
export interface BookListItem {
    id: number;
    title: string;
    authors: string;
    isbn13: string | null;
    isbn10: string | null;
    publicationMonth: string | null;
    publicationYear: number | null;
    defaultRoyaltyRate: number; // As percentage (e.g., 50 for 50%)
    totalSales: number; // Total sales to date
}

// Form input DTOs (use these for create/update forms)
export interface CreateBookInput {
    title: string;
    authors: string; // later: could be string[] when authors becomes a relation
    isbn13?: string;
    isbn10?: string;
    publicationMonth?: string; // "01" - "12"
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
    publicationMonth: string | null;
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
export async function getBooksData(): Promise<BookListItem[]> {
  const books = await prisma.book.findMany({
    include: {
      authors: true,
      sales: true, // Include sales to calculate totalSales
    },
    orderBy: {
      title: 'asc',
    },
  });

  return books.map(book => {
    // Calculate total sales (sum of quantity from all sales)
    const totalSales = book.sales.reduce((sum, sale) => sum + sale.quantity, 0);
    
    // Join authors into a comma-separated string
    const authors = book.authors.map(a => a.name).join(", ");
    
    // Convert authorRoyaltyRate from decimal (0.25) to percentage (25)
    const defaultRoyaltyRate = Math.round(book.authorRoyaltyRate * 100);

    return {
      id: book.id,
      title: book.title,
      authors,
      isbn13: book.isbn13,
      isbn10: book.isbn10,
      publicationMonth: null, // Not in schema
      publicationYear: null, // Not in schema
      defaultRoyaltyRate,
      totalSales,
    };
  });
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
    publicationMonth: null, // Not in schema
    publicationYear: null, // Not in schema
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
  } catch (error: any) {
    // Handle unique constraint violations (ISBN duplicates)
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      return { 
        success: false, 
        error: `A book with this ${field === 'isbn13' ? 'ISBN-13' : 'ISBN-10'} already exists` 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to create book' 
    };
  }
}
