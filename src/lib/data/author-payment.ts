'use server';

import { revalidatePath } from "next/cache";
import { prisma } from "../prisma";
import { Sale } from "./records";

export interface AuthorGroup {
  author: string;
  authorId: number;  // Add this line
  unpaidTotal: number;
  sales: Sale[];
}

export default async function asyncGetAuthorPaymentData(): Promise<AuthorGroup[]> {
  // Get all authors with their books and ALL sales (both paid and unpaid)
  const authors = await prisma.author.findMany({
    include: {
      books: {
        include: {
          sales: {
            // Remove the where filter - get all sales
            orderBy: {
              date: 'desc',
            },
          },
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Transform to AuthorGroup format
  return authors
    .map((author) => {
      const sales = author.books.flatMap((book) =>
        book.sales.map((sale) => ({
          id: sale.id,
          title: book.title,
          author: author.name,
          date: sale.date,
          quantity: sale.quantity,
          publisherRevenue: sale.publisherRevenue,
          authorRoyalty: sale.authorRoyalty,
          paid: sale.paid ? 'paid' : 'pending' as 'paid' | 'pending',
        }))
      );

      // Calculate unpaid total (filter for pending only)
      const unpaidTotal = sales
        .filter(sale => sale.paid === 'pending')
        .reduce((sum, sale) => sum + sale.authorRoyalty, 0);

      return {
        author: author.name,
        authorId: author.id,
        unpaidTotal: +unpaidTotal.toFixed(2),
        sales, // All sales (both paid and unpaid)
      };
    })
    .filter((group) => group.sales.length > 0); // Authors with any sales
}

// Mark all unpaid sales for an author as paid
export async function markAuthorPaid(authorId: number) {
  try {
    // Get all books by this author
    const authorBooks = await prisma.book.findMany({
      where: { authorId },
      select: { id: true },
    });

    const bookIds = authorBooks.map(book => book.id);

    // Update all unpaid sales for these books to paid
    const result = await prisma.sale.updateMany({
      where: {
        bookId: { in: bookIds },
        paid: false, // Only update unpaid records
      },
      data: {
        paid: true,
      },
    });

    // Revalidate the payments page to show updated data
    revalidatePath('/sales/payments');

    return {
      success: true,
      count: result.count, // Number of records updated
      message: `Marked ${result.count} sale(s) as paid`
    };
  } catch (error) {
    console.error('Error marking author paid:', error);
    return {
      success: false,
      error: 'Failed to mark sales as paid'
    };
  }
}