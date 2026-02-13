"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../prisma";
import { SaleListItem } from "./records";
import { Prisma } from "@prisma/client";

export interface AuthorGroup {
  author: string; // All authors in this group (could be 1 or many)
  authorId: number; // All author IDs in this group
  unpaidTotal: number;
  sales: SaleListItem[];
}

// The "Raw" shape coming out of Prisma
const authorPaymentSelect = {
  id: true,
  name: true,
  books: {
    select: {
      id: true,
      title: true,
      sales: {
        select: {
          id: true,
          quantity: true,
          date: true,
          publisherRevenue: true,
          authorRoyalty: true, // If you forget this now, the error will trigger
          paid: true,
        },
      },
    },
  },
} satisfies Prisma.AuthorSelect;

// 2. Use that Select object to define your Payload type
export type PrismaAuthorWithSales = Prisma.AuthorGetPayload<{
  select: typeof authorPaymentSelect;
}>;

export default async function asyncGetAuthorPaymentData(
  pageNumber: number = 1,
  pageSize: number = 2
): Promise<{ authors: AuthorGroup[]; totalGroups: number }> {

  const [rawAuthors, totalGroups] = await Promise.all([
    prisma.author.findMany({
      // 1. Paginate the Root (Authors)
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,

      // 2. Sort the Authors by name
      orderBy: {
        name: "asc",
      },
      
      // 3. Select fields
      select: authorPaymentSelect
    }),

    // 4. Count total authors for the pagination UI
    prisma.author.count(),
  ]);

  // Use the transformation function here
  return {
    authors: rawAuthors.map(transformToAuthorGroup),
    totalGroups,
  };
}

function transformToAuthorGroup(rawAuthor: PrismaAuthorWithSales): AuthorGroup {
  const allSales: SaleListItem[] = [];
  let unpaidTotal = 0;

  for (const book of rawAuthor.books) {
    for (const sale of book.sales) {
      // 1. Map Boolean to "paid" | "pending"
      const status: "paid" | "pending" = sale.paid ? "paid" : "pending";

      // 2. Build the SaleListItem
      allSales.push({
        id: sale.id,
        bookId: book.id,
        title: book.title,
        author: rawAuthor.name,
        date: sale.date,
        quantity: sale.quantity,
        publisherRevenue: sale.publisherRevenue,
        authorRoyalty: sale.authorRoyalty,
        paid: status,
      });

      // 3. Accumulate the unpaid total (only if pending)
      if (status === "pending") {
        unpaidTotal += sale.authorRoyalty;
      }
    }
  }

  // 4. Sort by date (Newest sales first)
  allSales.sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    author: rawAuthor.name,
    authorId: rawAuthor.id,
    unpaidTotal,
    sales: allSales,
  };
}

// Mark all unpaid sales for an author group as paid
export async function markAllPaid(authorId: number) {
  try {
    // Get all books for this author
    const authorBooks = await prisma.book.findMany({
      where: {
        authorId: authorId,
      },
    });

    const bookIds = authorBooks.map((book) => book.id);

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

    revalidatePath("/sales/payments");

    return {
      success: true,
      count: result.count,
      message: `Marked ${result.count} sale(s) as paid`,
    };
  } catch (error) {
    console.error("Error marking author group paid:", error);
    return {
      success: false,
      error: "Failed to mark sales as paid",
    };
  }
}
