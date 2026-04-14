import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../prisma";
import {
  listQuartersInRange,
  quarterFromDate,
} from "./all-authors-royalty-report-logic";
import {
  computePublisherProfitMatrix,
  type ProfitSaleInput,
  type PublisherProfitBookInput,
  type PublisherProfitReportParams,
  type PublisherProfitReportResult,
} from "./publisher-profit-report-logic";

export type {
  ProfitSaleInput,
  PublisherProfitBookInput,
  PublisherProfitBookRow,
  PublisherProfitReportParams,
  PublisherProfitReportResult,
} from "./publisher-profit-report-logic";

export { computePublisherProfitMatrix } from "./publisher-profit-report-logic";

function formatSeriesPosition(
  seriesName: string | null,
  seriesOrder: number | null
): string {
  if (seriesName != null && seriesOrder != null) {
    return `${seriesName} (${seriesOrder})`;
  }
  return "";
}

/** Same sort as getAmazonSalesReportData */
function sortBooksForReport(
  rows: (PublisherProfitBookInput & { authorName: string; seriesName: string | null; seriesOrder: number | null; title: string })[]
): PublisherProfitBookInput[] {
  const sorted = [...rows].sort((a, b) => {
    const authorCmp = a.authorName.localeCompare(b.authorName);
    if (authorCmp !== 0) return authorCmp;

    const sA = a.seriesName ?? "\uFFFF";
    const sB = b.seriesName ?? "\uFFFF";
    if (sA !== sB) return sA.localeCompare(sB);

    const oA = a.seriesOrder ?? Infinity;
    const oB = b.seriesOrder ?? Infinity;
    if (oA !== oB) return oA - oB;

    return a.title.localeCompare(b.title);
  });

  return sorted.map(({ authorName: _a, seriesName: _s, seriesOrder: _o, ...rest }) => rest);
}

export async function getPublisherProfitReportData(
  params: PublisherProfitReportParams
): Promise<PublisherProfitReportResult> {
  const { startQuarter, startYear, endQuarter, endYear } = params;
  const quarterColumns = listQuartersInRange(
    startQuarter,
    startYear,
    endQuarter,
    endYear
  );

  const [books, sales] = await Promise.all([
    prisma.book.findMany({
      where: { released: true },
      include: {
        author: { select: { name: true } },
        series: { select: { name: true } },
      },
    }),
    prisma.sale.findMany({
      where: { book: { released: true } },
      select: {
        bookId: true,
        date: true,
        publisherRevenueUSD: true,
        authorRoyalty: true,
      },
    }),
  ]);

  const bookInputsRaw = books.map((b) => ({
    bookId: b.id,
    author: b.author.name,
    authorName: b.author.name,
    seriesName: b.series?.name ?? null,
    seriesOrder: b.seriesOrder ?? null,
    title: b.title,
    seriesPosition: formatSeriesPosition(
      b.series?.name ?? null,
      b.seriesOrder ?? null
    ),
    isbn13: b.isbn13,
    asin: b.asin ?? "",
    coverPrice: new Decimal(b.coverPrice.toString()).toNumber(),
    printCost: new Decimal(b.printCost.toString()).toNumber(),
  }));

  const bookInputs = sortBooksForReport(bookInputsRaw);

  const saleInputs: ProfitSaleInput[] = sales.map((s) => {
    const pub = new Decimal(s.publisherRevenueUSD.toString()).toNumber();
    const roy = new Decimal(s.authorRoyalty.toString()).toNumber();
    return {
      bookId: s.bookId,
      year: s.date.getFullYear(),
      quarter: quarterFromDate(s.date),
      profit: pub - roy,
    };
  });

  return computePublisherProfitMatrix(bookInputs, saleInputs, quarterColumns);
}
