import { getSalesData, type SaleReleaseFilter } from "@/lib/data/records";
import SalesRecordsTable from "@/app/(main)/sales/components/SalesRecordsTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExportCSVButton } from "../components/ExportCSVButton";
import type { SaleSource } from "@prisma/client";

const VALID_SOURCES: readonly SaleSource[] = [
  "DISTRIBUTOR",
  "HAND_SOLD",
  "KICKSTARTER",
];

/**
 * Ensure the page is always dynamic to reflect real-time 
 * database changes and URL parameter updates.
 */
export const dynamic = "force-dynamic";

const VALID_DISTRIBUTORS = ["INGRAM_SPARK", "AMAZON", "OTHER"] as const;
const VALID_FORMATS = ["PRINT", "EBOOK", "KINDLE_UNLIMITED"] as const;

interface SalesRecordsPageProps {
  searchParams?: Promise<{
    q?: string;
    page?: string;
    sortBy?: string;
    sortDir?: string;
    dateFrom?: string;
    dateTo?: string;
    showAll?: string;
    source?: string;
    distributor?: string;
    format?: string;
    release?: string;
  }>;
}

export default async function SalesRecordsPage({
  searchParams,
}: SalesRecordsPageProps) {
  // 1. Await and extract search parameters from the URL
  const params = await searchParams;
  
  const search = params?.q ?? "";
  const page = Number(params?.page) || 1;
  const showAll = params?.showAll === "true";
  
  // Use a high limit for 'showAll' mode, otherwise default to your standard page size
  const pageSize = showAll ? 10000 : 20;
  
  const sortBy = params?.sortBy ?? "date";
  const sortDir = (params?.sortDir === "asc" ? "asc" : "desc") as "asc" | "desc";
  
  // Dates are passed as MM-YYYY strings to the data layer for parsing
  const dateFrom = params?.dateFrom ?? "";
  const dateTo = params?.dateTo ?? "";

  // Source filter: only accept valid enum values
  const rawSource = params?.source;
  const source = VALID_SOURCES.includes(rawSource as SaleSource)
    ? (rawSource as SaleSource)
    : undefined;

  const rawDistributor = params?.distributor;
  const distributor = rawDistributor && VALID_DISTRIBUTORS.includes(rawDistributor as (typeof VALID_DISTRIBUTORS)[number])
    ? (rawDistributor as (typeof VALID_DISTRIBUTORS)[number])
    : undefined;

  const rawFormat = params?.format;
  const format = rawFormat && VALID_FORMATS.includes(rawFormat as (typeof VALID_FORMATS)[number])
    ? (rawFormat as (typeof VALID_FORMATS)[number])
    : undefined;

  const rawRelease = params?.release;
  const saleRelease: SaleReleaseFilter | undefined =
    rawRelease === "projected"
      ? "projected"
      : rawRelease === "realized" || rawRelease === "real"
        ? "realized"
        : undefined;

  // 2. Fetch the data using the optimized Database logic
  // This call handles filtering, sorting, and pagination in a single SQL query.
  const { items, total, page: currentPage, pageSize: effectivePageSize } =
    await getSalesData({
      search,
      page,
      pageSize,
      sortBy,
      sortDir,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      source,
      distributor,
      format,
      saleRelease,
    });

  return (
    <div className="py-10">
      <div className="mb-8 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/sales/add-record" className="sm:shrink-0">
            <Button size="sm" className="w-full sm:w-auto">
              Add New Sale Record
            </Button>
          </Link>
          <ExportCSVButton
            search={search}
            sortBy={sortBy}
            sortDir={sortDir}
            dateFrom={dateFrom}
            dateTo={dateTo}
            source={source}
            distributor={distributor}
            format={format}
            saleRelease={saleRelease}
            className="w-full sm:w-auto"
          />
        </div>

        <div className="min-w-0 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Sales Records
          </h1>
          <p className="text-muted-foreground">
            Detailed list of all transactions, revenue, and author royalties.
          </p>
        </div>
      </div>

      {/* The Table Component. 
        Note the 'key' prop: this forces the client component to completely 
        remount/reset when the URL changes, preventing "stale" UI states. 
      */}
      <SalesRecordsTable
        key={`${search}-${sortBy}-${sortDir}-${currentPage}-${dateFrom}-${dateTo}-${showAll}-${source ?? ""}-${distributor ?? ""}-${format ?? ""}-${saleRelease ?? ""}`}
        rows={items}
        total={total}
        page={currentPage}
        pageSize={effectivePageSize}
        search={search}
        sortBy={sortBy}
        sortDir={sortDir}
        dateFrom={dateFrom}
        dateTo={dateTo}
        showAll={showAll}
        source={source}
        distributor={distributor}
        format={format}
        saleRelease={saleRelease}
      />
    </div>
  );
}