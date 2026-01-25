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

// Form input DTOs (use these for create/update forms; still mocked for now)
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

// Mock data function for now
export function getMockBooksData(): BookListItem[] {
    return [
        {
            id: 1,
            title: "The Great Novel",
            authors: "Jane Smith",
            isbn13: "9781234567890",
            isbn10: "1234567890",
            publicationMonth: "03",
            publicationYear: 2023,
            defaultRoyaltyRate: 50,
            totalSales: 1250,
        },
        {
            id: 2,
            title: "Adventures in Code",
            authors: "John Doe",
            isbn13: "9780987654321",
            isbn10: "0987654321",
            publicationMonth: "07",
            publicationYear: 2024,
            defaultRoyaltyRate: 50,
            totalSales: 850,
        },
        {
            id: 3,
            title: "Mystery of the Library",
            authors: "Alice Johnson",
            isbn13: "9781122334455",
            isbn10: "1122334455",
            publicationMonth: "11",
            publicationYear: 2023,
            defaultRoyaltyRate: 50,
            totalSales: 2100,
        },
        {
            id: 4,
            title: "Science Fiction Tales",
            authors: "Bob Williams",
            isbn13: "9785566778899",
            isbn10: "5566778899",
            publicationMonth: "05",
            publicationYear: 2024,
            defaultRoyaltyRate: 50,
            totalSales: 675,
        },
    ];
}

// Mock detail data
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

// Get mock sales for a specific book
export function getMockSalesForBook(bookId: number, bookTitle: string, bookAuthor: string): import('./records').SaleListItem[] {
    // Generate different mock sales for each book
    const salesByBook: Record<number, import('./records').SaleListItem[]> = {
        1: [
            { id: 101, title: bookTitle, author: bookAuthor, date: "12-2024", quantity: 150, publisherRevenue: 1500.00, authorRoyalty: 750.00, paid: "pending" },
            { id: 102, title: bookTitle, author: bookAuthor, date: "11-2024", quantity: 200, publisherRevenue: 2000.00, authorRoyalty: 1000.00, paid: "paid" },
            { id: 103, title: bookTitle, author: bookAuthor, date: "10-2024", quantity: 180, publisherRevenue: 1800.00, authorRoyalty: 900.00, paid: "paid" },
            { id: 104, title: bookTitle, author: bookAuthor, date: "09-2024", quantity: 220, publisherRevenue: 2200.00, authorRoyalty: 1100.00, paid: "paid" },
            { id: 105, title: bookTitle, author: bookAuthor, date: "08-2024", quantity: 250, publisherRevenue: 2500.00, authorRoyalty: 1250.00, paid: "paid" },
            { id: 106, title: bookTitle, author: bookAuthor, date: "07-2024", quantity: 250, publisherRevenue: 2500.00, authorRoyalty: 1250.00, paid: "paid" },
        ],
        2: [
            { id: 201, title: bookTitle, author: bookAuthor, date: "12-2024", quantity: 100, publisherRevenue: 1000.00, authorRoyalty: 500.00, paid: "pending" },
            { id: 202, title: bookTitle, author: bookAuthor, date: "11-2024", quantity: 120, publisherRevenue: 1200.00, authorRoyalty: 600.00, paid: "paid" },
            { id: 203, title: bookTitle, author: bookAuthor, date: "10-2024", quantity: 130, publisherRevenue: 1300.00, authorRoyalty: 650.00, paid: "paid" },
            { id: 204, title: bookTitle, author: bookAuthor, date: "09-2024", quantity: 150, publisherRevenue: 1500.00, authorRoyalty: 750.00, paid: "paid" },
            { id: 205, title: bookTitle, author: bookAuthor, date: "08-2024", quantity: 180, publisherRevenue: 1800.00, authorRoyalty: 900.00, paid: "paid" },
            { id: 206, title: bookTitle, author: bookAuthor, date: "07-2024", quantity: 170, publisherRevenue: 1700.00, authorRoyalty: 850.00, paid: "paid" },
        ],
        3: [
            { id: 301, title: bookTitle, author: bookAuthor, date: "12-2024", quantity: 300, publisherRevenue: 3000.00, authorRoyalty: 1500.00, paid: "pending" },
            { id: 302, title: bookTitle, author: bookAuthor, date: "11-2024", quantity: 280, publisherRevenue: 2800.00, authorRoyalty: 1400.00, paid: "paid" },
            { id: 303, title: bookTitle, author: bookAuthor, date: "10-2024", quantity: 320, publisherRevenue: 3200.00, authorRoyalty: 1600.00, paid: "paid" },
            { id: 304, title: bookTitle, author: bookAuthor, date: "09-2024", quantity: 290, publisherRevenue: 2900.00, authorRoyalty: 1450.00, paid: "paid" },
            { id: 305, title: bookTitle, author: bookAuthor, date: "08-2024", quantity: 310, publisherRevenue: 3100.00, authorRoyalty: 1550.00, paid: "paid" },
            { id: 306, title: bookTitle, author: bookAuthor, date: "07-2024", quantity: 300, publisherRevenue: 3000.00, authorRoyalty: 1500.00, paid: "paid" },
            { id: 307, title: bookTitle, author: bookAuthor, date: "06-2024", quantity: 300, publisherRevenue: 3000.00, authorRoyalty: 1500.00, paid: "paid" },
        ],
        4: [
            { id: 401, title: bookTitle, author: bookAuthor, date: "12-2024", quantity: 80, publisherRevenue: 800.00, authorRoyalty: 400.00, paid: "pending" },
            { id: 402, title: bookTitle, author: bookAuthor, date: "11-2024", quantity: 90, publisherRevenue: 900.00, authorRoyalty: 450.00, paid: "paid" },
            { id: 403, title: bookTitle, author: bookAuthor, date: "10-2024", quantity: 95, publisherRevenue: 950.00, authorRoyalty: 475.00, paid: "paid" },
            { id: 404, title: bookTitle, author: bookAuthor, date: "09-2024", quantity: 100, publisherRevenue: 1000.00, authorRoyalty: 500.00, paid: "paid" },
            { id: 405, title: bookTitle, author: bookAuthor, date: "08-2024", quantity: 110, publisherRevenue: 1100.00, authorRoyalty: 550.00, paid: "paid" },
            { id: 406, title: bookTitle, author: bookAuthor, date: "07-2024", quantity: 100, publisherRevenue: 1000.00, authorRoyalty: 500.00, paid: "paid" },
            { id: 407, title: bookTitle, author: bookAuthor, date: "06-2024", quantity: 100, publisherRevenue: 1000.00, authorRoyalty: 500.00, paid: "paid" },
        ],
    };

    return salesByBook[bookId] || [];
}

