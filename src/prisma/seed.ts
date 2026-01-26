import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// TEST DATA - This is sample/test data for development purposes only
// The authors, books, and ISBNs below are fictional test data

const authorNames = [
  'Alice Johnson', 'Bob Smith', 'Carol Williams', 'David Brown', 'Emma Davis'
];

const bookData = [
  // Books with single author
  { title: 'The Test Novel', authors: ['Alice Johnson'], isbn13: '9781234567890' },
  { title: 'Sample Story', authors: ['Bob Smith'], isbn13: '9780987654321' },
  { title: 'Example Book', authors: ['Carol Williams'], isbn13: '9781122334455' },
  { title: 'Demo Fiction', authors: ['David Brown'], isbn13: '9785566778899' },
  // Books with multiple authors
  { title: 'Collaborative Work', authors: ['Alice Johnson', 'Bob Smith'], isbn13: '9782233445566' },
  { title: 'Joint Publication', authors: ['David Brown', 'Carol Williams'], isbn13: '9783344556677' },
  { title: 'Multi-Author Project', authors: ['Bob Smith', 'Alice Johnson', 'Carol Williams'], isbn13: '9784455667788' },
];

const months = [
  '01-2025', '02-2025', '03-2025', '04-2025', '05-2025', '06-2025',
  '07-2025', '08-2025', '09-2025', '10-2025', '11-2025', '12-2025',
  '01-2026', '02-2026', '03-2026', '04-2026', '05-2026', '06-2026',
  '07-2026', '08-2026', '09-2026', '10-2026', '11-2026', '12-2026'
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomArrayElement<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

async function main() {
  console.log('🌱 Starting seed with TEST DATA...');

  // Clear existing data (in reverse order due to relations)
  await prisma.sale.deleteMany();
  await prisma.book.deleteMany();
  await prisma.author.deleteMany();
  console.log('🗑️  Cleared existing data');

  // Create authors
  const authors = await Promise.all(
    authorNames.map((name) =>
      prisma.author.create({
        data: {
          name,
          email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        },
      })
    )
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
          authorRoyaltyRate: +(Math.random() * 0.30 + 0.10).toFixed(2), // 25% default
        },
      });
    })
  );
  console.log(`✅ Created ${books.length} books`);
  
  // Count books by author count
  const booksWithOneAuthor = bookData.filter((b) => b.authors.length === 1).length;
  const booksWithMultipleAuthors = bookData.filter((b) => b.authors.length > 1).length;
  console.log(`   - Books with 1 author: ${booksWithOneAuthor}`);
  console.log(`   - Books with multiple authors: ${booksWithMultipleAuthors}`);

  // Create test sales records (linked to books)
  const salesData = [];
  for (let i = 0; i < 50; i++) {
    const book = randomArrayElement(books);
    const quantity = randomInt(5, 120);
    const pricePerBook = Math.random() * 20 + 25; // $25-$45
    const publisherRevenue = +(quantity * pricePerBook).toFixed(2);
    const authorRoyalty = +(publisherRevenue * book.authorRoyaltyRate).toFixed(2);
    const paid = Math.random() < 0.65; // 65% paid, 35% unpaid

    salesData.push({
      bookId: book.id,
      date: randomArrayElement(months),
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
    console.error('❌ Error seeding database:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });