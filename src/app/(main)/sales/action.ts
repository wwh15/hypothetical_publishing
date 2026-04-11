"use server";

import { STATIC_FALLBACK_RATES } from "@/lib/currency-constants";
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
  type SaleReleaseFilter,
} from "@/lib/data/records";
import { normalizeQuantity } from "@/lib/validation";
import { Prisma, type SaleSource } from "@prisma/client";
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
      console.error("API Request Failed:", data);
      throw new Error("API Request Failed");
    }

    if (typeof conversion !== "number") {
      console.error("API returned success but no USD rate was found:", data);
      throw new Error("USD rate missing from API response");
    }

    return conversion;
  } catch (error) {
    console.warn(`Conversion API failed for ${currencyCode}. Using static fallback.`);
    
    const rate = STATIC_FALLBACK_RATES[currencyCode];
    
    if (rate) {
      // Logic: Since the rate is "Units per 1 USD", we divide.
      // Example: 15,150 JPY / 151.50 = 100 USD
      return amount / rate;
    }

    // 4. Final Fail-Safe: If currency isn't in our static map
    console.error(`Critical: No fallback rate for ${currencyCode}`);
    throw error;
  }
}

/**
 * Static fallback rates (Units per 1 USD). 
 * Used only if the primary ExchangeRate-API call fails.
 */

export async function getUsdConversionRates(): Promise<Record<string, number>> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  try {
    if (!apiKey) throw new Error("API Key missing");

    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;
    const response = await fetch(url, { next: { revalidate: 3600 } });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();
    if (data.result === "success" && data.conversion_rates) {
      return data.conversion_rates;
    }
    
    throw new Error("Invalid API response format");

  } catch (error) {
    console.error("Currency Fetch Failed. Falling back to static rates.", error);
    // Returning static rates ensures the UI doesn't crash
    return STATIC_FALLBACK_RATES;
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
    const message = e instanceof Error ? e.message : "Failed to add sale";
    return { success: false, error: message };
  }
}

