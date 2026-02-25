import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBookSelection } from "./useBookSelection";
import type { BookListItem } from "@/lib/data/books";

const mockBooks: BookListItem[] = [
  {
    id: 1,
    title: "First Book",
    author: "Author A",
    isbn13: "9781111111111",
    isbn10: null,
    publicationDate: new Date(2020, 0, 1),
    publicationSortKey: "2020-01",
    distRoyaltyRate: 10,
    handSoldRoyaltyRate: 5,
    coverPrice: 19.99,
    printCost: 4.5,
    totalSales: 0,
    seriesName: null,
    seriesOrder: null,
  },
  {
    id: 2,
    title: "Second Book",
    author: "Author B",
    isbn13: "9782222222222",
    isbn10: null,
    publicationDate: new Date(2020, 0, 1),
    publicationSortKey: "2020-01",
    distRoyaltyRate: 15,
    handSoldRoyaltyRate: 8,
    coverPrice: 14.99,
    printCost: 3.5,
    totalSales: 0,
    seriesName: null,
    seriesOrder: null,
  },
];

describe("useBookSelection", () => {
  it("shows 'Select Book' when no book is selected", () => {
    const onBookChange = vi.fn();
    const { result } = renderHook(() =>
      useBookSelection(mockBooks, "", onBookChange)
    );
    expect(result.current.bookDisplayValue).toBe("Select Book");
  });

  it("shows title and author when a book is selected", () => {
    const onBookChange = vi.fn();
    const { result } = renderHook(() =>
      useBookSelection(mockBooks, "1", onBookChange)
    );
    expect(result.current.bookDisplayValue).toBe("First Book - Author A");
  });

  it("calls onBookChange and closes popover on handleBookSelect", () => {
    const onBookChange = vi.fn();
    const { result } = renderHook(() =>
      useBookSelection(mockBooks, "1", onBookChange)
    );
    act(() => {
      result.current.setOpen(true);
    });
    expect(result.current.open).toBe(true);
    act(() => {
      result.current.handleBookSelect("2");
    });
    expect(onBookChange).toHaveBeenCalledWith("2");
    expect(result.current.open).toBe(false);
  });
});
