"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../prisma";
import { SaleListItem } from "./records";
import { Prisma } from "@prisma/client";

export interface AuthorGroup {
  author: string;
  authorId: number;
  /** Unpaid royalties on released books — eligible to mark paid. */
  unpaidPayableTotal: number;
  /** Unpaid royalties on unreleased books (not payable until the book is released). */
  unpaidProjectedTotal: number;
  sales: SaleListItem[];
}

/** Unpaid royalty sums across all authors matching the current search (not page-limited). */
export interface AuthorPaymentGrandTotals {
  unpaidPayable: number;
  unpaidProjected: number;
}

// The "Raw" shape coming out of Prisma
const authorPaymentSelect = {
  id: true,
  name: true,
  books: {
    select: {
      id: true,
      title: true,
      released: true,
      sales: {
        select: {
          id: true,
          quantity: true,
          kenp: true,
          format: true,
          distributor: true,
          date: true,
          publisherRevenueUSD: true,
          publisherRevenueOriginal: true,
          currency: true,
          authorRoyalty: true,
          paid: true,
          comment: true,
          source: true,
        },
      },
    },
  },
} satisfies Prisma.AuthorSelect;

// 2. Use that Select object to define your Payload type
export type PrismaAuthorWithSales = Prisma.AuthorGetPayload<{
  select: typeof authorPaymentSelect;
}>;

function bookWhereForPaymentSearch(
  trimmedSearch: string
): Pick<Prisma.BookWhereInput, "author"> | Record<string, never> {
  if (!trimmedSearch) return {};
  return {
    author: {
      OR: [
        { name: { contains: trimmedSearch, mode: "insensitive" } },
        { email: { contains: trimmedSearch, mode: "insensitive" } },
      ],
    },
  };
}

export default async function asyncGetAuthorPaymentData(
  pageNumber: number = 1,
  pageSize: number = 20,
  search: string = ""
): Promise<{
  authors: AuthorGroup[];
  totalGroups: number;
  totals: AuthorPaymentGrandTotals;
}> {
  const trimmedSearch = search.trim();

  // 2. Define the search filter
  const where: Prisma.AuthorWhereInput = trimmedSearch
    ? {
        OR: [
          { name: { contains: trimmedSearch, mode: "insensitive" } },
          { email: { contains: trimmedSearch, mode: "insensitive" } },
        ],
      }
    : {};

  const bookScope = bookWhereForPaymentSearch(trimmedSearch);

  const [rawAuthors, totalGroups, payableAgg, projectedAgg] = await Promise.all([
    prisma.author.findMany({
      where,
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
    prisma.author.count({ where }),

    prisma.sale.aggregate({
      where: {
        paid: false,
        book: { released: true, ...bookScope },
      },
      _sum: { authorRoyalty: true },
    }),

    prisma.sale.aggregate({
      where: {
        paid: false,
        book: { released: false, ...bookScope },
      },
      _sum: { authorRoyalty: true },
    }),
  ]);

  const totals: AuthorPaymentGrandTotals = {
    unpaidPayable: Number(payableAgg._sum.authorRoyalty ?? 0),
    unpaidProjected: Number(projectedAgg._sum.authorRoyalty ?? 0),
  };

  return {
    authors: rawAuthors.map(transformToAuthorGroup),
    totalGroups,
    totals,
  };
}

function transformToAuthorGroup(rawAuthor: PrismaAuthorWithSales): AuthorGroup {
  const allSales: SaleListItem[] = [];
  let unpaidPayableTotal = 0;
  let unpaidProjectedTotal = 0;

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
        kenp: sale.kenp != null ? sale.kenp.toNumber() : null,
        format: sale.format,
        distributor: sale.distributor,
        publisherRevenueUSD: sale.publisherRevenueUSD.toNumber(),
        publisherRevenueOriginal: sale.publisherRevenueOriginal.toNumber(),
        currency: sale.currency,
        authorRoyalty: sale.authorRoyalty.toNumber(),
        paid: status,
        comment: sale.comment ?? null,
        source: sale.source,
        bookReleased: book.released,
      });

      // 3. Unpaid splits: released = payable; unreleased = projected
      if (status === "pending") {
        const amt = sale.authorRoyalty.toNumber();
        if (book.released) {
          unpaidPayableTotal += amt;
        } else {
          unpaidProjectedTotal += amt;
        }
      }
    }
  }

  // 4. Sort by date (Newest sales first)
  allSales.sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    author: rawAuthor.name,
    authorId: rawAuthor.id,
    unpaidPayableTotal,
    unpaidProjectedTotal,
    sales: allSales,
  };
}

// Mark all unpaid sales for an author group as paid
export async function markAllPaid(authorId: number) {
  try {
    // Only released-book sales are eligible to mark paid.
    const result = await prisma.sale.updateMany({
      where: {
        paid: false,
        book: {
          authorId,
          released: true,
        },
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
