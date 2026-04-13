import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../prisma";
import {
  computeAllAuthorsRoyaltyMatrix,
  listQuartersInRange,
  quarterFromDate,
  type AllAuthorsRoyaltyReportParams,
  type AllAuthorsRoyaltyReportResult,
  type RoyaltySaleInput,
} from "./all-authors-royalty-report-logic";

export type {
  AllAuthorsRoyaltyAuthorRow,
  AllAuthorsRoyaltyReportParams,
  AllAuthorsRoyaltyReportResult,
  QuarterColumn,
  RoyaltySaleInput,
} from "./all-authors-royalty-report-logic";

export {
  authorFirstNameSortKey,
  compareAuthorsByFirstName,
  computeAllAuthorsRoyaltyMatrix,
  listQuartersInRange,
  quarterFromDate,
  quarterOrdinal,
} from "./all-authors-royalty-report-logic";

/**
 * Loads all authors and released-book sales; aggregates royalties by author and calendar quarter.
 */
export async function getAllAuthorsRoyaltyReportData(
  params: AllAuthorsRoyaltyReportParams
): Promise<AllAuthorsRoyaltyReportResult> {
  const { startQuarter, startYear, endQuarter, endYear } = params;
  const quarterColumns = listQuartersInRange(
    startQuarter,
    startYear,
    endQuarter,
    endYear
  );

  const [authors, sales] = await Promise.all([
    prisma.author.findMany({
      select: { id: true, name: true },
    }),
    prisma.sale.findMany({
      where: { book: { released: true } },
      select: {
        authorRoyalty: true,
        date: true,
        book: { select: { authorId: true } },
      },
    }),
  ]);

  const saleInputs: RoyaltySaleInput[] = sales.map((s) => ({
    authorId: s.book.authorId,
    year: s.date.getFullYear(),
    quarter: quarterFromDate(s.date),
    royalty: new Decimal(s.authorRoyalty.toString()).toNumber(),
  }));

  return computeAllAuthorsRoyaltyMatrix(authors, saleInputs, quarterColumns);
}