export async function addSalesBulk(records: PendingSaleItem[]) {
  try {
    await asyncAddSalesBulk(records);
    return { success: true };
  } catch (error) {
    console.error("Bulk Save Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to save records to database.";
    return {
      success: false,
      error:
        message.length > 400 ? `${message.slice(0, 400)}…` : message,
    };
  }
}

export async function updateSale(id: number, data: UpdateSaleItem) {
  try {
    const updated = await asyncUpdateSale(id, data);
    revalidatePath(`/sales/records/${id}`);
    revalidatePath("/sales/records");
    revalidatePath(`/books/${updated.bookId}`);
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update sale";
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

export async function getSaleById(
  id: number
): Promise<SaleDetailPayload | null> {
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
  KICKSTARTER: "Kickstarter",
};

const DISTRIBUTOR_LABELS: Record<string, string> = {
  AMAZON: "Amazon",
  INGRAM_SPARK: "Ingram Spark",
  OTHER: "Other",
};

/**
 * CSV export format column per HP Sales Record CSV spec v4 (source + distributor + internal format).
 */
function getCsvExportFormat(sale: SaleListItem): string {
  const { source, distributor, format } = sale;
  if (source === "HAND_SOLD") return "Print";
  if (source === "KICKSTARTER") {
    if (format === "PRINT") return "Print";
    if (format === "EBOOK") return "Ebook";
    if (format === "KINDLE_UNLIMITED") return "Ebook";
    return "Print";
  }
  if (source === "DISTRIBUTOR") {
    const d = distributor ?? "OTHER";
    if (d === "INGRAM_SPARK") return "Print";
    if (d === "AMAZON") {
      if (format === "PRINT") return "Print";
      if (format === "EBOOK") return "Ebook";
      if (format === "KINDLE_UNLIMITED") return "Kindle Unlimited";
    }
    if (d === "OTHER") {
      if (format === "KINDLE_UNLIMITED") return "Ebook";
      if (format === "PRINT") return "Print";
      if (format === "EBOOK") return "Ebook";
    }
  }
  return FORMAT_LABELS[format] ?? format;
}

function getCsvQuantityAndKenp(
  exportFormat: string,
  sale: SaleListItem
): { quantity: string | number; kenp: string | number } {
  if (exportFormat === "Kindle Unlimited") {
    const value = sale.kenp;
    if (!Number.isInteger(value) || (value as number) <= 0) {
      throw new Error(
        `Sales Record for "${sale.title}" (Date: ${sale.date.toISOString().slice(0, 7)}) is marked as Kindle Unlimited but is missing a positive, integer KENP value: ${value}.`
      );
    }
    return { quantity: "N/A", kenp: value as number };
  }
  if (exportFormat === "Print" || exportFormat === "Ebook") {
    const q = sale.quantity;
    if (q == null || !Number.isInteger(q) || q <= 0) {
      throw new Error(
        `Sales Record for "${sale.title}" (Date: ${sale.date.toISOString().slice(0, 7)}) requires a positive integer Quantity for format "${exportFormat}": ${q}.`
      );
    }
    return { quantity: q, kenp: "N/A" };
  }
  return { quantity: "N/A", kenp: "N/A" };
}

const csvEscape = (
  val: string | null | undefined,
  maxLength?: number
): string => {
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
  source?: SaleSource;
  distributor?: "INGRAM_SPARK" | "AMAZON" | "OTHER";
  format?: "PRINT" | "EBOOK" | "KINDLE_UNLIMITED";
  saleRelease?: SaleReleaseFilter;
}) {
  try {
    // 1. Fetch the full list matching current filters (Pagination: false)
    const { items } = await getSalesData({
      ...params,
      pagination: false,
    });

    if (items.length === 0) {
      return {
        success: false,
        error: "No sale records found matching your current filters.",
      };
    }

    // 2. Define Headers (HP Sales Record CSV export spec v4, RFC 4180)
    const headers = [
      "Date",
      "Title",
      "Author",
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
      "isProjected?",
      "Comment",
    ];

    // 3. Map to CSV Rows
    const rows = items.map((sale) => {
      const displaySource = SOURCE_LABELS[sale.source] || sale.source;
      const displayFormat = getCsvExportFormat(sale);
      const displayDistributor =
        sale.source === "HAND_SOLD" || sale.source === "KICKSTARTER"
          ? "N/A"
          : sale.distributor
            ? DISTRIBUTOR_LABELS[sale.distributor]
            : "Other";

      const { quantity, kenp } = getCsvQuantityAndKenp(displayFormat, sale);

      const originalRev =
        sale.currency === "JPY"
          ? Math.floor(sale.publisherRevenueOriginal).toString()
          : sale.publisherRevenueOriginal.toFixed(2);

      const usdRev = sale.publisherRevenueUSD.toFixed(2);
      const royalty = sale.authorRoyalty.toFixed(2);

      const royaltyStatus = sale.paid === "paid" ? "Paid" : "Unpaid";
      const isProjected = sale.bookReleased ? "False" : "True";

      const kenpOut =
        typeof kenp === "number" ? normalizeQuantity(kenp) : kenp;
      const quantityOut =
        typeof quantity === "number" ? normalizeQuantity(quantity) : quantity;

      return [
        csvEscape(sale.date.toISOString().slice(0, 7)),
        csvEscape(sale.title),
        csvEscape(sale.author),
        csvEscape(displaySource),
        csvEscape(displayDistributor),
        csvEscape(displayFormat),
        csvEscape(String(quantityOut)),
        csvEscape(String(kenpOut)),
        csvEscape(sale.currency),
        csvEscape(originalRev),
        csvEscape(usdRev),
        csvEscape(royalty),
        csvEscape(royaltyStatus),
        csvEscape(isProjected),
        csvEscape(sale.comment, 256),
      ].join(",");
    });

    // 4. Return the combined string (UTF-8; client prepends BOM per spec)
    const headerRow = headers.map((h) => csvEscape(h)).join(",");
    return {
      success: true,
      data: [headerRow, ...rows].join("\n"),
    };
  } catch (error) {
    console.error("Export Error:", error);

    // Extract the specific message we threw above
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred during export.";

    return {
      success: false,
      error: errorMessage,
    };
  }
}
