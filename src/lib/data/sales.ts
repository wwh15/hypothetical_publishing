export interface Sale {
    id: number;
    title: string;
    author: string;
    date: string; // Format: MM-YYYY
    quantity: number;
    publisherRevenue: number;
    authorRoyalty: number;
    paid: 'paid' | 'pending';
}

export default function getSalesData(): Sale[] {
    return mockSalesData 
    // Todo: Read from database and return
}

// Mock Data
const mockSalesData: Sale[] = [
    {
      id: 1,
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      date: '01-2026',
      quantity: 50,
      publisherRevenue: 1499.50,
      authorRoyalty: 374.88,
      paid: 'paid',
    },
    {
      id: 2,
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      date: '01-2026',
      quantity: 30,
      publisherRevenue: 1199.70,
      authorRoyalty: 299.93,
      paid: 'pending',
    },
    {
      id: 3,
      title: '1984',
      author: 'George Orwell',
      date: '01-2026',
      quantity: 75,
      publisherRevenue: 1499.25,
      authorRoyalty: 374.81,
      paid: 'paid',
    },
    {
      id: 4,
      title: 'Pride and Prejudice',
      author: 'Jane Austen',
      date: '01-2026',
      quantity: 25,
      publisherRevenue: 624.75,
      authorRoyalty: 156.19,
      paid: 'paid',
    },
    {
      id: 5,
      title: 'The Catcher in the Rye',
      author: 'J.D. Salinger',
      date: '01-2026',
      quantity: 40,
      publisherRevenue: 999.60,
      authorRoyalty: 249.90,
      paid: 'pending',
    },
    {
      id: 6,
      title: 'Brave New World',
      author: 'Aldous Huxley',
      date: '01-2026',
      quantity: 60,
      publisherRevenue: 1439.40,
      authorRoyalty: 359.85,
      paid: 'paid',
    },
    {
      id: 7,
      title: 'The Hobbit',
      author: 'J.R.R. Tolkien',
      date: '01-2026',
      quantity: 100,
      publisherRevenue: 2999.00,
      authorRoyalty: 749.75,
      paid: 'pending',
    },
    {
      id: 8,
      title: 'Moby-Dick',
      author: 'Herman Melville',
      date: '01-2026',
      quantity: 20,
      publisherRevenue: 579.80,
      authorRoyalty: 144.95,
      paid: 'paid',
    },
    {
      id: 9,
      title: 'War and Peace',
      author: 'Leo Tolstoy',
      date: '01-2026',
      quantity: 15,
      publisherRevenue: 524.85,
      authorRoyalty: 131.21,
      paid: 'pending',
    },
    {
      id: 10,
      title: 'The Odyssey',
      author: 'Homer',
      date: '01-2026',
      quantity: 35,
      publisherRevenue: 874.65,
      authorRoyalty: 218.66,
      paid: 'paid',
    },
  ];