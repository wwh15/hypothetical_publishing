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
        },
    };

    return mockBooks[id] || null;
}

export default async function asyncGetBooksData() {
  return await prisma.book.findMany({
    include: {
      author: true,
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
      author: true,
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
