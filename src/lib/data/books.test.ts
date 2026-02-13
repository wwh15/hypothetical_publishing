import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBooksData } from "./books";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    book: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockFindMany = vi.mocked(prisma.book.findMany);
const mockCount = vi.mocked(prisma.book.count);

describe("getBooksData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated items and total from prisma", async () => {
    const mockBooks = [
      {
        id: 1,
        title: "Test Book",
        isbn13: "9781234567890",
        isbn10: "1234567890",
        publicationDate: new Date(2020, 5, 1), // June 2020
        authorRoyaltyRate: 0.1,
        author: { name: "Author One" },
        sales: [{ quantity: 5 }],
      },
    ];
    mockFindMany.mockResolvedValue(mockBooks as never);
    mockCount.mockResolvedValue(1);

    const result = await getBooksData({ search: "", page: 1, pageSize: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 1,
      title: "Test Book",
      author: "Author One",
      isbn13: "9781234567890",
      isbn10: "1234567890",
      publicationDate: new Date(2020, 5, 1),
      publicationSortKey: "2020-06",
      defaultRoyaltyRate: 10,
      totalSales: 5,
    });
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("uses page and pageSize for skip/take", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(50);

    await getBooksData({ page: 3, pageSize: 10 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      })
    );
  });
});
