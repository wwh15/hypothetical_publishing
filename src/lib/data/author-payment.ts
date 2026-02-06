"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../prisma";
import { SaleListItem } from "./records";

export interface AuthorGroup {
  authors: string[]; // All authors in this group (could be 1 or many)
  authorIds: number[]; // All author IDs in this group
  unpaidTotal: number;
  sales: SaleListItem[];
}

export default async function asyncGetAuthorPaymentData(
  pageNumber: number = 1,
  pageSize: number = 2  // groups per page
): Promise<{ groups: AuthorGroup[]; totalGroups: number }> {
  const offset = (pageNumber - 1) * pageSize;
  
  // Step 1: Get paginated author groups from DB
  const rawRows = await prisma.$queryRaw<Array<{
    book_id: number;
    book_title: string;
    author_names: string;
    author_ids: number[];  // PostgreSQL array
    sale_id: number;
    publisher_revenue: number;
    author_royalty: number;
    quantity: number;
    paid: boolean;
    date: string;
  }>>`
    WITH book_author_ids AS (
      SELECT
        ab."B" AS book_id,
        array_agg(ab."A" ORDER BY ab."A") AS author_ids,
        string_agg(a.name, ', ' ORDER BY a.name) AS author_names
      FROM "_AuthorToBook" ab
      JOIN authors a ON a.id = ab."A"
      GROUP BY ab."B"
      ORDER BY author_names ASC
      LIMIT ${pageSize}
      OFFSET ${offset}
    )
    SELECT
      bai.book_id,
      b.title AS book_title,
      bai.author_names,
      bai.author_ids,
      s.id AS sale_id,
      s.publisher_revenue,
      s.author_royalty,
      s.quantity,
      s.paid,
      s.date
    FROM book_author_ids bai
    INNER JOIN sales s ON s.book_id = bai.book_id
    INNER JOIN books b ON b.id = bai.book_id
    ORDER BY
      bai.author_names ASC,
      to_date(s.date, 'MM-YYYY') DESC;
  `;

  // Step 2: Group rows by author combination (same logic as before)
  const authorGroupMap = new Map<string, {
    authorNames: string[];
    authorIds: number[];
    sales: SaleListItem[];
  }>();

  for (const row of rawRows) {
    const authorIds = Array.isArray(row.author_ids) 
      ? row.author_ids 
      : parsePgArray(row.author_ids);
    const groupKey = authorIds.join(',');
    
    if (!authorGroupMap.has(groupKey)) {
      const authorNames = row.author_names.split(', ').map(s => s.trim());
      authorGroupMap.set(groupKey, {
        authorNames,
        authorIds,
        sales: [],
      });
    }

    const group = authorGroupMap.get(groupKey)!;
    group.sales.push({
      id: row.sale_id,
      bookId: row.book_id,
      title: row.book_title,
      author: row.author_names,
      date: row.date,
      quantity: row.quantity,
      publisherRevenue: Number(row.publisher_revenue),
      authorRoyalty: Number(row.author_royalty),
      paid: row.paid ? 'paid' : 'pending',
    });
  }

  // Step 3: Convert to AuthorGroup[] and calculate totals
  const groups = Array.from(authorGroupMap.values()).map(({ authorNames, authorIds, sales }) => {
    const unpaidTotal = sales
      .filter(sale => sale.paid === 'pending')
      .reduce((sum, sale) => sum + sale.authorRoyalty, 0);
    return {
      authors: authorNames,
      authorIds,
      unpaidTotal: +unpaidTotal.toFixed(2),
      sales,
    };
  });

  // Step 4: Get total count (separate query)
  const totalResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(DISTINCT (
      SELECT string_agg(a.name, ', ' ORDER BY a.name)
      FROM "_AuthorToBook" ab2
      JOIN authors a ON a.id = ab2."A"
      WHERE ab2."B" = ab."B"
    )) as count
    FROM "_AuthorToBook" ab
  `;
  const totalGroups = Number(totalResult[0]?.count || 0);

  return { groups, totalGroups };
}

function parsePgArray(value: unknown): number[] {
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value === 'string') {
    const trimmed = value.replace(/^\{|\}$/g, '').trim();
    return trimmed ? trimmed.split(',').map(s => parseInt(s.trim(), 10)) : [];
  }
  return [];
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
      (book) => book.authors.length === authorIds.length
    );

    const bookIds = exactMatchBooks.map((book) => book.id);

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
