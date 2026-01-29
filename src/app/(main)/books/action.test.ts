import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchBookFromOpenLibrary,
  createBook,
  updateBook,
  deleteBook,
  getBooksData,
  getBookById,
} from "./action";

// Mock next/cache and next/navigation so server actions don't throw
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const mockCreateBookInDb = vi.fn();
const mockUpdateBookInDb = vi.fn();
const mockDeleteBookInDb = vi.fn();
const mockGetBooksDataFromDb = vi.fn();
const mockGetBookByIdFromDb = vi.fn();

vi.mock("@/lib/data/books", () => ({
  getBooksData: (opts: unknown) => mockGetBooksDataFromDb(opts),
  getBookById: (id: number) => mockGetBookByIdFromDb(id),
  createBook: (input: unknown) => mockCreateBookInDb(input),
  updateBook: (input: unknown) => mockUpdateBookInDb(input),
  deleteBook: (id: number) => mockDeleteBookInDb(id),
}));

describe("books actions", () => {
  describe("getBooksData", () => {
    beforeEach(() => {
      mockGetBooksDataFromDb.mockReset();
      mockGetBooksDataFromDb.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });
    });

    it("forwards search, page, pageSize to data layer", async () => {
      await getBooksData({
        search: "gatsby",
        page: 2,
        pageSize: 10,
      });
      expect(mockGetBooksDataFromDb).toHaveBeenCalledWith({
        search: "gatsby",
        page: 2,
        pageSize: 10,
      });
    });
  });

  describe("getBookById", () => {
    beforeEach(() => {
      mockGetBookByIdFromDb.mockReset();
    });

    it("returns book when found", async () => {
      const book = { id: 1, title: "Test Book", authors: "Author" };
      mockGetBookByIdFromDb.mockResolvedValue(book);
      const result = await getBookById(1);
      expect(mockGetBookByIdFromDb).toHaveBeenCalledWith(1);
      expect(result).toEqual(book);
    });

    it("returns null when not found", async () => {
      mockGetBookByIdFromDb.mockResolvedValue(null);
      const result = await getBookById(999);
      expect(result).toBeNull();
    });
  });

  describe("fetchBookFromOpenLibrary", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
      vi.stubGlobal("fetch", originalFetch);
    });

    it("returns error for invalid ISBN (too short)", async () => {
      const result = await fetchBookFromOpenLibrary("123");
      expect(result).toEqual({
        success: false,
        error: "Please enter a valid ISBN-10 or ISBN-13",
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    it("returns error for invalid ISBN (wrong length)", async () => {
      const result = await fetchBookFromOpenLibrary("12345678901"); // 11 digits
      expect(result).toEqual({
        success: false,
        error: "Please enter a valid ISBN-10 or ISBN-13",
      });
    });

    it("accepts ISBN-10 and fetches from Open Library", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: "Test Book",
          authors: [{ key: "/authors/OL123A" }],
          isbn_10: ["0123456789"],
          isbn_13: ["9780123456789"],
          publish_date: "2020",
        }),
      });
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: "Test Author" }),
      });

      const result = await fetchBookFromOpenLibrary("0123456789");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Test Book");
        expect(result.data.authors).toBe("Test Author");
        expect(result.data.isbn10).toBe("0123456789");
        expect(result.data.publicationYear).toBe(2020);
      }
    });

    it("accepts ISBN with dashes and normalizes", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: "Dashed ISBN Book",
          authors: [],
          publish_date: "2019",
        }),
      });

      const result = await fetchBookFromOpenLibrary("978-0-12-345678-9");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Dashed ISBN Book");
      }
      expect(fetch).toHaveBeenCalledWith(
        "https://openlibrary.org/isbn/9780123456789.json",
        expect.any(Object)
      );
    });

    it("returns error when book not found (404)", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await fetchBookFromOpenLibrary("0000000000");
      expect(result).toEqual({
        success: false,
        error: "Book not found in Open Library database",
      });
    });

    it("returns error when response has no title", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authors: [] }),
      });

      const result = await fetchBookFromOpenLibrary("0123456789");
      expect(result).toEqual({
        success: false,
        error: "Book data incomplete: title not found",
      });
    });
  });

  describe("createBook", () => {
    beforeEach(() => {
      mockCreateBookInDb.mockReset();
    });

    it("returns success and revalidates when data layer succeeds", async () => {
      mockCreateBookInDb.mockResolvedValue({ success: true, bookId: 42 });
      const result = await createBook({
        title: "New Book",
        authors: "Author One",
      });
      expect(result).toEqual({ success: true, bookId: 42 });
      expect(mockCreateBookInDb).toHaveBeenCalledWith({
        title: "New Book",
        authors: "Author One",
      });
    });

    it("returns error when data layer fails", async () => {
      mockCreateBookInDb.mockResolvedValue({
        success: false,
        error: "At least one author is required",
      });
      const result = await createBook({
        title: "No Author",
        authors: "",
      });
      expect(result).toEqual({
        success: false,
        error: "At least one author is required",
      });
    });
  });

  describe("updateBook", () => {
    beforeEach(() => {
      mockUpdateBookInDb.mockReset();
    });

    it("returns success when data layer succeeds", async () => {
      mockUpdateBookInDb.mockResolvedValue({ success: true, bookId: 1 });
      const result = await updateBook({
        id: 1,
        title: "Updated Title",
      });
      expect(result).toEqual({ success: true, bookId: 1 });
      expect(mockUpdateBookInDb).toHaveBeenCalledWith({
        id: 1,
        title: "Updated Title",
      });
    });

    it("returns error when book not found", async () => {
      mockUpdateBookInDb.mockResolvedValue({
        success: false,
        error: "Book not found",
      });
      const result = await updateBook({ id: 999, title: "Ghost" });
      expect(result).toEqual({ success: false, error: "Book not found" });
    });
  });

  describe("deleteBook", () => {
    beforeEach(() => {
      mockDeleteBookInDb.mockReset();
    });

    it("returns success when data layer deletes", async () => {
      mockDeleteBookInDb.mockResolvedValue({ success: true });
      const result = await deleteBook(1);
      expect(result).toEqual({ success: true });
      expect(mockDeleteBookInDb).toHaveBeenCalledWith(1);
    });

    it("returns error when book has sales", async () => {
      mockDeleteBookInDb.mockResolvedValue({
        success: false,
        error:
          "Cannot delete book with existing sales records. Please delete or reassign sales records first.",
      });
      const result = await deleteBook(1);
      expect(result.success).toBe(false);
      expect((result as { error: string }).error).toContain("sales records");
    });
  });
});
