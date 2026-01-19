'use server';


import asyncGetAuthorPaymentData from "@/lib/data/author-payment";
import asyncGetSalesData, { asyncGetSaleById } from "@/lib/data/records";
import { Sale } from "@/lib/data/records";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Update a sale record
export async function updateSale(
  id: number,
  data: {
    bookId?: number;
    date?: string;
    quantity?: number;
    publisherRevenue?: number;
    authorRoyalty?: number;
    royaltyOverridden?: boolean;
    paid?: boolean;
  }
) {
  try {
    await prisma.sale.update({
      where: { id },
      data,
    });

    revalidatePath(`/sales/records/${id}`);
    revalidatePath('/sales/records');

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to update sale' };
  }
}

// Delete a sale record
export async function deleteSale(id: number) {
  try {
    await prisma.sale.delete({
      where: { id },
    });

    revalidatePath('/sales/records');
  } catch (error) {
    return { success: false, error: 'Failed to delete sale' };
  }

  // Redirect after successful delete (outside try-catch)
  redirect('/sales/records');
}

// Toggle paid status
export async function togglePaidStatus(id: number, currentStatus: boolean) {
  try {
    await prisma.sale.update({
      where: { id },
      data: { paid: !currentStatus },
    });

    revalidatePath(`/sales/records/${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to toggle status' };
  }
}

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

export async function getSaleById(id: number) {
  return asyncGetSaleById(id);
}

export async function getAuthorPaymentData() {
  return asyncGetAuthorPaymentData();
}