import { PrismaClient } from '@prisma/client';
import 'dotenv/config'

const prisma = new PrismaClient()

const titles = [
    'The Great Gatsby', 'To Kill a Mockingbird', '1984', 'Pride and Prejudice',
    'The Catcher in the Rye', 'Brave New World', 'The Hobbit', 'Moby-Dick',
    'War and Peace', 'The Odyssey', 'Wuthering Heights', 'The Grapes of Wrath',
    'Dracula', 'Jane Eyre', 'Fahrenheit 451', 'Les Misérables', 'Anna Karenina',
    'Lord of the Flies', 'Slaughterhouse-Five', 'Frankenstein'
];

const authors = [
    'F. Scott Fitzgerald', 'Harper Lee', 'George Orwell', 'Jane Austen',
    'J.D. Salinger', 'Aldous Huxley', 'J.R.R. Tolkien', 'Herman Melville',
    'Leo Tolstoy', 'Homer', 'Emily Brontë', 'John Steinbeck', 'Bram Stoker',
    'Charlotte Brontë', 'Ray Bradbury', 'Victor Hugo', 'Leo Tolstoy',
    'William Golding', 'Kurt Vonnegut', 'Mary Shelley'
];

// 24 months: Jan-2025 to Dec-2026
const months = [
    '01-2025', '02-2025', '03-2025', '04-2025', '05-2025', '06-2025',
    '07-2025', '08-2025', '09-2025', '10-2025', '11-2025', '12-2025',
    '01-2026', '02-2026', '03-2026', '04-2026', '05-2026', '06-2026',
    '07-2026', '08-2026', '09-2026', '10-2026', '11-2026', '12-2026'
];

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomArrayElement<T>(arr: T[]): T {
    return arr[randomInt(0, arr.length - 1)];
}

async function main() {
    console.log('🌱 Starting seed...');

    // Clear existing sales data
    await prisma.sale.deleteMany({});
    console.log('🗑️  Cleared existing sales data');

    // Generate 250 sales records
    const salesData = [];
    
    for (let i = 1; i <= 250; i++) {
        const titleIndex = randomInt(0, titles.length - 1);
        const author = authors[titleIndex];
        const title = titles[titleIndex];

        const date = randomArrayElement(months);
        const quantity = randomInt(5, 120);

        // Assume publisher gets $25-$45 per book
        const pricePerBook = Math.random() * 20 + 25; // $25 to $45
        const publisherRevenue = +(quantity * pricePerBook).toFixed(2);

        // Author gets 25% royalty
        const authorRoyalty = +(publisherRevenue * 0.25).toFixed(2);

        // Randomly assign paid or pending, with slightly more paid than pending
        const paid = Math.random() < 0.65 ? 'paid' : 'pending';

        salesData.push({
            title,
            author,
            date,
            quantity,
            publisherRevenue,
            authorRoyalty,
            paid
        });
    }

    // Insert all sales records in batches for better performance
    const batchSize = 50;
    let inserted = 0;
    
    for (let i = 0; i < salesData.length; i += batchSize) {
        const batch = salesData.slice(i, i + batchSize);
        await prisma.sale.createMany({
            data: batch
        });
        inserted += batch.length;
        console.log(`✅ Inserted ${inserted}/${salesData.length} sales records`);
    }

    console.log('✨ Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
