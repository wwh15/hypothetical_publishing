/**
 * Fully manual deterministic seed for manual testing (docs/MANUAL_TEST_PLAN.md).
 * Every author, series, book, and sale is created explicitly so test steps can
 * say exactly which row to click (e.g. "Click the book No-Sales Book" or
 * "Click the sale for Ingram Test Book, January 2025, Distributor, Paid").
 *
 * Order: clear → authors → series → books → sales.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

/** ISBN-13 for Ingram CSV import tests; book title "Ingram Test Book". */
const INGRAM_TEST_ISBN13 = "9780599999999";

async function main() {
  console.log("🌱 Starting manual seed...");

  await prisma.sale.deleteMany();
  await prisma.book.deleteMany();
  await prisma.series.deleteMany();
  await prisma.author.deleteMany();

  // ─── AUTHORS ─────────────────────────────────────────────────────────────
  const testAuthor = await prisma.author.create({
    data: { name: "Test Author", email: "test.author@example.com" },
  });
  const orphanAuthor = await prisma.author.create({
    data: { name: "Orphan Author", email: "orphan.author@example.com" },
  });
  const alice = await prisma.author.create({
    data: { name: "Alice Johnson", email: "alice.johnson@example.com" },
  });
  const bob = await prisma.author.create({
    data: { name: "Bob Smith", email: "bob.smith@example.com" },
  });
  const carol = await prisma.author.create({
    data: { name: "Carol Williams", email: "carol.williams@example.com" },
  });
  console.log("✅ Authors: Test Author, Orphan Author, Alice Johnson, Bob Smith, Carol Williams.");

  // ─── SERIES ──────────────────────────────────────────────────────────────
  const starshipSaga = await prisma.series.create({
    data: { name: "Starship Saga", description: "Space opera series." },
  });
  const mysteryHollow = await prisma.series.create({
    data: { name: "Mystery Hollow", description: "Cozy mystery series." },
  });
  console.log("✅ Series: Starship Saga, Mystery Hollow.");

  // ─── BOOKS ───────────────────────────────────────────────────────────────
  const ingramTestBook = await prisma.book.create({
    data: {
      title: "Ingram Test Book",
      authorId: testAuthor.id,
      isbn13: INGRAM_TEST_ISBN13,
      isbn10: "0599999999",
      distAuthorRoyaltyRate: 0.5,
      handSoldAuthorRoyaltyRate: 0.2,
      coverPrice: new Decimal("19.99"),
      printCost: new Decimal("4.50"),
      publicationDate: new Date(2024, 0, 1),
      seriesId: null,
      seriesOrder: null,
    },
  });

  const noSalesBook = await prisma.book.create({
    data: {
      title: "No-Sales Book",
      authorId: testAuthor.id,
      isbn13: "9780599888888",
      distAuthorRoyaltyRate: 0.5,
      handSoldAuthorRoyaltyRate: 0.2,
      coverPrice: new Decimal("14.99"),
      printCost: new Decimal("3.00"),
      publicationDate: new Date(2024, 5, 1),
      seriesId: null,
      seriesOrder: null,
    },
  });

  const starshipDawn = await prisma.book.create({
    data: {
      title: "Starship Dawn",
      authorId: testAuthor.id,
      isbn13: "9781111111111",
      distAuthorRoyaltyRate: 0.5,
      handSoldAuthorRoyaltyRate: 0.2,
      coverPrice: new Decimal("24.99"),
      printCost: new Decimal("5.00"),
      publicationDate: new Date(2023, 0, 1),
      seriesId: starshipSaga.id,
      seriesOrder: 1,
    },
  });

  const starshipExodus = await prisma.book.create({
    data: {
      title: "Starship Exodus",
      authorId: testAuthor.id,
      isbn13: "9781111111112",
      distAuthorRoyaltyRate: 0.5,
      handSoldAuthorRoyaltyRate: 0.2,
      coverPrice: new Decimal("24.99"),
      printCost: new Decimal("5.00"),
      publicationDate: new Date(2024, 2, 1),
      seriesId: starshipSaga.id,
      seriesOrder: 2,
    },
  });

  const mysteryAtHollow = await prisma.book.create({
    data: {
      title: "Mystery at the Hollow",
      authorId: alice.id,
      isbn13: "9782222222221",
      distAuthorRoyaltyRate: 0.5,
      handSoldAuthorRoyaltyRate: 0.2,
      coverPrice: new Decimal("16.99"),
      printCost: new Decimal("3.50"),
      publicationDate: new Date(2023, 8, 1),
      seriesId: mysteryHollow.id,
      seriesOrder: 1,
    },
  });

  const standaloneOne = await prisma.book.create({
    data: {
      title: "Standalone One",
      authorId: bob.id,
      isbn13: "9783333333331",
      distAuthorRoyaltyRate: 0.5,
      handSoldAuthorRoyaltyRate: 0.2,
      coverPrice: new Decimal("15.99"),
      printCost: new Decimal("4.00"),
      publicationDate: new Date(2024, 1, 1),
      seriesId: null,
      seriesOrder: null,
    },
  });

  const archiveVol1 = await prisma.book.create({
    data: {
      title: "Archive Vol 1",
      authorId: carol.id,
      isbn13: "9784444444441",
      distAuthorRoyaltyRate: 0.5,
      handSoldAuthorRoyaltyRate: 0.2,
      coverPrice: new Decimal("18.99"),
      printCost: new Decimal("4.50"),
      publicationDate: new Date(2023, 4, 1),
      seriesId: null,
      seriesOrder: null,
    },
  });

  const legacyVol1 = await prisma.book.create({
    data: {
      title: "Legacy Vol 1",
      authorId: alice.id,
      isbn13: "9785555555551",
      distAuthorRoyaltyRate: 0.5,
      handSoldAuthorRoyaltyRate: 0.2,
      coverPrice: new Decimal("20.99"),
      printCost: new Decimal("5.00"),
      publicationDate: new Date(2023, 6, 1),
      seriesId: null,
      seriesOrder: null,
    },
  });

  const perspectiveVol1 = await prisma.book.create({
    data: {
      title: "Perspective Vol 1",
      authorId: bob.id,
      isbn13: "9786666666661",
      distAuthorRoyaltyRate: 0.5,
      handSoldAuthorRoyaltyRate: 0.2,
      coverPrice: new Decimal("17.99"),
      printCost: new Decimal("4.00"),
      publicationDate: new Date(2024, 0, 1),
      seriesId: null,
      seriesOrder: null,
    },
  });

  const chronicleVol1 = await prisma.book.create({
    data: {
      title: "Chronicle Vol 1",
      authorId: carol.id,
      isbn13: "9787777777771",
      distAuthorRoyaltyRate: 0.5,
      handSoldAuthorRoyaltyRate: 0.2,
      coverPrice: new Decimal("21.99"),
      printCost: new Decimal("5.50"),
      publicationDate: new Date(2023, 10, 1),
      seriesId: null,
      seriesOrder: null,
    },
  });

  // Extra books for pagination testing (21 total; default page size often 20)
  const paginationBooks = [
    { title: "Pagination Book 11", isbn: "978888880001", authorId: testAuthor.id, year: 2023, month: 0 },
    { title: "Pagination Book 12", isbn: "978888880002", authorId: alice.id, year: 2023, month: 1 },
    { title: "Pagination Book 13", isbn: "978888880003", authorId: bob.id, year: 2023, month: 2 },
    { title: "Pagination Book 14", isbn: "978888880004", authorId: carol.id, year: 2023, month: 3 },
    { title: "Pagination Book 15", isbn: "978888880005", authorId: testAuthor.id, year: 2023, month: 4 },
    { title: "Pagination Book 16", isbn: "978888880006", authorId: alice.id, year: 2023, month: 5 },
    { title: "Pagination Book 17", isbn: "978888880007", authorId: bob.id, year: 2023, month: 6 },
    { title: "Pagination Book 18", isbn: "978888880008", authorId: carol.id, year: 2023, month: 7 },
    { title: "Pagination Book 19", isbn: "978888880009", authorId: testAuthor.id, year: 2023, month: 8 },
    { title: "Pagination Book 20", isbn: "978888880010", authorId: alice.id, year: 2023, month: 9 },
    { title: "Pagination Book 21", isbn: "978888880011", authorId: bob.id, year: 2023, month: 10 },
  ];
  for (const b of paginationBooks) {
    await prisma.book.create({
      data: {
        title: b.title,
        authorId: b.authorId,
        isbn13: b.isbn,
        distAuthorRoyaltyRate: 0.5,
        handSoldAuthorRoyaltyRate: 0.2,
        coverPrice: new Decimal("18.99"),
        printCost: new Decimal("4.00"),
        publicationDate: new Date(b.year, b.month, 1),
        seriesId: null,
        seriesOrder: null,
      },
    });
  }

  console.log("✅ Books: 21 total (10 named + Pagination Book 11–21 for pagination testing).");

  // ─── SALES (each one explicit for test-plan references) ───────────────────

  // Ingram Test Book: 2 sales — one distributor/paid, one handsold/unpaid
  await prisma.sale.create({
    data: {
      bookId: ingramTestBook.id,
      date: new Date(2025, 0, 1),
      quantity: 10,
      publisherRevenue: new Decimal("125.50"),
      authorRoyalty: new Decimal("62.75"),
      source: "DISTRIBUTOR",
      paid: true,
      comment: "Bulk order from bookstore.",
    },
  });
  await prisma.sale.create({
    data: {
      bookId: ingramTestBook.id,
      date: new Date(2025, 1, 1),
      quantity: 5,
      publisherRevenue: new Decimal("77.45"), // (19.99 - 4.50) * 5
      authorRoyalty: new Decimal("15.49"),   // 77.45 * 0.2
      source: "HAND_SOLD",
      paid: false,
      comment: "Convention table.",
    },
  });

  // Starship Dawn: 3 sales — mix of distributor/handsold, paid/unpaid
  await prisma.sale.create({
    data: {
      bookId: starshipDawn.id,
      date: new Date(2025, 0, 1),
      quantity: 20,
      publisherRevenue: new Decimal("180.00"),
      authorRoyalty: new Decimal("90.00"),
      source: "DISTRIBUTOR",
      paid: true,
      comment: "Online promotion.",
    },
  });
  await prisma.sale.create({
    data: {
      bookId: starshipDawn.id,
      date: new Date(2025, 1, 1),
      quantity: 8,
      publisherRevenue: new Decimal("159.92"), // (24.99 - 5) * 8
      authorRoyalty: new Decimal("31.98"),
      source: "HAND_SOLD",
      paid: false,
      comment: "Conference giveaway.",
    },
  });
  await prisma.sale.create({
    data: {
      bookId: starshipDawn.id,
      date: new Date(2025, 2, 1),
      quantity: 15,
      publisherRevenue: new Decimal("112.50"),
      authorRoyalty: new Decimal("56.25"),
      source: "DISTRIBUTOR",
      paid: false,
      comment: "Backorder fulfilled.",
    },
  });

  // Starship Exodus: 1 sale
  await prisma.sale.create({
    data: {
      bookId: starshipExodus.id,
      date: new Date(2025, 1, 1),
      quantity: 12,
      publisherRevenue: new Decimal("150.00"),
      authorRoyalty: new Decimal("75.00"),
      source: "DISTRIBUTOR",
      paid: false,
      comment: null,
    },
  });

  // Mystery at the Hollow: 2 sales
  await prisma.sale.create({
    data: {
      bookId: mysteryAtHollow.id,
      date: new Date(2024, 10, 1),
      quantity: 7,
      publisherRevenue: new Decimal("85.00"),
      authorRoyalty: new Decimal("42.50"),
      source: "DISTRIBUTOR",
      paid: true,
      comment: "Holiday sale.",
    },
  });
  await prisma.sale.create({
    data: {
      bookId: mysteryAtHollow.id,
      date: new Date(2025, 0, 1),
      quantity: 4,
      publisherRevenue: new Decimal("53.96"), // (16.99 - 3.50) * 4
      authorRoyalty: new Decimal("10.79"),
      source: "HAND_SOLD",
      paid: false,
      comment: null,
    },
  });

  // Standalone One: 1 sale
  await prisma.sale.create({
    data: {
      bookId: standaloneOne.id,
      date: new Date(2024, 11, 1),
      quantity: 6,
      publisherRevenue: new Decimal("72.00"),
      authorRoyalty: new Decimal("36.00"),
      source: "DISTRIBUTOR",
      paid: false,
      comment: null,
    },
  });

  // Archive Vol 1: 1 sale
  await prisma.sale.create({
    data: {
      bookId: archiveVol1.id,
      date: new Date(2024, 8, 1),
      quantity: 9,
      publisherRevenue: new Decimal("130.00"),
      authorRoyalty: new Decimal("65.00"),
      source: "DISTRIBUTOR",
      paid: true,
      comment: null,
    },
  });

  // Legacy Vol 1: 1 sale
  await prisma.sale.create({
    data: {
      bookId: legacyVol1.id,
      date: new Date(2024, 6, 1),
      quantity: 3,
      publisherRevenue: new Decimal("45.00"),
      authorRoyalty: new Decimal("22.50"),
      source: "DISTRIBUTOR",
      paid: false,
      comment: null,
    },
  });

  // Perspective Vol 1: 1 sale
  await prisma.sale.create({
    data: {
      bookId: perspectiveVol1.id,
      date: new Date(2025, 0, 1),
      quantity: 11,
      publisherRevenue: new Decimal("99.00"),
      authorRoyalty: new Decimal("49.50"),
      source: "DISTRIBUTOR",
      paid: false,
      comment: null,
    },
  });

  // Chronicle Vol 1: 1 sale
  await prisma.sale.create({
    data: {
      bookId: chronicleVol1.id,
      date: new Date(2024, 9, 1),
      quantity: 5,
      publisherRevenue: new Decimal("82.50"),
      authorRoyalty: new Decimal("41.25"),
      source: "DISTRIBUTOR",
      paid: true,
      comment: null,
    },
  });

  // No-Sales Book: zero sales (do not create any)

  console.log("✅ Sales: 15 records total. Ingram Test Book (2), Starship Dawn (3), Starship Exodus (1), Mystery at the Hollow (2), Standalone One (1), Archive/Legacy/Perspective/Chronicle (1 each). No-Sales Book has 0.");
  console.log("🏁 Manual seed complete. See docs/MANUAL_TEST_PLAN.md for which book/sale to click in each step.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
