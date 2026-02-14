import { getSalesData } from "@/lib/data/records";
import SalesRecordsTable from "@/app/(main)/sales/components/SalesRecordsTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Ensure the page is always dynamic to reflect real-time 
 * database changes and URL parameter updates.
 */
export const dynamic = "force-dynamic";

interface SalesRecordsPageProps {
  searchParams?: Promise<{
    q?: string;
    page?: string;
    sortBy?: string;
    sortDir?: string;
    dateFrom?: string;
    dateTo?: string;
    showAll?: string;
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
    });

  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="mb-8 space-y-6">
        {/* Navigation Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/sales">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              ← Back to Sales Dashboard
            </Button>
          </Link>
          <Link href="/sales/add-record">
            <Button size="sm" className="w-full sm:w-auto">
              Add New Sale Record
            </Button>
          </Link>
        </div>

        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Sales Records
          </h1>
          <p className="text-muted-foreground mt-2">
            Detailed list of all transactions, revenue, and author royalties.
          </p>
        </div>
      </div>

      {/* The Table Component. 
        Note the 'key' prop: this forces the client component to completely 
        remount/reset when the URL changes, preventing "stale" UI states. 
      */}
      <SalesRecordsTable
        key={`${search}-${sortBy}-${sortDir}-${currentPage}-${dateFrom}-${dateTo}-${showAll}`}
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
      />
    </div>
  );
}