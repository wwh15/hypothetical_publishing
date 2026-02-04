"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/DataTable";
import { SaleListItem } from "@/lib/data/records";
import {
  salesTablePresets,
  getPresetColumns,
  getColumnsByVisibleIds,
  SalesColumnId,
} from "@/lib/table-configs/sales-columns";
import { createSalesRecordPath } from "@/lib/table-configs/navigation";
import { PaginationControls } from "@/components/PaginationControls";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SalesTablePreset = keyof typeof salesTablePresets;

/** Server-driven state for the sales records table (URL-driven on /sales/records). */
export interface SalesRecordsTableProps {
  /** Sales data for the current page (from server) */
  rows: SaleListItem[];
  /** Total count across all pages (from server) */
  total: number;
  /** Current 1-based page (from server) */
  page: number;
  /** Page size (from server) */
  pageSize: number;
  /** Current search query (from server / URL) */
  search: string;
  /** Current sort field (from server / URL) */
  sortBy: string;
  /** Current sort direction (from server / URL) */
  sortDir: "asc" | "desc";
  /** Date filter from (MM-YYYY, from server / URL) */
  dateFrom?: string;
  /** Date filter to (MM-YYYY, from server / URL) */
  dateTo?: string;

  /** Preset for column selection; default "full" */
  preset?: SalesTablePreset;
  /** Override columns via allowlist (overrides preset) */
  visibleColumns?: SalesColumnId[];
  /** Override row click */
  onRowClick?: (row: SaleListItem) => void;
  /** Add query params when navigating to a record (e.g. from=book&bookId=123) */
  navigationContext?: Record<string, string | number>;
  /** Show date range filter; default true for "full" preset */
  showDateFilter?: boolean;
}

/**
 * Sales records table. All data, pagination, sort, and filter state come from the server (URL on /sales/records).
 */
export default function SalesRecordsTable({
  rows,
  total,
  page,
  pageSize,
  search,
  sortBy,
  sortDir,
  dateFrom = "",
  dateTo = "",
  preset = "full",
  visibleColumns,
  onRowClick,
  navigationContext,
  showDateFilter = true,
}: SalesRecordsTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(search);

  const totalPages = useMemo(
    () => (total > 0 && pageSize > 0 ? Math.ceil(total / pageSize) : 1),
    [total, pageSize]
  );

  const buildQueryParams = (overrides: {
    page?: number;
    q?: string;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    dateFrom?: string;
    dateTo?: string;
  } = {}) => {
    const params = new URLSearchParams();
    const q = overrides.q !== undefined ? overrides.q : search.trim();
    const p = overrides.page ?? page;
    const sb = overrides.sortBy ?? sortBy;
    const sd = overrides.sortDir ?? sortDir;
    const df = overrides.dateFrom !== undefined ? overrides.dateFrom : dateFrom;
    const dt = overrides.dateTo !== undefined ? overrides.dateTo : dateTo;

    if (q) params.set("q", q);
    params.set("page", String(p));
    params.set("sortBy", sb);
    params.set("sortDir", sd);
    if (df) params.set("dateFrom", df);
    if (dt) params.set("dateTo", dt);
    return params;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = buildQueryParams({ q: searchQuery.trim(), page: 1 });
    router.push(`/sales/records?${params.toString()}`);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    const params = buildQueryParams({ q: "", page: 1 });
    router.push(`/sales/records?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = buildQueryParams({ page: newPage });
    router.push(`/sales/records?${params.toString()}`);
  };

  const handleSortChange = (field: string, direction: "asc" | "desc") => {
    const params = buildQueryParams({
      sortBy: field,
      sortDir: direction,
      page: 1,
    });
    router.push(`/sales/records?${params.toString()}`);
  };

  const handleDateFromChange = (value: string) => {
    const params = buildQueryParams({ dateFrom: value, page: 1 });
    router.push(`/sales/records?${params.toString()}`);
  };

  const handleDateToChange = (value: string) => {
    const params = buildQueryParams({ dateTo: value, page: 1 });
    router.push(`/sales/records?${params.toString()}`);
  };

  const handleDateClear = () => {
    const params = buildQueryParams({ dateFrom: "", dateTo: "", page: 1 });
    router.push(`/sales/records?${params.toString()}`);
  };

  const hasSearch = search.trim().length > 0;
  const hasDateFilter = !!(dateFrom || dateTo);

  const columns = visibleColumns
    ? getColumnsByVisibleIds(visibleColumns)
    : getPresetColumns(preset);

  const handleRowClick =
    onRowClick ||
    ((row: SaleListItem) => {
      if (navigationContext) {
        const params: Record<string, string> = {};
        Object.entries(navigationContext).forEach(([key, value]) => {
          if (value !== undefined) params[key] = String(value);
        });
        router.push(createSalesRecordPath(row.id, "/sales/records", params));
      } else {
        router.push(createSalesRecordPath(row.id));
      }
    });

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title or author..."
          className={cn(
            "block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-lg",
            "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
            "placeholder:text-gray-400 dark:placeholder:text-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          )}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </form>

      {showDateFilter && (
        <DateRangeFilter
          startDate={dateFrom}
          endDate={dateTo}
          onStartDateChange={handleDateFromChange}
          onEndDateChange={handleDateToChange}
          onClear={handleDateClear}
          hasActiveFilter={hasDateFilter}
        />
      )}

      <div className="text-sm text-muted-foreground flex justify-between items-center">
        <span>
          {total > 0 ? (
            <>
              Showing page {page} of {totalPages} ({total}{" "}
              {hasSearch || hasDateFilter ? "matching records" : "records"})
            </>
          ) : hasSearch || hasDateFilter ? (
            "No records match your filters"
          ) : (
            "No sales records"
          )}
        </span>
      </div>

      <DataTable<SaleListItem>
        columns={columns}
        data={rows}
        emptyMessage={
          hasSearch || hasDateFilter
            ? "No records match your filters"
            : "No sales records"
        }
        onRowClick={handleRowClick}
        sortField={sortBy}
        sortDirection={sortDir}
        onSortChange={handleSortChange}
        showPagination={false}
      />

      {totalPages > 1 && (
        <div className="flex justify-end">
          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}