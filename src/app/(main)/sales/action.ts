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
  PendingSaleItem,
  asyncAddSalesBulk,
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

/**
 * Latest "foreign units per 1 USD" table (same as ExchangeRate-API `conversion_rates` with base USD).
 * Cached on the server for one hour. Used by sales forms for instant USD equivalents without
 * a round trip per keystroke.
 */
export async function getUsdConversionRates(): Promise<Record<string, number>> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  if (apiKey) {
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }
    const data = (await response.json()) as {
      result?: string;
      conversion_rates?: Record<string, number>;
    };
    if (data.result !== "success" || !data.conversion_rates) {
      throw new Error("Exchange rate API returned an unexpected payload");
    }
    return data.conversion_rates;
  }

  const response = await fetch("https://api.frankfurter.app/latest?from=USD", {
    next: { revalidate: 3600 },
  });
  if (!response.ok) {
    throw new Error(`Frankfurter API error: ${response.status}`);
  }
  const data = (await response.json()) as {
    rates?: Record<string, number>;
  };
  if (!data.rates || typeof data.rates !== "object") {
    throw new Error("Frankfurter returned an unexpected payload");
  }
  return { USD: 1, ...data.rates };
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

export async function addSalesBulk(records: PendingSaleItem[]) {
  try {

    await asyncAddSalesBulk(records)
    return { success: true };
    
  } catch (error) {
    console.error("Bulk Save Error:", error);
    return { success: false, error: "Failed to save records to database." };
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


/**
 * Server Action to generate CSV content based on current filters.
 * Returns a raw CSV string to the client.
 */

const FORMAT_LABELS: Record<string, string> = {
  PRINT: "Print",
  EBOOK: "Ebook",
  KINDLE_UNLIMITED: "Kindle Unlimited",
};

const SOURCE_LABELS: Record<string, string> = {
  HAND_SOLD: "Handsold",
  DISTRIBUTOR: "Distributor",
};

const DISTRIBUTOR_LABELS: Record<string, string> = {
  AMAZON: "Amazon",
  INGRAM_SPARK: "Ingram Spark",
  OTHER: "Other",
};

const csvEscape = (val: string | null | undefined, maxLength?: number): string => {
  let text = val || "";
  if (maxLength) text = text.slice(0, maxLength);
  
  // 1. Escape internal quotes
  // 2. Wrap in external quotes
  return `"${text.replace(/"/g, '""')}"`;
};

export async function exportSalesToCsvAction(params: {
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  dateFrom?: string;
  dateTo?: string;
  source?: "DISTRIBUTOR" | "HAND_SOLD";
  distributor?: "INGRAM_SPARK" | "AMAZON" | "OTHER";
  format?: "PRINT" | "EBOOK" | "KINDLE_UNLIMITED";
}) {
  try {
    // 1. Fetch the full list matching current filters (Pagination: false)
    const { items } = await getSalesData({
      ...params,
      pagination: false,
    });

    if (items.length === 0) {
      return { success: false, error: "No sale records found matching your current filters." };
    }

    // 2. Define Headers
    const headers = [
      "Date",
      "Author",
      "Title",
      "Source",
      "Distributor",
      "Format",
      "Quantity",
      "KENP",
      "Original Currency",
      "Pub. Revenue (Original)",
      "Pub. Revenue (USD)",
      "Author Royalty (USD)",
      "Royalty Status",
      "Comment",
    ];

    // 3. Map to CSV Rows
    const rows = items.map((sale) => {
      // 1. Determine Display Values
      const displaySource = SOURCE_LABELS[sale.source] || sale.source;
      const displayFormat = FORMAT_LABELS[sale.format] || sale.format;
      const displayDistributor =
        sale.source === "HAND_SOLD"
          ? "N/A"
          : sale.distributor
          ? DISTRIBUTOR_LABELS[sale.distributor]
          : "Other";

      // 2. Logic for Format-Specific Columns
      const quantity =
        sale.format === "EBOOK" || sale.format === "PRINT"
          ? sale.quantity
          : "N/A";
      
      const kenp = sale.format === "KINDLE_UNLIMITED" ? sale.kenp : "N/A";

      const originalRev =
        sale.currency === "JPY"
          ? Math.floor(sale.publisherRevenueOriginal).toString()
          : sale.publisherRevenueOriginal.toFixed(2);

      const usdRev = sale.publisherRevenueUSD.toFixed(2);
      const royalty = sale.authorRoyalty.toFixed(2);

      return [
        sale.date.toISOString().slice(0, 7),
        csvEscape(sale.author),
        csvEscape(sale.title),
        displaySource,
        displayDistributor,
        displayFormat,
        quantity,
        kenp,
        sale.currency,
        originalRev,
        usdRev,
        royalty,
        sale.paid === "paid" ? "Paid" : "Unpaid", // Using boolean check
        csvEscape(sale.comment, 256), // Wrap comments in quotes too!
      ].join(",");
    });

    // 4. Return the combined string
    return { 
      success: true, 
      data: [headers.join(","), ...rows].join("\n") 
    };

  } catch (error) {
    console.error("CSV Generation Failed:", error);
    return { success: false, error: "Failed to generate CSV data" };
  }
}
