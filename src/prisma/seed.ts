/**
 * Seed from ev2-sample-data for review session.
 * Loads books.csv and sales_records.csv, creates authors, series, books, and sales.
 * Order: clear → authors → series → books → sales.
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

const MONTH_NAMES: Record<string, number> = {
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11,
};

function parseMonthYear(str: string): Date {
  const trimmed = str.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) throw new Error(`Invalid month/year: ${str}`);
  const monthStr = parts[0];
  const year = parseInt(parts[1], 10);
  const month = MONTH_NAMES[monthStr];
  if (month === undefined || !Number.isFinite(year)) throw new Error(`Invalid month/year: ${str}`);
  return new Date(Date.UTC(year, month, 1));
}

/** Simple canonical author key for upsert: lowercase, alphanumeric + spaces, collapsed. */
function seedCanonicalName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

interface BooksRow {
  title: string;
  author: string;
  series_name: string;
  series_index: string;
  isbn13: string;
  isbn10: string;
  publication_month_year: string;
  distribution_royalty_percent: string;
  hand_sold_royalty_percent: string;
  cover_price: string;
  print_cost: string;
  cover_image: string;
}

interface SalesRow {
  isbn13: string;
  source: string;
  record_month_year: string;
  units_sold: string;
  total_revenue: string;
  royalty_paid: string;
  comment: string;
}

async function main() {
  console.log("🌱 Starting seed from ev2-sample-data...");

  const dataDir = path.join(process.cwd(), "ev2-sample-data");
  const booksPath = path.join(dataDir, "books.csv");
  const salesPath = path.join(dataDir, "sales_records.csv");

  if (!fs.existsSync(booksPath) || !fs.existsSync(salesPath)) {
    throw new Error("ev2-sample-data/books.csv and ev2-sample-data/sales_records.csv must exist");
  }

  const booksCsv = fs.readFileSync(booksPath, "utf-8");
  const salesCsv = fs.readFileSync(salesPath, "utf-8");

  const booksResult = Papa.parse<BooksRow>(booksCsv, { header: true, skipEmptyLines: true });
  const salesResult = Papa.parse<SalesRow>(salesCsv, { header: true, skipEmptyLines: true });

  const booksRows = booksResult.data.filter((r) => r.isbn13?.trim());
  const salesRows = salesResult.data.filter((r) => r.isbn13?.trim() && r.record_month_year?.trim());

  await prisma.sale.deleteMany();
  await prisma.book.deleteMany();
  await prisma.series.deleteMany();
  await prisma.author.deleteMany();
  await prisma.user.deleteMany();

  // ─── AUTHORS (unique by name from books) ───
  const authorNames = [...new Set(booksRows.map((r) => r.author.trim()).filter(Boolean))];
  const authorMap: Record<string, { id: number }> = {};
  for (const name of authorNames) {
    const canonicalName = seedCanonicalName(name);
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`;
    const author = await prisma.author.upsert({
      where: { canonicalName },
      update: {},
      create: { name, email, canonicalName },
    });
    authorMap[name] = { id: author.id };
  }
  console.log(`✅ Authors: ${authorNames.length} (${authorNames.join(", ")})`);

  // ─── SERIES (unique non-empty series_name from books) ───
  const seriesNames = [...new Set(booksRows.map((r) => r.series_name?.trim()).filter(Boolean))] as string[];
  const seriesMap: Record<string, number> = {};
  for (const name of seriesNames) {
    const series = await prisma.series.upsert({
      where: { name },
      update: {},
      create: { name, description: null },
    });
    seriesMap[name] = series.id;
  }
  console.log(`✅ Series: ${seriesNames.length}`);

  // ─── BOOKS ───────────────────────────────────────────────────────────────
  const bookByIsbn13: Record<string, { id: number; coverPrice: Decimal; printCost: Decimal; distRate: number; handSoldRate: number }> = {};
  for (const row of booksRows) {
    const authorId = authorMap[row.author.trim()]?.id;
    if (!authorId) throw new Error(`Unknown author: ${row.author}`);
    const seriesName = row.series_name?.trim();
    const seriesId = seriesName ? seriesMap[seriesName] ?? null : null;
    const seriesOrder = row.series_index?.trim() ? parseInt(row.series_index, 10) : null;
    const publicationDate = parseMonthYear(row.publication_month_year);
    const distRate = parseInt(row.distribution_royalty_percent || "50", 10) / 100;
    const handSoldRate = parseInt(row.hand_sold_royalty_percent || "20", 10) / 100;
    const coverPrice = new Decimal(row.cover_price?.trim() || "0");
    const printCost = new Decimal(row.print_cost?.trim() || "0");

    const book = await prisma.book.create({
      data: {
        title: row.title.trim(),
        authorId,
        isbn13: row.isbn13.trim().replace(/[-\s]/g, ""),
        isbn10: row.isbn10?.trim().replace(/[-\s]/g, "") || null,
        distAuthorRoyaltyRate: distRate,
        handSoldAuthorRoyaltyRate: handSoldRate,
        coverPrice,
        printCost,
        publicationDate,
        seriesId,
        seriesOrder: seriesOrder != null && !Number.isNaN(seriesOrder) ? seriesOrder : null,
      },
    });
    bookByIsbn13[book.isbn13] = {
      id: book.id,
      coverPrice,
      printCost,
      distRate,
      handSoldRate,
    };
  }
  console.log(`✅ Books: ${booksRows.length}`);

  // ─── SALES ──────────────────────────────────────────────────────────────
  for (const row of salesRows) {
    const isbn13 = row.isbn13.trim().replace(/[-\s]/g, "");
    const book = bookByIsbn13[isbn13];
    if (!book) {
      console.warn(`⚠️ Sale skipped: no book for ISBN-13 ${isbn13}`);
      continue;
    }
    const date = parseMonthYear(row.record_month_year);
    const quantity = parseInt(row.units_sold, 10) || 0;
    if (quantity <= 0) continue;
    const source = row.source?.toLowerCase().includes("hand") ? "HAND_SOLD" : "DISTRIBUTOR";
    const paid = row.royalty_paid?.toLowerCase() === "y";
    const comment = row.comment?.trim() || null;

    let publisherRevenue: Decimal;
    let authorRoyalty: Decimal;
    const totalRevenueStr = row.total_revenue?.trim();
    if (totalRevenueStr && !Number.isNaN(parseFloat(totalRevenueStr))) {
      publisherRevenue = new Decimal(totalRevenueStr);
      const rate = source === "HAND_SOLD" ? book.handSoldRate : book.distRate;
      authorRoyalty = new Decimal(new Decimal(totalRevenueStr).mul(rate).toFixed(2));
    } else {
      const netPerCopy = new Decimal(book.coverPrice).sub(book.printCost);
      publisherRevenue = netPerCopy.mul(quantity);
      const rate = source === "HAND_SOLD" ? book.handSoldRate : book.distRate;
      authorRoyalty = new Decimal(publisherRevenue.mul(rate).toFixed(2));
    }

    await prisma.sale.create({
      data: {
        bookId: book.id,
        date,
        quantity,
        publisherRevenue,
        authorRoyalty,
        source,
        paid,
        comment,
      },
    });
  }
  console.log(`✅ Sales: ${salesRows.length} records`);
  console.log("🏁 Seed complete. Data loaded from ev2-sample-data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
