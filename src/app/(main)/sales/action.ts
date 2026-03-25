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

export async function convertCurrencyToUsd(
  amount: number,
  currencyCode: string
): Promise<number> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) {
    throw new Error("EXCHANGE_RATE_API_KEY is not set");
  }

  // 1. Same-currency shortcut
  if (currencyCode === "USD") return amount;

  // 2. Validation
  if (!amount || isNaN(amount)) return 0;

  const url = `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${currencyCode}/USD/${amount}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();
    console.log(data);

    // 3. DEFENSIVE CHECK: Dig into the object safely
    // Check if data -> data -> rates -> USD exists
    const conversion = data?.conversion_result;

    if (data.result != "success") {
      console.error("API Request Failed:", data)
      throw new Error("API Request Failed")
    }

    if (typeof conversion !== "number") {
      console.error("API returned success but no USD rate was found:", data);
      throw new Error("USD rate missing from API response");
    }

    return conversion

  } catch (error) {
    console.error("convertCurrencyToUsd failed:", error);
    // CRITICAL: We throw the error so the UI code stops 
    // instead of trying to call .toFixed() on undefined.
    throw error; 
  }
}

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
