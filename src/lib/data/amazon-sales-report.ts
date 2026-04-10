import { prisma } from "../prisma";
import { Decimal } from "@prisma/client/runtime/library";

export interface AmazonSalesRow {
  author: string;
  seriesName: string | null;
  seriesOrder: number | null;
  title: string;
  isbn13: string;
  asin: string | null;
  printQty: number;
  printRevenue: number;
  ebookQty: number;
  ebookRevenue: number;
  kenp: number;
  kenpRevenue: number;
}

/**
 * Fetch lifetime Amazon sales data per book.
 * Excludes projected sales (book.released = false).
 * One row per book that has any Amazon sales.
 * Sorted by author name → series name/position → title.
 */
export async function getAmazonSalesReportData(): Promise<AmazonSalesRow[]> {
  // Fetch all Amazon sales for released books
  const sales = await prisma.sale.findMany({
    where: {
      distributor: "AMAZON",
      book: { is: { released: true } },
    },
    include: {
      book: {
        include: {
          author: { select: { name: true } },
          series: { select: { name: true } },
        },
      },
    },
  });

  // Aggregate per book
  const bookMap = new Map<
    number,
    AmazonSalesRow & { authorName: string }
  >();

  for (const s of sales) {
    const b = s.book;
    if (!bookMap.has(b.id)) {
      bookMap.set(b.id, {
        author: b.author.name,
        authorName: b.author.name,
        seriesName: b.series?.name ?? null,
        seriesOrder: b.seriesOrder ?? null,
        title: b.title,
        isbn13: b.isbn13,
        asin: b.asin ?? null,
        printQty: 0,
        printRevenue: 0,
        ebookQty: 0,
        ebookRevenue: 0,
        kenp: 0,
        kenpRevenue: 0,
      });
    }

    const row = bookMap.get(b.id)!;
    const revenue = new Decimal(s.publisherRevenueUSD.toString()).toNumber();

    if (s.format === "PRINT") {
      row.printQty += s.quantity ?? 0;
      row.printRevenue += revenue;
    } else if (s.format === "EBOOK") {
      row.ebookQty += s.quantity ?? 0;
      row.ebookRevenue += revenue;
    } else if (s.format === "KINDLE_UNLIMITED") {
      row.kenp += s.kenp != null
        ? new Decimal(s.kenp.toString()).toNumber()
        : 0;
      row.kenpRevenue += revenue;
    }
  }

  // Sort: author → series name/position → title
  const rows = Array.from(bookMap.values()).sort((a, b) => {
    const authorCmp = a.authorName.localeCompare(b.authorName);
    if (authorCmp !== 0) return authorCmp;

    // Series books before non-series
    const sA = a.seriesName ?? "\uFFFF";
    const sB = b.seriesName ?? "\uFFFF";
    if (sA !== sB) return sA.localeCompare(sB);

    const oA = a.seriesOrder ?? Infinity;
    const oB = b.seriesOrder ?? Infinity;
    if (oA !== oB) return oA - oB;

    return a.title.localeCompare(b.title);
  });

  // Strip internal authorName field
  return rows.map(({ authorName: _, ...row }) => row);
}
