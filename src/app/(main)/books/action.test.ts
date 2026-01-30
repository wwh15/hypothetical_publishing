import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchBookFromOpenLibrary } from "./action";

describe("fetchBookFromOpenLibrary", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns error for invalid ISBN length", async () => {
    const result = await fetchBookFromOpenLibrary("123");
    expect(result).toEqual({
      success: false,
      error: "Please enter a valid ISBN-10 or ISBN-13",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns error when Open Library returns 404", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as Response);

    const result = await fetchBookFromOpenLibrary("9780000000000");
    expect(result).toEqual({
      success: false,
      error: "Book not found in Open Library database",
    });
  });

  it("returns book data on success", async () => {
    // First fetch: book by ISBN; second fetch: author by key
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            title: "Test Title",
            authors: [{ key: "/authors/OL1A" }],
            isbn_13: ["9781234567890"],
            isbn_10: ["1234567890"],
            publish_date: "2020",
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: "Test Author" }),
      } as Response);

    const result = await fetchBookFromOpenLibrary("9781234567890");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Test Title");
      expect(result.data.authors).toBe("Test Author");
    }
  });

  it("normalizes ISBN by stripping dashes and spaces", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ title: "Dashed ISBN" }),
    } as Response);

    await fetchBookFromOpenLibrary("978-12-345678-90");
    expect(fetch).toHaveBeenCalledWith(
      "https://openlibrary.org/isbn/9781234567890.json",
      expect.any(Object)
    );
  });
});
