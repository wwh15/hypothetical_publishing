import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBook, updateBook, deleteBook } from "./books";

const mockTransaction = vi.fn();
const mockBookFindUnique = vi.fn();
const mockBookDelete = vi.fn();

vi.mock("../prisma", () => ({
  prisma: {
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
    book: {
      findUnique: (args: unknown) => mockBookFindUnique(args),
      create: vi.fn(),
      update: vi.fn(),
      delete: (args: unknown) => mockBookDelete(args),
    },
  },
}));

describe("books data layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createBook", () => {
    it("returns error when authors string is empty", async () => {
      const result = await createBook({
        title: "A Book",
        authors: "",
      });
      expect(result).toEqual({
        success: false,
        error: "At least one author is required",
      });
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it("returns error when authors string is only commas/whitespace", async () => {
      const result = await createBook({
        title: "A Book",
        authors: "  ,  , ",
      });
      expect(result).toEqual({
        success: false,
        error: "At least one author is required",
      });
    });

    it("returns success and bookId when transaction succeeds", async () => {
      const createdBook = { id: 5, title: "New Book", authors: [] };
      mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const mockTx = {
          author: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: 1 }),
          },
          book: {
            create: vi.fn().mockResolvedValue(createdBook),
          },
        };
        return fn(mockTx);
      });

      const result = await createBook({
        title: "New Book",
        authors: "Jane Doe",
      });
      expect(result).toEqual({ success: true, bookId: 5 });
      expect(mockTransaction).toHaveBeenCalled();
    });

    it("returns ISBN duplicate error on P2002", async () => {
      const prismaError = new Error("Unique constraint failed");
      (prismaError as Error & { code?: string }).code = "P2002";
      (prismaError as Error & { meta?: { target?: string[] } }).meta = {
        target: ["isbn13"],
      };
      mockTransaction.mockRejectedValue(prismaError);

      const result = await createBook({
        title: "Duplicate",
        authors: "Author",
        isbn13: "9780123456789",
      });
      expect(result).toEqual({
        success: false,
        error: "A book with this ISBN-13 already exists",
      });
    });
  });

  describe("updateBook", () => {
    it("returns error when book not found", async () => {
      mockBookFindUnique.mockResolvedValue(null);

      const result = await updateBook({
        id: 999,
        title: "Updated",
      });
      expect(result).toEqual({
        success: false,
        error: "Book not found",
      });
      expect(mockBookFindUnique).toHaveBeenCalledWith({
        where: { id: 999 },
        include: { authors: true },
      });
    });

    it("returns error when authors provided but empty", async () => {
      mockBookFindUnique.mockResolvedValue({
        id: 1,
        title: "Existing",
        authors: [{ id: 1, name: "Author" }],
      });

      const result = await updateBook({
        id: 1,
        authors: "  , ",
      });
      expect(result).toEqual({
        success: false,
        error: "At least one author is required",
      });
    });
  });

  describe("deleteBook", () => {
    it("returns error when book not found", async () => {
      mockBookFindUnique.mockResolvedValue(null);

      const result = await deleteBook(999);
      expect(result).toEqual({
        success: false,
        error: "Book not found",
      });
    });

    it("returns error when book has sales records", async () => {
      mockBookFindUnique.mockResolvedValue({
        id: 1,
        sales: [{ id: 1 }],
      });

      const result = await deleteBook(1);
      expect(result).toEqual({
        success: false,
        error:
          "Cannot delete book with existing sales records. Please delete or reassign sales records first.",
      });
      expect(mockBookDelete).not.toHaveBeenCalled();
    });

    it("deletes book when no sales", async () => {
      mockBookFindUnique.mockResolvedValue({
        id: 1,
        sales: [],
      });
      mockBookDelete.mockResolvedValue(undefined);

      const result = await deleteBook(1);
      expect(result).toEqual({ success: true });
      expect(mockBookDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});
