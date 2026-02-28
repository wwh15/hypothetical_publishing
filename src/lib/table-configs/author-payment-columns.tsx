/**
 * Shared column definitions for author payment tables
 */

import { ColumnDef } from "@/components/BaseDataTable";
import { cn } from "@/lib/utils";
import { SaleListItem } from "../data/records";
import Link from "next/link";

/**
 * Stable column IDs for type-safe column selection
 * Updated to match your exact definition
 */
export type AuthorPaymentColumnId =
  | "title"
  | "quantity"
  | "publisherRevenue"
  | "authorRoyalty"
  | "date"
  | "paid";

// Reusable cell renderers specific to payments
export const authorPaymentCellRenderers = {
  currency: (value: number, colorClass?: string) => (
    <span className={cn("font-medium", colorClass)}>${value.toFixed(2)}</span>
  ),

  date: (date: Date) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(date)),
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
};

/**
 * Complete column definitions for author payment records
 */
export const authorPaymentColumns: ColumnDef<SaleListItem>[] = [
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
    key: "date",
    header: "Sale Date",
    render: (row) => authorPaymentCellRenderers.date(row.date),
  },
  {
    key: "quantity",
    header: "Qty",
    className: "text-center",
    render: (row) => row.quantity,
  },
  {
    key: "publisherRevenue",
    header: "Pub. Revenue",
    render: (row) => authorPaymentCellRenderers.currency(row.publisherRevenue),
  },
  {
    key: "authorRoyalty",
    header: "Royalty",
    render: (row) => authorPaymentCellRenderers.currency(row.authorRoyalty),
  },
  {
    key: "paid",
    header: "Status",
    render: (row) => authorPaymentCellRenderers.paidStatus(row.paid),
  },
];

/**
 * Map of column ID to column definition for fast lookup
 */
const paymentColumnMap = new Map<
  AuthorPaymentColumnId,
  ColumnDef<SaleListItem>
>();
authorPaymentColumns.forEach((col) => {
  paymentColumnMap.set(col.key as AuthorPaymentColumnId, col);
});

/**
 * Get columns by their IDs
 */
export function getAuthorPaymentColumnsByIds(
  columnIds: AuthorPaymentColumnId[]
): ColumnDef<SaleListItem>[] {
  return columnIds.map((id) => {
    const col = paymentColumnMap.get(id);
    if (!col) {
      throw new Error(`Unknown author payment column ID: ${id}`);
    }
    return col;
  });
}

/**
 * Table configuration presets for Payment context
 */
export const authorPaymentTablePresets = {
  full: {
    columnIds: [
      "title",
      "quantity",
      "publisherRevenue",
      "authorRoyalty",
      "date",
      "paid",
    ] as AuthorPaymentColumnId[],
    defaultSortField: "date" as const,
    defaultSortDirection: "desc" as const,
  },
  accounting: {
    columnIds: [
      "date",
      "title",
      "publisherRevenue",
      "authorRoyalty",
      "paid",
    ] as AuthorPaymentColumnId[],
    defaultSortField: "date" as const,
    defaultSortDirection: "desc" as const,
  },
} as const;

export function getAuthorPaymentPresetColumns(
  preset: keyof typeof authorPaymentTablePresets
): ColumnDef<SaleListItem>[] {
  return getAuthorPaymentColumnsByIds(
    authorPaymentTablePresets[preset].columnIds as AuthorPaymentColumnId[]
  );
}
