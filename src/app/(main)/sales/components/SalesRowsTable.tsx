"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/DataTable";
import { SaleListItem } from "@/lib/data/records";
import {
  getPresetColumns,
  getColumnsByVisibleIds,
  SalesColumnId,
} from "@/lib/table-configs/sales-columns";
import { createSalesRecordPath } from "@/lib/table-configs/navigation";
import { PaginationControls } from "@/components/PaginationControls";

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
  const columns = visibleColumns
    ? getColumnsByVisibleIds(visibleColumns)
    : getPresetColumns(preset);

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

  const buildParams = (overrides: {
    page?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    pageSize?: number;
  } = {}) => {
    const p = overrides.page ?? page ?? 1;
    const sb = overrides.sortBy ?? sortBy ?? "date";
    const sd = overrides.sortDir ?? sortDir ?? "desc";
    const ps = overrides.pageSize ?? pageSize ?? 10;
    const params = new URLSearchParams();
    params.set(`${paramPrefix}Page`, String(p));
    params.set(`${paramPrefix}SortBy`, sb);
    params.set(`${paramPrefix}SortDir`, sd);
    params.set(`${paramPrefix}PageSize`, String(ps));
    return params.toString();
  };

  const handlePageChange = (newPage: number) => {
    if (!basePath) return;
    router.push(`${basePath}?${buildParams({ page: newPage })}`);
  };

  const handleSortChange = (field: string, direction: "asc" | "desc") => {
    if (!basePath) return;
    router.push(`${basePath}?${buildParams({ sortBy: field, sortDir: direction, page: 1 })}`);
  };

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
        <DataTable<SaleListItem>
          columns={columns}
          data={rows}
          emptyMessage="No sales found"
          onRowClick={handleRowClick}
          sortField={sortBy}
          sortDirection={sortDir}
          onSortChange={handleSortChange}
          showPagination={false}
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
    <DataTable<SaleListItem>
      columns={columns}
      data={rows}
      emptyMessage="No sales found"
      onRowClick={handleRowClick}
      defaultSortField="date"
      defaultSortDirection="desc"
      showPagination={false}
    />
  );
}
