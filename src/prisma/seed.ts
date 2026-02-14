import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TARGET_BOOK_COUNT = 50;
const TARGET_SALE_COUNT = 100;

// These are your unique Author entities (including collaborative strings)
const authorNames = [
  "Alice Johnson",
  "Bob Smith",
  "Carol Williams",
  "David Brown",
  "Emma Davis",
  "Alice Johnson, Bob Smith",
  "David Brown, Carol Williams",
  "Bob Smith, Alice Johnson, Carol Williams"
];

// Expanded range: Jan 2024 through Dec 2025
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
  console.log("🌱 Starting One-to-Many seed (2024-2025)...");

  await prisma.sale.deleteMany();
  await prisma.book.deleteMany();
  await prisma.author.deleteMany();

  // 1. Create Authors
  // We treat the "Comma-Separated" strings as single unique Author records
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
  console.log(`✅ Created ${authors.length} unique author entities`);

  // 2. Create 50 Books
  const createdBooks = [];
  const titles = ['Archive', 'Perspective', 'Legacy', 'Manual', 'Chronicle', 'Theory'];
  
  for (let i = 1; i <= TARGET_BOOK_COUNT; i++) {
    const randomAuthor = randomArrayElement(authors);
    
    const book = await prisma.book.create({
      data: {
        title: `${randomArrayElement(titles)} Vol. ${i}`,
        isbn13: `978${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        authorRoyaltyRate: +(Math.random() * 0.10 + 0.10).toFixed(2), // 10-20%
        publicationDate: new Date(2023, randomInt(0, 11), 1),
        // Strict One-to-Many: Connect to ONE author record
        author: {
          connect: { id: randomAuthor.id }
        }
      },
    });
    createdBooks.push(book);
  }
  console.log(`✅ Created ${createdBooks.length} books`);

  // 3. Create 100 Sales
  const salesData = [];
  for (let i = 0; i < TARGET_SALE_COUNT; i++) {
    const book = randomArrayElement(createdBooks);
    const quantity = randomInt(10, 150);
    const price = randomInt(15, 45);
    const revenue = +(quantity * price).toFixed(2);
    const royalty = +(revenue * book.authorRoyaltyRate).toFixed(2);

    salesData.push({
      bookId: book.id,
      date: randomArrayElement(saleMonths),
      quantity,
      publisherRevenue: revenue,
      authorRoyalty: royalty,
      paid: Math.random() < 0.7,
      royaltyOverridden: false,
    });
  }

  await prisma.sale.createMany({ data: salesData });
  console.log(`✅ Created ${salesData.length} sales records`);
  console.log(`📊 Date range coverage: Jan 2024 - Dec 2025`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });