import { describe, expect, it } from "vitest";
import { listQuartersInRange } from "./all-authors-royalty-report-logic";
import { computePublisherProfitMatrix } from "./publisher-profit-report-logic";

describe("computePublisherProfitMatrix", () => {
  const quarters = listQuartersInRange(1, 2025, 2, 2025);

  it("sums publisher profit per book per quarter and totals", () => {
    const books = [
      {
        bookId: 2,
        author: "B",
        seriesPosition: "",
        title: "Book B",
        isbn13: "9780000000002",
        asin: "",
        coverPrice: 10,
        printCost: 2,
      },
      {
        bookId: 1,
        author: "A",
        seriesPosition: "S (1)",
        title: "Book A",
        isbn13: "9780000000001",
        asin: "B00A",
        coverPrice: 20,
        printCost: 4,
      },
    ];

    const sales = [
      { bookId: 1, year: 2025, quarter: 1, profit: 3 },
      { bookId: 1, year: 2025, quarter: 1, profit: 2 },
      { bookId: 2, year: 2025, quarter: 2, profit: 7 },
    ];

    const result = computePublisherProfitMatrix(books, sales, quarters);

    expect(result.bookRows).toHaveLength(2);
    expect(result.bookRows[0].bookId).toBe(2);
    expect(result.bookRows[0].values).toEqual([0, 7]);
    expect(result.bookRows[0].rowTotal).toBe(7);

    expect(result.bookRows[1].bookId).toBe(1);
    expect(result.bookRows[1].values).toEqual([5, 0]);
    expect(result.bookRows[1].rowTotal).toBe(5);

    expect(result.columnTotals).toEqual([5, 7]);
    expect(result.grandTotal).toBe(12);
  });

  it("ignores sales outside selected quarters", () => {
    const books = [
      {
        bookId: 1,
        author: "A",
        seriesPosition: "",
        title: "Only",
        isbn13: "9781",
        asin: "",
        coverPrice: 1,
        printCost: 1,
      },
    ];
    const sales = [
      { bookId: 1, year: 2024, quarter: 4, profit: 100 },
      { bookId: 1, year: 2025, quarter: 1, profit: 4 },
    ];

    const result = computePublisherProfitMatrix(books, sales, quarters);
    expect(result.bookRows[0].values).toEqual([4, 0]);
    expect(result.grandTotal).toBe(4);
  });

  it("keeps zero rows for books with no sales in range", () => {
    const books = [
      {
        bookId: 1,
        author: "A",
        seriesPosition: "",
        title: "Has",
        isbn13: "9781",
        asin: "",
        coverPrice: 1,
        printCost: 1,
      },
      {
        bookId: 2,
        author: "B",
        seriesPosition: "",
        title: "Empty",
        isbn13: "9782",
        asin: "",
        coverPrice: 2,
        printCost: 2,
      },
    ];
    const sales = [{ bookId: 1, year: 2025, quarter: 1, profit: 1 }];

    const result = computePublisherProfitMatrix(books, sales, quarters);
    expect(result.bookRows[1].values).toEqual([0, 0]);
    expect(result.bookRows[1].rowTotal).toBe(0);
    expect(result.grandTotal).toBe(1);
  });
});