export function getMockBookById(id: number): BookDetail | null {
    const mockBooks: Record<number, BookDetail> = {
        1: {
            id: 1,
            title: "The Great Novel",
            authors: "Jane Smith",
            isbn13: "9781234567890",
            isbn10: "1234567890",
            publicationMonth: "03",
            publicationYear: 2023,
            defaultRoyaltyRate: 50,
            createdAt: new Date("2023-01-15"),
            updatedAt: new Date("2023-12-01"),
            totalSales: 1250,
            totalPublisherRevenue: 12500.00,
            unpaidAuthorRoyalty: 2500.00,
            paidAuthorRoyalty: 3750.00,
            totalAuthorRoyalty: 6250.00,
            sales: getMockSalesForBook(1, "The Great Novel", "Jane Smith"),
        },
        2: {
            id: 2,
            title: "Adventures in Code",
            authors: "John Doe",
            isbn13: "9780987654321",
            isbn10: "0987654321",
            publicationMonth: "07",
            publicationYear: 2024,
            defaultRoyaltyRate: 50,
            createdAt: new Date("2024-05-20"),
            updatedAt: new Date("2024-12-15"),
            totalSales: 850,
            totalPublisherRevenue: 8500.00,
            unpaidAuthorRoyalty: 1500.00,
            paidAuthorRoyalty: 2750.00,
            totalAuthorRoyalty: 4250.00,
            sales: getMockSalesForBook(2, "Adventures in Code", "John Doe"),
        },
        3: {
            id: 3,
            title: "Mystery of the Library",
            authors: "Alice Johnson",
            isbn13: "9781122334455",
            isbn10: "1122334455",
            publicationMonth: "11",
            publicationYear: 2023,
            defaultRoyaltyRate: 50,
            createdAt: new Date("2023-08-10"),
            updatedAt: new Date("2024-01-05"),
            totalSales: 2100,
            totalPublisherRevenue: 21000.00,
            unpaidAuthorRoyalty: 4200.00,
            paidAuthorRoyalty: 6300.00,
            totalAuthorRoyalty: 10500.00,
            sales: getMockSalesForBook(3, "Mystery of the Library", "Alice Johnson"),
        },
        4: {
            id: 4,
            title: "Science Fiction Tales",
            authors: "Bob Williams",
            isbn13: "9785566778899",
            isbn10: "5566778899",
            publicationMonth: "05",
            publicationYear: 2024,
            defaultRoyaltyRate: 50,
            createdAt: new Date("2024-03-15"),
            updatedAt: new Date("2024-11-20"),
            totalSales: 675,
            totalPublisherRevenue: 6750.00,
            unpaidAuthorRoyalty: 1200.00,
            paidAuthorRoyalty: 2175.00,
            totalAuthorRoyalty: 3375.00,
            sales: getMockSalesForBook(4, "Science Fiction Tales", "Bob Williams"),
        },
    };

    return mockBooks[id] || null;
}

export default async function asyncGetBooksData() {
  return await prisma.book.findMany({
    include: {
      authors: true,
    },
    orderBy: {
      title: 'asc',
    },
  });
}

export async function asyncGetBookById(id: number) {
  return await prisma.book.findUnique({
    where: { id },
    include: {
      authors: true,
      sales: {
        orderBy: {
          date: 'desc',
        },
        take: 10, // Get recent 10 sales for the detail page
      },
    },
  });
}

export async function asyncGetAuthors() {
  return await prisma.author.findMany({
    orderBy: {
      name: 'asc',
    },
  });
}
