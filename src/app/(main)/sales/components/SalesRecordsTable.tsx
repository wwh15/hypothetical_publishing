"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SaleListItem, type SaleReleaseFilter } from "@/lib/data/records";
import {
  salesTablePresets,
  getPresetColumns,
  getColumnsByVisibleIds,
  saleListRowClassNameForBookReleased,
  SalesColumnId,
} from "@/lib/table-configs/sales-columns";
import { createSalesRecordPath } from "@/lib/table-configs/navigation";
import { PaginationControls } from "@/components/PaginationControls";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableInfo } from "@/components/TableInfo";
import { BaseDataTable } from "@/components/BaseDataTable";
// Change this line:
import { ColumnDef } from "@/components/BaseDataTable";
import { MonthYearFilter } from "@/components/MonthYearFilter";

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
  /** Show all records (no pagination) */
  showAll?: boolean;
  /** Source filter (DISTRIBUTOR, HAND_SOLD, or KICKSTARTER) */
  source?: string;
  /** Distributor filter (INGRAM_SPARK, AMAZON, OTHER) */
  distributor?: string;
  /** Format filter (PRINT, EBOOK, KINDLE_UNLIMITED) */
  format?: string;
  /** projected = unreleased book; realized = released book (URL: release=…) */
  saleRelease?: SaleReleaseFilter;

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
  showAll = false,
  source,
  distributor,
  format,
  saleRelease,
  preset = "full",
  visibleColumns,
  onRowClick,
  navigationContext,
}: SalesRecordsTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(search);

  const totalPages = useMemo(
    () => (total > 0 && pageSize > 0 ? Math.ceil(total / pageSize) : 1),
    [total, pageSize]
  );

  const buildQueryParams = useCallback(
    (
      overrides: {
        page?: number;
        q?: string;
        sortBy?: string | null;
        sortDir?: "asc" | "desc" | null;
        dateFrom?: string;
        dateTo?: string;
        showAll?: boolean;
        source?: string;
        distributor?: string;
        format?: string;
        saleRelease?: SaleReleaseFilter | "";
      } = {}
    ) => {
      const params = new URLSearchParams();
      const q = overrides.q !== undefined ? overrides.q : search.trim();
      const p = overrides.page ?? page;
      const sb = "sortBy" in overrides ? overrides.sortBy : sortBy;
      const sd = "sortDir" in overrides ? overrides.sortDir : sortDir;
      const df =
        overrides.dateFrom !== undefined ? overrides.dateFrom : dateFrom;
      const dt = overrides.dateTo !== undefined ? overrides.dateTo : dateTo;
      const sa = overrides.showAll !== undefined ? overrides.showAll : showAll;
      const src = overrides.source !== undefined ? overrides.source : source;
      const dist = overrides.distributor !== undefined ? overrides.distributor : distributor;
      const fmt = overrides.format !== undefined ? overrides.format : format;
      const rel =
        overrides.saleRelease !== undefined ? overrides.saleRelease : saleRelease;

      if (q) params.set("q", q);
      params.set("page", String(p));
      if (sb != null) params.set("sortBy", sb);
      if (sd != null) params.set("sortDir", sd);
      if (df) params.set("dateFrom", df);
      if (dt) params.set("dateTo", dt);
      if (sa) params.set("showAll", "true");
      if (src) params.set("source", src);
      if (dist) params.set("distributor", dist);
      if (fmt) params.set("format", fmt);
      if (rel) params.set("release", rel);
      return params;
    },
    [
      search,
      page,
      sortBy,
      sortDir,
      dateFrom,
      dateTo,
      showAll,
      source,
      distributor,
      format,
      saleRelease,
    ]
  );

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

  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = buildQueryParams({ page: newPage });
      router.push(`/sales/records?${params.toString()}`);
    },
    [router, buildQueryParams]
  );

  const handleSortChange = useCallback(
    (field: string, direction: "asc" | "desc") => {
      const params = buildQueryParams({
        sortBy: field,
        sortDir: direction,
        page: 1, // Always reset to page 1 on sort
      });
      router.push(`/sales/records?${params.toString()}`);
    },
    [buildQueryParams, router]
  );

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

  const handleToggleShowAll = () => {
    const params = buildQueryParams({
      showAll: !showAll,
      page: 1,
    });
    router.push(`/sales/records?${params.toString()}`);
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = buildQueryParams({ source: e.target.value, page: 1 });
    router.push(`/sales/records?${params.toString()}`);
  };

  const hasSearch = search.trim().length > 0;
  const hasDateFilter = !!(dateFrom || dateTo);
  const hasSourceFilter = !!source;
  const hasDistributorFilter = !!distributor;
  const hasFormatFilter = !!format;
  const hasReleaseFilter = !!saleRelease;
  const normalPageSize = 20;
  const startRecord = showAll ? 1 : (page - 1) * normalPageSize + 1;
  const endRecord = showAll ? total : Math.min(page * normalPageSize, total);

  const columns: ColumnDef<SaleListItem>[] = useMemo(() => {
    const baseCols = visibleColumns
      ? getColumnsByVisibleIds(visibleColumns)
      : getPresetColumns(preset);

    return baseCols.map((col) => {
      const isSorted = sortBy === col.key;
      const label = col.header as string;
      const sortLabel = col.headerTitle ?? label;

      return {
        ...col,
        header: (
          <div className="w-full min-w-0 max-w-full">
            <div className="flex min-w-0 items-center gap-0.5 font-semibold">
              <span className="min-w-0 flex-1 truncate" title={sortLabel}>
                {label}
              </span>
              <button
                type="button"
                onClick={() => {
                  const nextDirection =
                    isSorted && sortDir === "desc" ? "asc" : "desc";
                  handleSortChange(col.key, nextDirection);
                }}
                className={cn(
                  "shrink-0 p-0.5 rounded hover:bg-muted transition-colors",
                  isSorted && "text-blue-600 bg-blue-50 dark:bg-blue-900/20"
                )}
                aria-label={`Sort by ${sortLabel}`}
              >
                {!isSorted ? (
                  <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                ) : sortDir === "asc" ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        ),
      };
    });
  }, [visibleColumns, preset, sortBy, sortDir, handleSortChange]);

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

  const filterSelectClass = cn(
    "h-10 w-full min-w-0 border border-gray-300 dark:border-gray-700 rounded-lg",
    "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm",
    "px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  );

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex min-w-0 flex-col gap-3">
        <form onSubmit={handleSearchSubmit} className="relative min-w-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, author, or series..."
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

        <div className="grid min-w-0 max-w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <select
            value={source ?? ""}
            onChange={handleSourceChange}
            className={cn(filterSelectClass, "lg:col-span-2")}
          >
            <option value="">All Sources</option>
            <option value="DISTRIBUTOR">Distributor</option>
            <option value="HAND_SOLD">Hand Sold</option>
            <option value="KICKSTARTER">Kickstarter</option>
          </select>

          <select
            value={saleRelease ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const params = buildQueryParams({
                saleRelease:
                  v === "projected" || v === "realized"
                    ? (v as SaleReleaseFilter)
                    : "",
                page: 1,
              });
              router.push(`/sales/records?${params.toString()}`);
            }}
            className={cn(filterSelectClass, "lg:col-span-2")}
          >
            <option value="">All (projected + realized)</option>
            <option value="realized">Realized (released book)</option>
            <option value="projected">Projected (unreleased book)</option>
          </select>

          <select
            value={distributor ?? ""}
            onChange={(e) => {
              const params = buildQueryParams({
                distributor: e.target.value,
                page: 1,
              });
              router.push(`/sales/records?${params.toString()}`);
            }}
            className={cn(filterSelectClass, "lg:col-span-2")}
          >
            <option value="">All Distributors</option>
            <option value="INGRAM_SPARK">Ingram Spark</option>
            <option value="AMAZON">Amazon</option>
            <option value="OTHER">Other</option>
          </select>

          <select
            value={format ?? ""}
            onChange={(e) => {
              const params = buildQueryParams({
                format: e.target.value,
                page: 1,
              });
              router.push(`/sales/records?${params.toString()}`);
            }}
            className={cn(filterSelectClass, "lg:col-span-2")}
          >
            <option value="">All Formats</option>
            <option value="PRINT">Print</option>
            <option value="EBOOK">Ebook</option>
            <option value="KINDLE_UNLIMITED">Kindle Unlimited</option>
          </select>

          <div className="min-w-0 sm:col-span-2 lg:col-span-4">
            <MonthYearFilter
              startDate={dateFrom}
              endDate={dateTo}
              onStartDateChange={handleDateFromChange}
              onEndDateChange={handleDateToChange}
              onClear={handleDateClear}
              hasActiveFilter={hasDateFilter}
            />
          </div>
        </div>
      </div>

      {total > 0 && (
        <TableInfo
          startRecord={startRecord}
          endRecord={endRecord}
          totalRecords={total}
          showAll={showAll}
          itemsPerPage={normalPageSize}
          onToggleShowAll={handleToggleShowAll}
        />
      )}

      {total > 0 && (
        <p className="text-xs text-muted-foreground">
          Muted rows are sales for books not yet marked released (pre-release).
        </p>
      )}

      <BaseDataTable<SaleListItem>
        columns={columns}
        data={rows}
        emptyMessage={
          hasSearch ||
          hasDateFilter ||
          hasSourceFilter ||
          hasDistributorFilter ||
          hasFormatFilter ||
          hasReleaseFilter
            ? "No records match your filters"
            : "No sales records"
        }
        onRowClick={handleRowClick}
        getRowClassName={saleListRowClassNameForBookReleased}
      />

      {totalPages > 1 && !showAll && (
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
