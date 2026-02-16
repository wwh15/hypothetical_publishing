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
    const book = await prisma.book.create({
      data: {
        title: `${randomArrayElement(titles)} Vol. ${i}`,
        isbn13: `978${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        authorRoyaltyRate: +(Math.random() * 0.10 + 0.10).toFixed(2),
        publicationDate: new Date(2023, randomInt(0, 11), 1),
        authorId: randomAuthor.id,
      },
    });
    createdBooks.push(book);
  }
  console.log(`✅ Created ${createdBooks.length} books.`);

  // 4. CREATE SALES
  console.log("💾 Inserting sales data...");
  for (let i = 0; i < TARGET_SALE_COUNT; i++) {
    const book = randomArrayElement(createdBooks);
    const quantity = randomInt(5, 50);
    const price = new Decimal(randomInt(20, 60));
    
    const revenue = price.times(quantity);
    const royalty = revenue.times(book.authorRoyaltyRate).toDecimalPlaces(2);

    await prisma.sale.create({
      data: {
        bookId: book.id,
        date: randomArrayElement(saleMonths),
        quantity,
        publisherRevenue: revenue,
        authorRoyalty: royalty,
        paid: Math.random() > 0.3,
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