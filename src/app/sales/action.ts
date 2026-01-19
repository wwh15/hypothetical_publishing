// 'use server'; Uncomment once we actually read from database

import asyncGetAuthorPaymentData from "@/lib/data/author-payment";
import asyncGetSalesData, { asyncGetSaleById } from "@/lib/data/records";
import { Sale } from "@/lib/data/records";

export async function getSalesRecordData(): Promise<Sale[]> {
  const sales = await asyncGetSalesData();
  
  // Transform Prisma data to flat Sale type
  return sales.map(sale => ({
    id: sale.id,
    title: sale.book.title,
    author: sale.book.author.name,
    date: sale.date,
    quantity: sale.quantity,
    publisherRevenue: sale.publisherRevenue,
    authorRoyalty: sale.authorRoyalty,
    paid: sale.paid ? 'paid' : 'pending' as 'paid' | 'pending',
  }));
}

export function getSaleById(id: number) {
  return asyncGetSaleById(id);
}

export function getAuthorPaymentData() {
    return asyncGetAuthorPaymentData();
}