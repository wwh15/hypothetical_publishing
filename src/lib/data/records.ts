import { prisma } from "../prisma";

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

export default async function asyncGetSalesData() {
  return await prisma.sale.findMany({
    include: {
      book: {
        include: {
          author: true,
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
  });
}

export async function asyncGetSaleById(id: number) {
  return await prisma.sale.findUnique({
    where: { id },
    include: {
      book: {
        include: {
          author: true,
        },
      },
    },
  });
}