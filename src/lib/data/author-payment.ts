import { Sale } from "./records";

export interface AuthorGroup {
    author: string;
    unpaidTotal: number;
    sales: Sale[];
}

export default function awaitAuthorPaymentData(): AuthorGroup[] {
    // Sort the groups by author name (A-Z)
    const sortedGroups = [...mockAuthorPaymentData].sort((a, b) => 
        a.author.localeCompare(b.author)
    );

    // Within each group, sort sales by date (newest first)
    return sortedGroups.map(group => ({
        ...group,
        sales: [...group.sales].sort((a, b) => {
            const aDate = convertDateForSorting(a.date);
            const bDate = convertDateForSorting(b.date);
            return bDate.localeCompare(aDate);
        })
    }));
}

function convertDateForSorting(date: string): string {
    const [month, year] = date.split('-');
    return `${year}-${month}`;
}

// ==================== MOCK DATA GENERATION ====================

const authorNames = [
    'George Orwell', 'Jane Austen', 'F. Scott Fitzgerald', 'Harper Lee',
    'J.D. Salinger', 'Aldous Huxley', 'J.R.R. Tolkien', 'Herman Melville',
    'Leo Tolstoy', 'Homer', 'Emily Brontë', 'Charlotte Brontë', 'Mark Twain',
    'Charles Dickens', 'William Shakespeare', 'Ernest Hemingway', 'Virginia Woolf',
    'James Joyce', 'Franz Kafka', 'Gabriel García Márquez', 'Toni Morrison',
    'Maya Angelou', 'Chinua Achebe', 'Salman Rushdie', 'Margaret Atwood',
    'Kurt Vonnegut', 'Ray Bradbury', 'Isaac Asimov', 'Arthur C. Clarke',
    'Ursula K. Le Guin', 'Neil Gaiman', 'Terry Pratchett', 'Douglas Adams',
    'Agatha Christie', 'Arthur Conan Doyle', 'Edgar Allan Poe', 'H.P. Lovecraft',
    'Stephen King', 'Dean Koontz', 'John Grisham', 'Dan Brown',
    'J.K. Rowling', 'Suzanne Collins', 'Veronica Roth', 'Cassandra Clare',
    'Rick Riordan', 'Lemony Snicket', 'Roald Dahl', 'Dr. Seuss', 'Shel Silverstein'
];

const bookTitles = [
    '1984', 'Animal Farm', 'Pride and Prejudice', 'Sense and Sensibility',
    'The Great Gatsby', 'To Kill a Mockingbird', 'The Catcher in the Rye',
    'Brave New World', 'The Hobbit', 'Lord of the Rings', 'Moby-Dick',
    'War and Peace', 'Anna Karenina', 'The Odyssey', 'The Iliad',
    'Wuthering Heights', 'Jane Eyre', 'The Adventures of Tom Sawyer',
    'Great Expectations', 'A Tale of Two Cities', 'Hamlet', 'Romeo and Juliet',
    'The Old Man and the Sea', 'For Whom the Bell Tolls', 'Mrs. Dalloway',
    'To the Lighthouse', 'Ulysses', 'The Metamorphosis', 'The Trial',
    'One Hundred Years of Solitude', 'Beloved', 'I Know Why the Caged Bird Sings'
];

// 24 months: Jan-2025 to Dec-2026
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

// Generate mock author payment data
function generateMockAuthorPaymentData(): AuthorGroup[] {
    let saleIdCounter = 1;
    
    return authorNames.map((author, authorIndex) => {
        // Each author has 1-4 sales
        const numSales = randomInt(1, 4);
        const sales: Sale[] = [];
        
        for (let i = 0; i < numSales; i++) {
            const quantity = randomInt(10, 100);
            const publisherRevenue = parseFloat((quantity * randomInt(15, 40)).toFixed(2));
            const authorRoyalty = parseFloat((publisherRevenue * 0.25).toFixed(2));
            const paid = Math.random() > 0.6 ? 'paid' : 'pending'; // 40% pending, 60% paid
            
            sales.push({
                id: saleIdCounter++,
                title: bookTitles[randomInt(0, bookTitles.length - 1)],
                author: author,
                date: randomArrayElement(months),
                quantity: quantity,
                publisherRevenue: publisherRevenue,
                authorRoyalty: authorRoyalty,
                paid: paid,
            });
        }
        
        // Calculate unpaid total
        const unpaidTotal = sales
            .filter(sale => sale.paid === 'pending')
            .reduce((sum, sale) => sum + sale.authorRoyalty, 0);
        
        return {
            author: author,
            unpaidTotal: parseFloat(unpaidTotal.toFixed(2)),
            sales: sales,
        };
    });
}

const mockAuthorPaymentData: AuthorGroup[] = generateMockAuthorPaymentData();