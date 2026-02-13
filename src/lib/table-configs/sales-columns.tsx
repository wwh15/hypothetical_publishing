/**
 * Shared column definitions for sales tables
 *
 * Column definitions are pure: header + accessor + renderer.
 * Configs select subsets via stable column IDs.
 */

import React from "react";
import { ColumnDef } from "@/components/BaseDataTable";
import { SaleListItem } from "@/lib/data/records";
import Link from "next/link";

/**
 * Stable column IDs for type-safe column selection
 * Use these IDs in presets and visibleColumns, not field names or headers
 */
export type SalesColumnId =
  | "id"
  | "title"
  | "author"
  | "quantity"
  | "publisherRevenue"
  | "authorRoyalty"
  | "date"
  | "paid";

// Reusable cell renderers
export const salesCellRenderers = {
  currency: (value: number) => (
    <span className="font-medium">${value.toFixed(2)}</span>
  ),

  paidStatus: (status: "paid" | "pending") => {
    const paidStyles = {
      paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    } as const;

    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${paidStyles[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  },

  quantity: (value: number) => <span>{value}</span>,
};

/**
 * Complete column definitions for sales records
 * These are pure definitions - no context-specific behavior
 */
export const salesColumns: ColumnDef<SaleListItem>[] = [
  {
    key: "id",
    header: "ID",
    className: "w-[80px]",
    render: (row) => row.id,
  },
  {
    key: "title",
    header: "Title",
    render: (row) => (
      <Link
        href={`/books/${row.bookId}`}
        onClick={(e) => e.stopPropagation()}
        className="text-blue-600 hover:underline focus:outline focus:underline"
      >
        {row.title}
      </Link>
    ),
  },
  {
    key: "author",
    header: "Author",
    render: (row) => row.author,
  },
  {
    key: "quantity",
    header: "Quantity",
    render: (row) => salesCellRenderers.quantity(row.quantity),
  },
  {
    key: "publisherRevenue",
    header: "Publisher Revenue",
    render: (row) => salesCellRenderers.currency(row.publisherRevenue),
  },
  {
    key: "authorRoyalty",
    header: "Author Royalty",
    render: (row) => salesCellRenderers.currency(row.authorRoyalty),
  },
  {
    key: "date",
    header: "Date",
    render: (row) =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
      }).format(row.date),
  },
  {
    key: "paid",
    header: "Royalty Status",
    render: (row) => salesCellRenderers.paidStatus(row.paid),
  },
];

/**
 * Map of column ID to column definition for fast lookup
 */
const columnMap = new Map<SalesColumnId, ColumnDef<SaleListItem>>();
salesColumns.forEach((col) => {
  columnMap.set(col.key as SalesColumnId, col);
});

/**
 * Get columns by their IDs (internal helper)
 */
function getColumnsByIds(
  columnIds: SalesColumnId[],
): ColumnDef<SaleListItem>[] {
  return columnIds.map((id) => {
    const col = columnMap.get(id);
    if (!col) {
      throw new Error(`Unknown column ID: ${id}`);
    }
    return col;
  });
}

/**
 * Table configuration presets for different contexts
 * Each preset specifies which columns to show via stable column IDs
 */
export const salesTablePresets = {
  // Full table with all columns (sales listing page)
  full: {
    columnIds: [
      "id",
      "title",
      "author",
      "quantity",
      "publisherRevenue",
      "authorRoyalty",
      "date",
      "paid",
    ] as SalesColumnId[],
    defaultSortField: "date" as const,
    defaultSortDirection: "desc" as const,
    showDateFilter: true,
  },

  // Book detail view (hide title/author since they're redundant)
  bookDetail: {
    columnIds: [
      "id",
      "quantity",
      "publisherRevenue",
      "authorRoyalty",
      "date",
      "paid",
    ] as SalesColumnId[],
    defaultSortField: "date" as const,
    defaultSortDirection: "desc" as const,
    showDateFilter: true,
  },

  // Minimal view (just essential columns)
  minimal: {
    columnIds: [
      "quantity",
      "publisherRevenue",
      "authorRoyalty",
      "date",
      "paid",
    ] as SalesColumnId[],
    defaultSortField: "date" as const,
    defaultSortDirection: "desc" as const,
    showDateFilter: false,
  },
} as const;

/**
 * Get columns for a preset (internal helper)
 */
export function getPresetColumns(
  preset: keyof typeof salesTablePresets,
): ColumnDef<SaleListItem>[] {
  return getColumnsByIds(salesTablePresets[preset].columnIds);
}

/**
 * Get columns by visible column IDs (for custom allowlist)
 */
export function getColumnsByVisibleIds(
  visibleIds: SalesColumnId[],
): ColumnDef<SaleListItem>[] {
  return getColumnsByIds(visibleIds);
}
