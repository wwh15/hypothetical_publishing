import { describe, expect, it } from "vitest";
import {
  authorFirstNameSortKey,
  compareAuthorsByFirstName,
  computeAllAuthorsRoyaltyMatrix,
  listQuartersInRange,
  quarterFromDate,
  quarterOrdinal,
} from "./all-authors-royalty-report-logic";

describe("quarterOrdinal", () => {
  it("orders quarters chronologically", () => {
    expect(quarterOrdinal(2024, 1)).toBeLessThan(quarterOrdinal(2024, 2));
    expect(quarterOrdinal(2024, 4)).toBeLessThan(quarterOrdinal(2025, 1));
  });
});

describe("listQuartersInRange", () => {
  it("lists inclusive range in ascending order", () => {
    const q = listQuartersInRange(4, 2024, 2, 2025);
    expect(q.map((c) => c.label)).toEqual([
      "2024 Q4",
      "2025 Q1",
      "2025 Q2",
    ]);
    expect(q.map((c) => c.key)).toEqual(["2024-Q4", "2025-Q1", "2025-Q2"]);
  });

  it("supports single quarter", () => {
    const q = listQuartersInRange(2, 2026, 2, 2026);
    expect(q).toHaveLength(1);
    expect(q[0].label).toBe("2026 Q2");
  });
});

describe("authorFirstNameSortKey / compareAuthorsByFirstName", () => {
  it("uses first token for sort key", () => {
    expect(authorFirstNameSortKey("Jane Doe")).toBe("jane");
    expect(authorFirstNameSortKey("Madonna")).toBe("madonna");
  });

  it("sorts by first name then full name", () => {
    const authors = [
      { id: 1, name: "Bob Smith" },
      { id: 2, name: "Alice Jones" },
      { id: 3, name: "Alice Adams" },
    ];
    const sorted = [...authors].sort(compareAuthorsByFirstName);
    expect(sorted.map((a) => a.name)).toEqual([
      "Alice Adams",
      "Alice Jones",
      "Bob Smith",
    ]);
  });
});

describe("quarterFromDate", () => {
  it("maps months to quarters", () => {
    expect(quarterFromDate(new Date(2025, 0, 1))).toBe(1);
    expect(quarterFromDate(new Date(2025, 3, 1))).toBe(2);
    expect(quarterFromDate(new Date(2025, 11, 1))).toBe(4);
  });
});

describe("computeAllAuthorsRoyaltyMatrix", () => {
  const quarters = listQuartersInRange(1, 2025, 2, 2025);

  it("aggregates per author and quarter and adds total row data", () => {
    const authors = [
      { id: 1, name: "Zoe A" },
      { id: 2, name: "Amy B" },
    ];
    const sales = [
      { authorId: 1, year: 2025, quarter: 1, royalty: 10 },
      { authorId: 1, year: 2025, quarter: 1, royalty: 5 },
      { authorId: 2, year: 2025, quarter: 2, royalty: 20 },
    ];

    const result = computeAllAuthorsRoyaltyMatrix(authors, sales, quarters);

    expect(result.authorRows).toHaveLength(2);
    expect(result.authorRows[0].authorName).toBe("Amy B");
    expect(result.authorRows[0].values).toEqual([0, 20]);
    expect(result.authorRows[0].rowTotal).toBe(20);

    expect(result.authorRows[1].authorName).toBe("Zoe A");
    expect(result.authorRows[1].values).toEqual([15, 0]);
    expect(result.authorRows[1].rowTotal).toBe(15);

    expect(result.columnTotals).toEqual([15, 20]);
    expect(result.grandTotal).toBe(35);
  });

  it("ignores sales outside selected quarter columns", () => {
    const authors = [{ id: 1, name: "Only Author" }];
    const sales = [
      { authorId: 1, year: 2024, quarter: 4, royalty: 999 },
      { authorId: 1, year: 2025, quarter: 1, royalty: 3 },
    ];

    const result = computeAllAuthorsRoyaltyMatrix(authors, sales, quarters);
    expect(result.authorRows[0].values).toEqual([3, 0]);
    expect(result.grandTotal).toBe(3);
  });

  it("includes authors with zero royalties in range", () => {
    const authors = [
      { id: 1, name: "Has Sales" },
      { id: 2, name: "No Sales" },
    ];
    const sales = [{ authorId: 1, year: 2025, quarter: 1, royalty: 1 }];

    const result = computeAllAuthorsRoyaltyMatrix(authors, sales, quarters);
    expect(result.authorRows).toHaveLength(2);
    const noSales = result.authorRows.find((r) => r.authorId === 2);
    expect(noSales?.values).toEqual([0, 0]);
    expect(noSales?.rowTotal).toBe(0);
  });
});
