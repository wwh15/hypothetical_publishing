import "dotenv/config";
import { PrismaClient, Author, SaleSource } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getCanonicalAuthorKey } from "@/lib/data/author";
import { normalizeEmail, normalizeString } from "@/lib/validation";
// Using relative paths to ensure tsx resolves them correctly

const prisma = new PrismaClient();
const INGRAM_TEST_ISBN13 = "9780599999999";

interface SaleInput {
  bookId: number;
  qty: number;
  rev: number;
  roy: number;
  src: SaleSource; 
  paid: boolean;
  date: Date;
}

async function main() {
  console.log("🌱 Starting manual seed with updated schema...");

  // 0. Clear Database (Correct order for foreign keys)
  await prisma.sale.deleteMany();
  await prisma.book.deleteMany();
  await prisma.series.deleteMany();
  await prisma.author.deleteMany();
  await prisma.user.deleteMany();

  // ─── 1. AUTHORS ────────────────────────────────────────────────────────
  const authorsToCreate = [
    { name: "Test Author", email: "test.author@example.com" },
    { name: "Orphan Author", email: "orphan.author@example.com" },
    { name: "George R. R. Martin", email: "george.martin@example.com" },
    { name: "Johnson, Alice and Nikel, Martin", email: "alice.johnson@example.com" },
    { name: "Dr. Bob Smith", email: "bob.smith@example.com" },
    { name: "Carol Williams, Larry Allen", email: "carol.williams@example.com" },
    { name: "Brandon Sanderson", email: "brandon@sanderson.com" },
    { name: "N.K. Jemisin", email: "nk@jemisin.com" },
  ];

  const authorMap: Record<string, Author> = {};

  for (const author of authorsToCreate) {
    const fingerprint = getCanonicalAuthorKey(author.name);
    const savedAuthor = await prisma.author.upsert({
      where: { canonicalName: fingerprint },
      update: {},
      create: {
        name: normalizeString(author.name),
        email: normalizeEmail(author.email),
        canonicalName: fingerprint,
      },
    });
    authorMap[author.name] = savedAuthor;
  }
  console.log("✅ Authors Created.");

  // ─── 2. SERIES ─────────────────────────────────────────────────────────
  const starshipSaga = await prisma.series.create({
    data: { name: "Starship Saga", description: "Space opera series." },
  });
  const brokenEarth = await prisma.series.create({
    data: { name: "The Broken Earth", description: "High fantasy trilogy." },
  });

  // ─── 3. BOOKS ──────────────────────────────────────────────────────────
  // Note: All books now include printCost as required by your schema
  
  const ingramBook = await prisma.book.create({
    data: {
      title: "Ingram Test Book",
      authorId: authorMap["Test Author"].id,
      isbn13: INGRAM_TEST_ISBN13,
      isbn10: "0599999999",
      distAuthorRoyaltyRate: 0.5,
      handSoldAuthorRoyaltyRate: 0.2,
      coverPrice: new Decimal("19.99"),
      printCost: new Decimal("4.50"),
      publicationDate: new Date(2024, 0, 1),
    },
  });

  const starship1 = await prisma.book.create({
    data: {
      title: "Starship Dawn",
      authorId: authorMap["Test Author"].id,
      isbn13: "9781111111111",
      distAuthorRoyaltyRate: 0.5,
      handSoldAuthorRoyaltyRate: 0.2,
      coverPrice: new Decimal("24.99"),
      printCost: new Decimal("5.00"),
      seriesId: starshipSaga.id,
      seriesOrder: 1,
      publicationDate: new Date(2025, 3, 11)
    },
  });

  const fifthSeason = await prisma.book.create({
    data: {
      title: "The Fifth Season",
      authorId: authorMap["N.K. Jemisin"].id,
      isbn13: "9780316229296",
      distAuthorRoyaltyRate: 0.15,
      handSoldAuthorRoyaltyRate: 0.1,
      coverPrice: new Decimal("16.99"),
      printCost: new Decimal("3.50"),
      seriesId: brokenEarth.id,
      seriesOrder: 1,
      publicationDate: new Date(2026, 3, 11)
    },
  });

  const collabBook = await prisma.book.create({
    data: {
      title: "The Collaborative Novel",
      authorId: authorMap["Johnson, Alice and Nikel, Martin"].id,
      isbn13: "9782222222221",
      distAuthorRoyaltyRate: 0.5,
      handSoldAuthorRoyaltyRate: 0.2,
      coverPrice: new Decimal("20.00"),
      printCost: new Decimal("5.00"),
      publicationDate: new Date(2025, 4, 9)
    },
  });

  // ─── 4. SALES ──────────────────────────────────────────────────────────
  const salesToCreate: SaleInput[] = [
    { bookId: ingramBook.id, qty: 50, rev: 500.00, roy: 250.00, src: SaleSource.DISTRIBUTOR, paid: true, date: new Date(2025, 0, 1) },
    { bookId: collabBook.id, qty: 30, rev: 450.00, roy: 225.00, src: SaleSource.DISTRIBUTOR, paid: false, date: new Date(2025, 1, 20) },
    { bookId: fifthSeason.id, qty: 10, rev: 134.90, roy: 20.24, src: SaleSource.DISTRIBUTOR, paid: true, date: new Date(2025, 0, 5) },
  ];

  for (const s of salesToCreate) {
    await prisma.sale.create({
      data: {
        bookId: s.bookId,
        date: s.date,
        quantity: s.qty,
        publisherRevenue: new Decimal(s.rev),
        authorRoyalty: new Decimal(s.roy),
        source: s.src, 
        paid: s.paid,
      },
    });
  }

  // ─── 5. PAGINATION DUMMY BOOKS ─────────────────────────────────────────
  for (let i = 1; i <= 25; i++) {
    await prisma.book.create({
      data: {
        title: `Pagination Test Vol ${i}`,
        authorId: authorMap["Test Author"].id,
        isbn13: `9789999999${i.toString().padStart(3, '0')}`,
        distAuthorRoyaltyRate: 0.1,
        coverPrice: new Decimal("15.00"),
        printCost: new Decimal("3.00"),
        publicationDate: new Date(2026, 1, (i % 28) + 1),
      },
    });
  }

  console.log("🏁 Seed Complete. Database is ready for testing.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });