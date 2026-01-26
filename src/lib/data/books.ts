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
