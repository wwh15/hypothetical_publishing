import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBookSearch } from "./useBookSearch";

const mockBooks = [
  {
    id: 1,
    title: "The Great Gatsby",
    author: { name: "F. Scott Fitzgerald" },
    authorRoyaltyRate: 0.25,
    isbn13: "9780743273565",
    isbn10: "0743273567",
  },
  {
    id: 2,
    title: "To Kill a Mockingbird",
    author: { name: "Harper Lee" },
    authorRoyaltyRate: 0.2,
    isbn13: null,
    isbn10: "0061120081",
  },
  {
    id: 3,
    title: "1984",
    author: { name: "George Orwell" },
    authorRoyaltyRate: 0.3,
    isbn13: "9780451524935",
    isbn10: null,
  },
];

describe("useBookSearch", () => {
  it("returns all books when search query is empty", () => {
    const { result } = renderHook(() => useBookSearch(mockBooks));
    expect(result.current.filteredBooks).toHaveLength(3);
    expect(result.current.searchQuery).toBe("");
  });

  it("filters by title (case-insensitive)", () => {
    const { result } = renderHook(() => useBookSearch(mockBooks));
    act(() => {
      result.current.setSearchQuery("gatsby");
    });
    expect(result.current.filteredBooks).toHaveLength(1);
    expect(result.current.filteredBooks[0].title).toBe("The Great Gatsby");
  });

  it("filters by author name (case-insensitive)", () => {
    const { result } = renderHook(() => useBookSearch(mockBooks));
    act(() => {
      result.current.setSearchQuery("harper");
    });
    expect(result.current.filteredBooks).toHaveLength(1);
    expect(result.current.filteredBooks[0].author.name).toBe("Harper Lee");
  });

  it("filters by ISBN-13 (digits only match)", () => {
    const { result } = renderHook(() => useBookSearch(mockBooks));
    act(() => {
      result.current.setSearchQuery("0743273567");
    });
    expect(result.current.filteredBooks).toHaveLength(1);
    expect(result.current.filteredBooks[0].title).toBe("The Great Gatsby");
  });

  it("filters by ISBN-10 (digits only match)", () => {
    const { result } = renderHook(() => useBookSearch(mockBooks));
    act(() => {
      result.current.setSearchQuery("0061120081");
    });
    expect(result.current.filteredBooks).toHaveLength(1);
    expect(result.current.filteredBooks[0].title).toBe("To Kill a Mockingbird");
  });

  it("returns empty array when no books match", () => {
    const { result } = renderHook(() => useBookSearch(mockBooks));
    act(() => {
      result.current.setSearchQuery("nonexistent");
    });
    expect(result.current.filteredBooks).toHaveLength(0);
  });

  it("ignores whitespace-only query and returns all books", () => {
    const { result } = renderHook(() => useBookSearch(mockBooks));
    act(() => {
      result.current.setSearchQuery("   ");
    });
    expect(result.current.filteredBooks).toHaveLength(3);
  });
});
