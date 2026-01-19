import { prisma } from "../prisma";

export interface Book {
    id: number;
    title: string;
    author: string;
    authorId: number;
    isbn13: string | null;
    isbn10: string | null;
    authorRoyaltyRate: number;
    createdAt: Date;
    updatedAt: Date;
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
