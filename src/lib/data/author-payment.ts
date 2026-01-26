'use server';

import { revalidatePath } from "next/cache";
import { prisma } from "../prisma";
import { SaleListItem } from "./records";

export interface AuthorGroup {
  author: string[];      // All authors in this group (could be 1 or many)
  authorId: number[];  // All author IDs in this group
  unpaidTotal: number;
  sales: SaleListItem[];
}

export default async function asyncGetAuthorPaymentData(): Promise<AuthorGroup[]> {
  // Get all books with their authors and sales
  const books = await prisma.book.findMany({
    include: {
      authors: {
        orderBy: {
          name: 'asc', // Sort authors for consistent grouping
        },
      },
      sales: {
        orderBy: {
          date: 'desc',
        },
      },
    },
  });

  // Build a map: author combination key -> { author info, sales array }
  // Key is sorted author IDs joined (e.g., "1,2" for authors with IDs 1 and 2)
  const authorGroupMap = new Map<string, {
    authorNames: string[];
    authorIds: number[];
    sales: SaleListItem[];
  }>();

  // Process each book and group by author combination
  books.forEach((book) => {
    // Create a unique key for this author combination (sorted IDs)
    const authorIds = book.authors.map(a => a.id).sort((a, b) => a - b);
    const groupKey = authorIds.join(',');

    // Get or create the group for this author combination
    if (!authorGroupMap.has(groupKey)) {
      authorGroupMap.set(groupKey, {
        authorNames: book.authors.map(a => a.name).sort(),
        authorIds: authorIds,
        sales: [],
      });
    }

    const group = authorGroupMap.get(groupKey)!;

    // Add all sales from this book to the group
    book.sales.forEach((sale) => {
      group.sales.push({
        id: sale.id,
        title: book.title,
        author: book.authors.map(a => a.name).join(', '), // Show all authors
        date: sale.date,
        quantity: sale.quantity,
        publisherRevenue: sale.publisherRevenue,
        authorRoyalty: sale.authorRoyalty,
        paid: sale.paid ? 'paid' : 'pending' as 'paid' | 'pending',
      });
    });
  });

  // Convert map to array and calculate totals
  return Array.from(authorGroupMap.values())
    .map(({ authorNames, authorIds, sales }) => {
      const unpaidTotal = sales
        .filter(sale => sale.paid === 'pending')
        .reduce((sum, sale) => sum + sale.authorRoyalty, 0);

      return {
        author: authorNames,    // Array of author names for this group
        authorId: authorIds,    // Array of author IDs for this group
        unpaidTotal: +unpaidTotal.toFixed(2),
        sales,
      };
    })
    .filter((group) => group.sales.length > 0)
    .sort((a, b) => {
      // Sort by first author name, then by number of authors
      const aFirst = a.author[0];
      const bFirst = b.author[0];
      if (aFirst !== bFirst) {
        return aFirst.localeCompare(bFirst);
      }
      return a.author.length - b.author.length;
    });
}

// Mark all unpaid sales for an author group as paid
export async function markAuthorPaid(authorIds: number[]) {
  try {
    // Get all books that have exactly these authors (and no others)
    const authorBooks = await prisma.book.findMany({
      where: {
        authors: {
          every: { id: { in: authorIds } },
        },
      },
      include: { authors: { select: { id: true } } },
    });
    
    // Filter to exact matches
    const exactMatchBooks = authorBooks.filter(
      book => book.authors.length === authorIds.length
    );

    const bookIds = exactMatchBooks.map(book => book.id);

    // Update all unpaid sales for these books to paid
    const result = await prisma.sale.updateMany({
      where: {
        bookId: { in: bookIds },
        paid: false,
      },
      data: {
        paid: true,
      },
    });

    revalidatePath('/sales/payments');

    return {
      success: true,
      count: result.count,
      message: `Marked ${result.count} sale(s) as paid`
    };
  } catch (error) {
    console.error('Error marking author group paid:', error);
    return {
      success: false,
      error: 'Failed to mark sales as paid'
    };
  }
}