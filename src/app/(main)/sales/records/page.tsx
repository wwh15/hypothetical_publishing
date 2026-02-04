import { getSalesRecordsPage } from "../action";
import SalesRecordsTable from "@/app/(main)/sales/components/SalesRecordsTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface SalesRecordsPageProps {
  searchParams?: Promise<{
    q?: string;
    page?: string;
    sortBy?: string;
    sortDir?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function SalesRecordsPage({
  searchParams,
}: SalesRecordsPageProps) {
  const params = await searchParams;
  const search = params?.q ?? "";
  const pageParam = params?.page ?? "1";
  const page = Number(pageParam) || 1;
  const pageSize = 20;
  const sortBy = params?.sortBy ?? "date";
  const sortDir =
    (params?.sortDir === "asc" ? "asc" : "desc") as "asc" | "desc";
  const dateFrom = params?.dateFrom ?? "";
  const dateTo = params?.dateTo ?? "";

  const { items, total, page: currentPage, pageSize: effectivePageSize } =
    await getSalesRecordsPage({
      search,
      page,
      pageSize,
      sortBy,
      sortDir,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 space-y-6">
        <div className="flex flex-col gap-3">
          <Link href="/sales" className="w-fit">
            <Button variant="outline" size="sm">
              ← Back to Sales
            </Button>
          </Link>
          <Link href="/sales/add-record" className="w-fit">
            <Button size="sm">Add New Sale Record</Button>
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Sales Records
          </h1>
          <p className="text-muted-foreground mt-2">
            View and manage all sales transactions
          </p>
        </div>
      </div>
      <SalesRecordsTable
        key={`${search}-${sortBy}-${sortDir}-${currentPage}-${dateFrom}-${dateTo}`}
        rows={items}
        total={total}
        page={currentPage}
        pageSize={effectivePageSize}
        search={search}
        sortBy={sortBy}
        sortDir={sortDir}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
    </div>
  );
}