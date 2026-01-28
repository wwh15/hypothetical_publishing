"use server";

import asyncGetAuthorPaymentData from "@/lib/data/author-payment";
import asyncGetSalesData, {
  asyncDeleteSale,
  asyncTogglePaidStatus,
  asyncUpdateSale,
  toSaleListItem,
  SaleListItem,
  asyncAddSale,
} from "@/lib/data/records";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function addSale(data: Prisma.SaleUncheckedCreateInput) {
  try {
    await asyncAddSale(data);
    revalidatePath("/sales/records");
    revalidatePath("/sales/add-record");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to add sale" };
  }
}

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
    await asyncUpdateSale(id, data);
    revalidatePath(`/sales/records/${id}`);
    revalidatePath("/sales/records");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update sale" };
  }
}

export async function deleteSale(id: number) {
  try {
    await asyncDeleteSale(id);
    revalidatePath("/sales/records");
  } catch {
    return { success: false, error: "Failed to delete sale" };
  }
  redirect("/sales/records");
}

export async function togglePaidStatus(id: number, currentStatus: boolean) {
  try {
    await asyncTogglePaidStatus(id, currentStatus);
    revalidatePath(`/sales/records/${id}`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to toggle status" };
  }
}

export async function getSalesRecordData(): Promise<SaleListItem[]> {
  const sales = await asyncGetSalesData();
  return sales.map(toSaleListItem);
}

export async function getAuthorPaymentData() {
  return await asyncGetAuthorPaymentData();
}
