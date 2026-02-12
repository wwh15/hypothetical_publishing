import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedBook {
  title: string;
  authors: string[];
  isbn13?: string;
  isbn10?: string;
  publicationDate?: Date; // First day of publication month
}

// TEST DATA - This is sample/test data for development purposes only
// The authors, books, and ISBNs below are fictional test data

const authorNames = [
  "Alice Johnson",
  "Bob Smith",
  "Carol Williams",
  "David Brown",
  "Emma Davis",
];

const bookData: SeedBook[] = [
  {
    title: "The Test Novel",
    authors: ["Alice Johnson"],
    isbn13: "9781234567890",
    publicationDate: new Date(2024, 0, 1),
  },
  {
    title: "Sample Story",
    authors: ["Bob Smith"],
    isbn13: "9780987654321",
    publicationDate: new Date(2023, 1, 1),
  },
  {
    title: "Example Book",
    authors: ["Carol Williams"],
    isbn13: "9781122334455",
    publicationDate: new Date(2022, 2, 1),
  },
  {
    title: "Demo Fiction",
    authors: ["David Brown"],
    isbn13: "9785566778899",
    publicationDate: new Date(2021, 3, 1),
  },
  {
    title: "Collaborative Work",
    authors: ["Alice Johnson", "Bob Smith"],
    isbn13: "9782233445566",
    publicationDate: new Date(2020, 4, 1),
  },
  {
    title: "Joint Publication",
    authors: ["David Brown", "Carol Williams"],
    isbn13: "9783344556677",
    publicationDate: new Date(2024, 5, 1),
  },
  {
    title: "Multi-Author Project",
    authors: ["Bob Smith", "Alice Johnson", "Carol Williams"],
    isbn13: "9784455667788",
    publicationDate: new Date(2023, 6, 1),
  },
];

const saleMonths: Date[] = [
  new Date(2025, 0, 1),
  new Date(2025, 1, 1),
  new Date(2025, 2, 1),
  new Date(2025, 3, 1),
  new Date(2025, 4, 1),
  new Date(2025, 5, 1),
  new Date(2025, 6, 1),
  new Date(2025, 7, 1),
  new Date(2025, 8, 1),
  new Date(2025, 9, 1),
  new Date(2025, 10, 1),
  new Date(2025, 11, 1),
  new Date(2026, 0, 1),
  new Date(2026, 1, 1),
  new Date(2026, 2, 1),
  new Date(2026, 3, 1),
  new Date(2026, 4, 1),
  new Date(2026, 5, 1),
  new Date(2026, 6, 1),
  new Date(2026, 7, 1),
  new Date(2026, 8, 1),
  new Date(2026, 9, 1),
  new Date(2026, 10, 1),
  new Date(2026, 11, 1),
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomArrayElement<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

async function main() {
  console.log("🌱 Starting seed with TEST DATA...");

  // Clear existing data (in reverse order due to relations)
  await prisma.sale.deleteMany();
  await prisma.book.deleteMany();
  await prisma.author.deleteMany();
  console.log("🗑️  Cleared existing data");

  // Create authors
  const authors = await Promise.all(
    authorNames.map((name) =>
      prisma.author.create({
        data: {
          name,
          email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        },
      }),
    ),
  );
  console.log(`✅ Created ${authors.length} authors`);

  // Create books (linked to authors)
  const books = await Promise.all(
    bookData.map((book) => {
      // Find all authors for this book
      const bookAuthors = book.authors
        .map((authorName) => {
          const author = authors.find((a) => a.name === authorName);
          if (!author) {
            throw new Error(`Author not found: ${authorName}`);
          }
          return author;
        })
        .filter((author) => author !== undefined);

      if (bookAuthors.length === 0) {
        throw new Error(`No valid authors found for book: ${book.title}`);
      }

      // Connect all authors to this book
      return prisma.book.create({
        data: {
          title: book.title,
          authors: {
            connect: bookAuthors.map((author) => ({ id: author.id })),
          },
          isbn13: book.isbn13,
          authorRoyaltyRate: +(Math.random() * 0.2 + 0.4).toFixed(2), // 40–60% around 50% default
          publicationDate: book.publicationDate ?? null,
        },
      });
    }),
  );
  console.log(`✅ Created ${books.length} books`);

  // Count books by author count
  const booksWithOneAuthor = bookData.filter(
    (b) => b.authors.length === 1,
  ).length;
  const booksWithMultipleAuthors = bookData.filter(
    (b) => b.authors.length > 1,
  ).length;
  console.log(`   - Books with 1 author: ${booksWithOneAuthor}`);
  console.log(`   - Books with multiple authors: ${booksWithMultipleAuthors}`);

  // Create test sales records (linked to books)
  const salesData = [];
  for (let i = 0; i < 50; i++) {
    const book = randomArrayElement(books);
    const quantity = randomInt(5, 120);
    const pricePerBook = Math.random() * 20 + 25; // $25-$45
    const publisherRevenue = +(quantity * pricePerBook).toFixed(2);
    const authorRoyalty = +(publisherRevenue * book.authorRoyaltyRate).toFixed(
      2,
    );
    const paid = Math.random() < 0.65; // 65% paid, 35% unpaid

    salesData.push({
      bookId: book.id,
      date: randomArrayElement(saleMonths),
      quantity,
      publisherRevenue,
      authorRoyalty,
      paid,
      royaltyOverridden: false,
    });
  }

  await prisma.sale.createMany({
    data: salesData,
  });
  console.log(`✅ Created ${salesData.length} sales records`);

  // Show stats
  const totalPaid = await prisma.sale.count({ where: { paid: true } });
  const totalUnpaid = await prisma.sale.count({ where: { paid: false } });

  console.log(`📊 Stats:`);
  console.log(`   - Authors: ${authors.length}`);
  console.log(`   - Books: ${books.length}`);
  console.log(`   - Sales (Paid): ${totalPaid}`);
  console.log(`   - Sales (Unpaid): ${totalUnpaid}`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
