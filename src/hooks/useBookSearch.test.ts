import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBookSearch, filterBooksBySearch } from "./useBookSearch";
import type { BookListItem } from "@/lib/data/books";

const mockBooks: BookListItem[] = [
  {
    id: 1,
    title: "React in Action",
    author: "John Doe",
    isbn13: "9781617293856",
    isbn10: "1617293859",
    asin: null,
    publicationDate: new Date(2018, 2, 1), // March 2018
    publicationSortKey: "2018-03",
    distRoyaltyRate: 10,
    handSoldRoyaltyRate: 5,
    coverPrice: 29.99,
    printCost: 5.5,
    totalSales: 100,
    totalAuthorRoyalty: 0,
    paidAuthorRoyalty: 0,
    unpaidAuthorRoyalty: 0,
    seriesName: null,
    seriesOrder: null,
    coverArtPath: null,
  },
  {
    id: 2,
    title: "Learning TypeScript",
    author: "Jane Smith",
    isbn13: "9781492037651",
    isbn10: "1492037658",
    asin: null,
    publicationDate: new Date(2020, 5, 1),
    publicationSortKey: "2020-06",
    distRoyaltyRate: 15,
    handSoldRoyaltyRate: 8,
    coverPrice: 34.99,
    printCost: 6,
    totalSales: 50,
    totalAuthorRoyalty: 0,
    paidAuthorRoyalty: 0,
    unpaidAuthorRoyalty: 0,
    seriesName: null,
    seriesOrder: null,
    coverArtPath: null,
  },
];

describe("filterBooksBySearch", () => {
  it("returns all books when search is empty", () => {
    expect(filterBooksBySearch(mockBooks, "")).toHaveLength(2);
    expect(filterBooksBySearch(mockBooks, "   ")).toHaveLength(2);
  });

  it("filters by title (case-insensitive)", () => {
    const result = filterBooksBySearch(mockBooks, "react");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("React in Action");
  });

  it("filters by author", () => {
    const result = filterBooksBySearch(mockBooks, "Jane");
    expect(result).toHaveLength(1);
    expect(result[0].author).toBe("Jane Smith");
  });

  it("filters by ISBN (digits only match)", () => {
    const result = filterBooksBySearch(mockBooks, "1617293856");
    expect(result).toHaveLength(1);
    expect(result[0].isbn13).toBe("9781617293856");
  });

  it("matches ISBN with dashes and ISBN-10 X check digit", () => {
    const booksWithX: BookListItem[] = [
      ...mockBooks,
      {
        id: 3,
        title: "Domain-Driven Design",
        author: "Eric Evans",
        isbn13: "9780321125217",
        isbn10: "0321125215",
        asin: "B00TEST123",
        publicationDate: new Date(2003, 7, 1),
        publicationSortKey: "2003-08",
        distRoyaltyRate: 12,
        handSoldRoyaltyRate: 6,
        coverPrice: 49.99,
        printCost: 8,
        totalSales: 10,
        totalAuthorRoyalty: 0,
        paidAuthorRoyalty: 0,
        unpaidAuthorRoyalty: 0,
        seriesName: null,
        seriesOrder: null,
        coverArtPath: null,
      },
    ];

    const dashed = filterBooksBySearch(booksWithX, "978-0-321-12521-7");
    expect(dashed[0].id).toBe(3);
  });

  it("matches ASIN regardless of punctuation", () => {
    const booksWithAsin: BookListItem[] = [
      ...mockBooks,
      {
        id: 3,
        title: "ASIN Book",
        author: "A Author",
        isbn13: "9780000000001",
        isbn10: "0000000000",
        asin: "B0A1-2C3D4E",
        publicationDate: new Date(2021, 0, 1),
        publicationSortKey: "2021-01",
        distRoyaltyRate: 10,
        handSoldRoyaltyRate: 5,
        coverPrice: 9.99,
        printCost: 2,
        totalSales: 1,
        totalAuthorRoyalty: 0,
        paidAuthorRoyalty: 0,
        unpaidAuthorRoyalty: 0,
        seriesName: null,
        seriesOrder: null,
        coverArtPath: null,
      },
    ];

    const result = filterBooksBySearch(booksWithAsin, "B0A1 2C3D4E");
    expect(result[0].id).toBe(3);
  });

  it("returns empty array when no match", () => {
    expect(filterBooksBySearch(mockBooks, "nonexistent")).toHaveLength(0);
  });
});

describe("useBookSearch", () => {
  it("returns all books when search is empty", () => {
    const { result } = renderHook(() => useBookSearch(mockBooks));
    expect(result.current.filteredBooks).toHaveLength(2);
    expect(result.current.searchQuery).toBe("");
  });

  it("setSearchQuery updates searchQuery", () => {
    const { result } = renderHook(() => useBookSearch(mockBooks));
    expect(result.current.searchQuery).toBe("");
    act(() => {
      result.current.setSearchQuery("react");
    });
    expect(result.current.searchQuery).toBe("react");
  });
});
