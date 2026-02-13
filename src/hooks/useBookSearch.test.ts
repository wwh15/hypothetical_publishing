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
    publicationDate: new Date(2018, 2, 1), // March 2018
    publicationSortKey: "2018-03",
    defaultRoyaltyRate: 10,
    totalSales: 100,
  },
  {
    id: 2,
    title: "Learning TypeScript",
    author: "Jane Smith",
    isbn13: null,
    isbn10: "1492037658",
    publicationDate: null,
    publicationSortKey: "2020-99",
    defaultRoyaltyRate: 15,
    totalSales: 50,
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
