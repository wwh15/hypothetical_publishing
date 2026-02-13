"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SaleListItem } from "@/lib/data/records";
import {
  getPresetColumns,
  getColumnsByVisibleIds,
  SalesColumnId,
} from "@/lib/table-configs/sales-columns";
import { createSalesRecordPath } from "@/lib/table-configs/navigation";
import { PaginationControls } from "@/components/PaginationControls";
import { BaseDataTable, ColumnDef } from "@/components/BaseDataTable";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Table that displays sales rows. Can be used in two ways:
 * - Simple: just rows (no pagination/sort in URL).
 * - Server-paginated: pass total, page, pageSize, sortBy, sortDir, basePath, and paramPrefix
 *   (e.g. basePath="/books/123", paramPrefix="sales" for salesPage, salesSortBy, etc.).
 */
interface SalesRowsTableProps {
  rows: SaleListItem[];
  preset?: "full" | "bookDetail" | "minimal";
  visibleColumns?: SalesColumnId[];
  navigationContext?: Record<string, string | number>;

  /** When set, show pagination and server-driven sort (URL params). */
  total?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  /** Base path for pagination/sort links (e.g. /books/123). */
  basePath?: string;
  /** Query param prefix (e.g. "sales" → salesPage, salesSortBy, salesSortDir, salesPageSize). */
  paramPrefix?: string;
}

export default function SalesRowsTable({
  rows,
  preset = "full",
  visibleColumns,
  navigationContext,
  total,
  page,
  pageSize,
  sortBy,
  sortDir,
  basePath,
  paramPrefix = "sales",
}: SalesRowsTableProps) {
  const router = useRouter();

  const hasPagination =
    total !== undefined &&
    page !== undefined &&
    pageSize !== undefined &&
    basePath &&
    total > 0;

  const totalPages = useMemo(
    () => (hasPagination && pageSize! > 0 ? Math.ceil(total! / pageSize!) : 1),
    [hasPagination, total, pageSize]
  );

  const buildParams = useCallback(
    (
      overrides: {
        page?: number;
        sortBy?: string | null;
        sortDir?: "asc" | "desc" | null;
        pageSize?: number;
      } = {}
    ) => {
      const p = overrides.page ?? page ?? 1;
      const sb = "sortBy" in overrides ? overrides.sortBy : sortBy ?? "date";
      const sd = "sortDir" in overrides ? overrides.sortDir : sortDir ?? "desc";
      const ps = overrides.pageSize ?? pageSize ?? 10;
      const params = new URLSearchParams();
      params.set(`${paramPrefix}Page`, String(p));
      if (sb != null) params.set(`${paramPrefix}SortBy`, sb);
      if (sd != null) params.set(`${paramPrefix}SortDir`, sd);
      params.set(`${paramPrefix}PageSize`, String(ps));
      return params.toString();
    },
    [page, sortBy, sortDir, pageSize, paramPrefix]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (!basePath) return;
      router.push(`${basePath}?${buildParams({ page: newPage })}`, { scroll: false });
    },
    [router, buildParams, basePath]
  );

  const handleSortChange = useCallback(
    (field: string, direction: "asc" | "desc") => {
      if (!basePath) return;
      router.push(
        `${basePath}?${buildParams({
          sortBy: direction === null ? null : field,
          sortDir: direction,
          page: 1,
        })}`,
        { scroll: false }
      );
    },
    [buildParams, router, basePath]
  );

  const columns: ColumnDef<SaleListItem>[] = useMemo(() => {

    // Get visible columns if specified, else get preset columns
    const baseCols = visibleColumns
      ? getColumnsByVisibleIds(visibleColumns)
      : getPresetColumns(preset);

    // Loop over columns
    return baseCols.map((col) => {

      // Check if we are sorting by the current column
      const isSorted = sortBy === col.key;

      // Update the header of the current column
      return {
        ...col,
        header: (
          <div className="flex flex-col gap-1">
            <span className="font-semibold flex items-center gap-1">
              {col.header as string}
              <button
                type="button"
                onClick={() => {

                  // Switch between ascending and descending sort
                  const nextDirection =
                    isSorted && sortDir === "desc" ? "asc" : "desc";
                  handleSortChange(col.key, nextDirection);
                }}

                // Styling for sort button
                className={cn(
                  "ml-1 p-0.5 rounded hover:bg-muted transition-colors",
                  isSorted && "text-blue-600 bg-blue-50 dark:bg-blue-900/20"
                )}
                aria-label={`Sort by ${col.header}`}
              >
                {!isSorted ? (
                  <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                ) : sortDir === "asc" ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </button>
            </span>
          </div>
        ),
      };
    });
  }, [visibleColumns, preset, sortBy, sortDir, handleSortChange]);

  const handleRowClick = (row: SaleListItem) => {
    if (navigationContext) {
      const params: Record<string, string> = {};
      Object.entries(navigationContext).forEach(([key, value]) => {
        if (value !== undefined) params[key] = String(value);
      });
      router.push(createSalesRecordPath(row.id, "/sales/records", params));
    } else {
      router.push(createSalesRecordPath(row.id));
    }
  };

  if (hasPagination) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Showing {rows.length} of {total} sales
        </p>
        <BaseDataTable<SaleListItem>
          columns={columns}
          data={rows}
          emptyMessage="No sales found"
          onRowClick={handleRowClick}
        />
        {totalPages > 1 && (
          <div className="flex justify-end">
            <PaginationControls
              currentPage={page!}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <BaseDataTable<SaleListItem>
      columns={columns}
      data={rows}
      emptyMessage="No sales found"
      onRowClick={handleRowClick}
    />
  );
}
