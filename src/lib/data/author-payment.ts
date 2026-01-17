import { Sale } from "./sales";


export interface AuthorGroup {
    author: string;
    unpaidTotal: number;
    sales: Sale[];
}

export default function awaitAuthorPaymentData(): AuthorGroup[] {
    return mockAuthorPaymentData
    // Todo: Read from database and return
}


// Mock data
const mockAuthorPaymentData: AuthorGroup[] = [
    {
      author: "George Orwell",
      unpaidTotal: 584.81,
      sales: [
        {
          id: 1,
          title: "1984",
          author: "George Orwell",
          date: "01-2026",
          quantity: 75,
          publisherRevenue: 1499.25,
          authorRoyalty: 374.81,
          paid: "pending",
        },
        {
          id: 2,
          title: "Animal Farm",
          author: "George Orwell",
          date: "11-2025",
          quantity: 60,
          publisherRevenue: 840.0,
          authorRoyalty: 210.0,
          paid: "pending",
        },
      ],
    },
    {
      author: "Jane Austen",
      unpaidTotal: 156.19,
      sales: [
        {
          id: 3,
          title: "Pride and Prejudice",
          author: "Jane Austen",
          date: "01-2026",
          quantity: 25,
          publisherRevenue: 624.75,
          authorRoyalty: 156.19,
          paid: "pending",
        },
      ],
    },
  ];