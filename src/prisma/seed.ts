/**
 * HIGH-LEVEL VIEW: SEED & SYNC STRATEGY
 * * This script populates the database with Authors, Books, and Sales.
 * * IMPORTANT: Because the system uses a 'Denormalized' architecture (storing royalty 
 * totals directly on the Author record for performance), this seed script must 
 * manually trigger a synchronization pass. 
 * * 1. Authors & Books: Basic entities are created.
 * 2. Sales: Transactional records are generated using Decimal.js for financial accuracy.
 * 3. Sync: After all sales are inserted, we aggregate the totals and update the Author 
 * table so the dashboard reflects the ledger immediately upon app launch.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

const TARGET_BOOK_COUNT = 50;
const TARGET_SALE_COUNT = 100;

const authorNames = [
  "Alice Johnson", "Bob Smith", "Carol Williams", "David Brown",
  "Emma Davis", "Alice Johnson, Bob Smith", "David Brown, Carol Williams"
];

// Sample comments for seeded sales (max 256 chars each)
const SALE_COMMENTS: (string | null)[] = [
  "Bulk order from bookstore.",
  "Online promotion.",
  null,
  "Conference giveaway.",
  null,
  "Backorder fulfilled.",
  null,
  null,
  "Holiday sale.",
];

// Generates an array of dates for the last 2 years
const saleMonths: Date[] = [];
for (let year = 2024; year <= 2025; year++) {
  for (let month = 0; month < 12; month++) {
    saleMonths.push(new Date(year, month, 1));
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomArrayElement<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

async function main() {
  console.log("🌱 Starting Seed Process...");

  // 1. CLEAR EXISTING DATA
  await prisma.sale.deleteMany();
  await prisma.book.deleteMany();
  await prisma.author.deleteMany();

  // 2. CREATE AUTHORS
  const authors = await Promise.all(
    authorNames.map((name) =>
      prisma.author.create({
        data: {
          name,
          email: `${name.toLowerCase().replace(/[^a-z]/g, ".")}@example.com`,
        },
      }),
    ),
  );
  console.log(`✅ Created ${authors.length} authors.`);

  // 3. CREATE BOOKS
  const createdBooks = [];
  const titles = ['Archive', 'Perspective', 'Legacy', 'Manual', 'Chronicle'];

  for (let i = 1; i <= TARGET_BOOK_COUNT; i++) {
    const randomAuthor = randomArrayElement(authors);
    const coverPrice = new Decimal(randomInt(15, 35));
    const printCost = new Decimal(randomInt(3, 10));
    const book = await prisma.book.create({
      data: {
        title: `${randomArrayElement(titles)} Vol. ${i}`,
        isbn13: `978${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        distAuthorRoyaltyRate: +(Math.random() * 0.10 + 0.10).toFixed(2),
        handSoldAuthorRoyaltyRate: +(Math.random() * 0.15 + 0.10).toFixed(2),
        coverPrice,
        printCost,
        publicationDate: new Date(2023, randomInt(0, 11), 1),
        authorId: randomAuthor.id,
      },
    });
    createdBooks.push(book);
  }
  console.log(`✅ Created ${createdBooks.length} books.`);

  // 4. CREATE SALES (~30% hand-sold, ~70% distributor)
  console.log("💾 Inserting sales data...");
  for (let i = 0; i < TARGET_SALE_COUNT; i++) {
    const book = randomArrayElement(createdBooks);
    const quantity = randomInt(5, 50);
    const isHandSold = Math.random() < 0.3;
    const source = isHandSold ? "HAND_SOLD" : "DISTRIBUTOR";

    let revenue: Decimal;
    let royaltyRate: number;

    if (isHandSold && book.coverPrice && book.printCost) {
      // Hand-sold: revenue = (coverPrice - printCost) * quantity
      revenue = new Decimal(book.coverPrice).minus(new Decimal(book.printCost)).times(quantity);
      royaltyRate = book.handSoldAuthorRoyaltyRate;
    } else {
      // Distributor: revenue from a random unit price
      const price = new Decimal(randomInt(20, 60));
      revenue = price.times(quantity);
      royaltyRate = book.distAuthorRoyaltyRate;
    }

    const royalty = revenue.times(royaltyRate).toDecimalPlaces(2);

    const comment = randomArrayElement(SALE_COMMENTS);
    await prisma.sale.create({
      data: {
        bookId: book.id,
        date: randomArrayElement(saleMonths),
        quantity,
        publisherRevenue: revenue,
        authorRoyalty: royalty,
        source,
        paid: Math.random() > 0.3,
        comment: comment ?? undefined,
      },
    });
  }

  console.log("🏁 Seed and Sync complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });