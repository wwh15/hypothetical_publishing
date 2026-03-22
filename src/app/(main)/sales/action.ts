"use server";

import asyncGetAuthorPaymentData from "@/lib/data/author-payment";
import asyncGetSalesData, {
  getSalesData,
  asyncDeleteSale,
  asyncTogglePaidStatus,
  asyncUpdateSale,
  toSaleListItem,
  SaleListItem,
  SaleDetailPayload,
  asyncAddSale,
  asyncGetSaleById,
  UpdateSaleItem,
} from "@/lib/data/records";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function addSale(data: Prisma.SaleUncheckedCreateInput) {
  try {
    const created = await asyncAddSale(data);
    revalidatePath("/sales/records");
    revalidatePath("/sales/add-record");
    revalidatePath(`/books/${created.bookId}`);
    return { success: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to add sale";
    return { success: false, error: message };
  }
}

export async function updateSale(
  id: number,
  data: UpdateSaleItem
) {
  try {
    const updated = await asyncUpdateSale(id, data);
    revalidatePath(`/sales/records/${id}`);
    revalidatePath("/sales/records");
    revalidatePath(`/books/${updated.bookId}`);
    return { success: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to update sale";
    return { success: false, error: message };
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

export type SalesRecordsPageResult = Awaited<ReturnType<typeof getSalesData>>;

export async function getSalesRecordsPage(params: {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  dateFrom?: string;
  dateTo?: string;
}): Promise<SalesRecordsPageResult> {
  return getSalesData(params);
}

export async function getSaleById(id: number): Promise<SaleDetailPayload | null> {
  return await asyncGetSaleById(id);
}

export async function getAuthorPaymentData() {
  return await asyncGetAuthorPaymentData();
}

export async function getAuthorPaymentDataPage(params: {
  page: number;
  pageSize: number;
}) {
  return await asyncGetAuthorPaymentData(params.page, params.pageSize);
}
