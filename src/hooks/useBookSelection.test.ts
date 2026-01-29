import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBookSelection } from "./useBookSelection";

const mockBooks = [
  { id: 1, title: "The Great Gatsby", author: { name: "F. Scott Fitzgerald" } },
  { id: 2, title: "1984", author: { name: "George Orwell" } },
];

describe("useBookSelection", () => {
  it("returns default display value when no book is selected", () => {
    const onBookChange = vi.fn();
    const { result } = renderHook(() =>
      useBookSelection(mockBooks, "", onBookChange)
    );
    expect(result.current.bookDisplayValue).toBe("Select Book");
    expect(result.current.open).toBe(false);
  });

  it("returns display value for selected book", () => {
    const onBookChange = vi.fn();
    const { result } = renderHook(() =>
      useBookSelection(mockBooks, "1", onBookChange)
    );
    expect(result.current.bookDisplayValue).toBe(
      "The Great Gatsby - F. Scott Fitzgerald"
    );
  });

  it("calls onBookChange and closes when handleBookSelect is called", () => {
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

  it("handles invalid selectedBookId (NaN) as no selection", () => {
    const onBookChange = vi.fn();
    const { result } = renderHook(() =>
      useBookSelection(mockBooks, "not-a-number", onBookChange)
    );
    expect(result.current.bookDisplayValue).toBe("Select Book");
  });
});
