import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBookSelection } from "./useBookSelection";
import type { BookListItem } from "@/lib/data/books";

const mockBooks: BookListItem[] = [
  {
    id: 1,
    title: "First Book",
    authors: "Author A",
    isbn13: null,
    isbn10: null,
    publicationDate: null,
    publicationSortKey: "9999-99",
    defaultRoyaltyRate: 10,
    totalSales: 0,
  },
  {
    id: 2,
    title: "Second Book",
    authors: "Author B",
    isbn13: null,
    isbn10: null,
    publicationDate: null,
    publicationSortKey: "9999-99",
    defaultRoyaltyRate: 15,
    totalSales: 0,
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

  it("shows title and authors when a book is selected", () => {
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
