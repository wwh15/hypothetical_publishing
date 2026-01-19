import { prisma } from "../prisma";
import { Sale } from "./records";

export interface AuthorGroup {
    author: string;
    unpaidTotal: number;
    sales: Sale[];
}

export default async function asyncGetAuthorPaymentData(): Promise<AuthorGroup[]> {
  // Get all authors with their books and unpaid sales
  const authors = await prisma.author.findMany({
    include: {
      books: {
        include: {
          sales: {
            where: {
              paid: false, // Only unpaid sales
            },
            orderBy: {
              date: 'desc',
            },
          },
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Transform to AuthorGroup format
  return authors
    .map((author) => {
      const sales = author.books.flatMap((book) =>
        book.sales.map((sale) => ({
          id: sale.id,
          title: book.title,
          author: author.name,  // ✅ Add this line
          date: sale.date,
          quantity: sale.quantity,
          publisherRevenue: sale.publisherRevenue,
          authorRoyalty: sale.authorRoyalty,
          paid: sale.paid ? 'paid' : 'pending' as 'paid' | 'pending',  // ✅ Convert boolean to string
        }))
      );

      const unpaidTotal = sales.reduce((sum, sale) => sum + sale.authorRoyalty, 0);

      return {
        author: author.name,
        authorId: author.id,
        unpaidTotal: +unpaidTotal.toFixed(2),
        sales,
      };
    })
    .filter((group) => group.sales.length > 0); // Only authors with unpaid sales
}