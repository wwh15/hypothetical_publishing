import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const authorNames = [
  'George Orwell', 'Jane Austen', 'F. Scott Fitzgerald', 'Harper Lee',
  'J.D. Salinger', 'Aldous Huxley', 'J.R.R. Tolkien', 'Herman Melville',
  'Leo Tolstoy', 'Homer', 'Emily Brontë', 'Charlotte Brontë', 'Mark Twain',
  'Charles Dickens', 'Ernest Hemingway', 'Ray Bradbury', 'Kurt Vonnegut',
  'Mary Shelley', 'Bram Stoker', 'John Steinbeck'
];

const bookData = [
  // Single author books (most books)
  { title: '1984', authors: ['George Orwell'], isbn13: '9780451524935' },
  { title: 'Animal Farm', authors: ['George Orwell'], isbn13: '9780452284241' },
  { title: 'Pride and Prejudice', authors: ['Jane Austen'], isbn13: '9780141439518' },
  { title: 'Sense and Sensibility', authors: ['Jane Austen'], isbn13: '9780141439662' },
  { title: 'The Great Gatsby', authors: ['F. Scott Fitzgerald'], isbn13: '9780743273565' },
  { title: 'To Kill a Mockingbird', authors: ['Harper Lee'], isbn13: '9780061120084' },
  { title: 'The Catcher in the Rye', authors: ['J.D. Salinger'], isbn13: '9780316769174' },
  { title: 'Brave New World', authors: ['Aldous Huxley'], isbn13: '9780060850524' },
  { title: 'The Hobbit', authors: ['J.R.R. Tolkien'], isbn13: '9780547928227' },
  { title: 'Lord of the Rings', authors: ['J.R.R. Tolkien'], isbn13: '9780544003415' },
  { title: 'Moby-Dick', authors: ['Herman Melville'], isbn13: '9781503280786' },
  { title: 'War and Peace', authors: ['Leo Tolstoy'], isbn13: '9780143039990' },
  { title: 'Anna Karenina', authors: ['Leo Tolstoy'], isbn13: '9780143035008' },
  { title: 'The Odyssey', authors: ['Homer'], isbn13: '9780140268867' },
  { title: 'Wuthering Heights', authors: ['Emily Brontë'], isbn13: '9780141439556' },
  { title: 'Jane Eyre', authors: ['Charlotte Brontë'], isbn13: '9780141441146' },
  { title: 'The Adventures of Tom Sawyer', authors: ['Mark Twain'], isbn13: '9780486400778' },
  { title: 'Great Expectations', authors: ['Charles Dickens'], isbn13: '9780141439563' },
  { title: 'The Old Man and the Sea', authors: ['Ernest Hemingway'], isbn13: '9780684801223' },
  { title: 'Fahrenheit 451', authors: ['Ray Bradbury'], isbn13: '9781451673319' },
  { title: 'Slaughterhouse-Five', authors: ['Kurt Vonnegut'], isbn13: '9780385333849' },
  { title: 'Frankenstein', authors: ['Mary Shelley'], isbn13: '9780486282114' },
  { title: 'Dracula', authors: ['Bram Stoker'], isbn13: '9780486411095' },
  // Multiple author books (some books have 2 authors)
  { title: 'The Grapes of Wrath', authors: ['John Steinbeck', 'Ernest Hemingway'], isbn13: '9780143039433' },
  { title: 'Classic Literature Collection', authors: ['Charles Dickens', 'Mark Twain'], isbn13: '9780143039440' },
  { title: 'Modern Classics', authors: ['Ray Bradbury', 'Kurt Vonnegut'], isbn13: '9780143039451' },
  { title: 'Gothic Tales', authors: ['Mary Shelley', 'Bram Stoker'], isbn13: '9780143039462' },
  { title: 'Epic Adventures', authors: ['J.R.R. Tolkien', 'Homer'], isbn13: '9780143039473' },
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
  console.log('🌱 Starting seed...');

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
  const booksWithTwoAuthors = bookData.filter((b) => b.authors.length === 2).length;
  console.log(`   - Books with 1 author: ${booksWithOneAuthor}`);
  console.log(`   - Books with 2 authors: ${booksWithTwoAuthors}`);

  // Create 250 sales records (linked to books)
  const salesData = [];
  for (let i = 0; i < 250; i++) {
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