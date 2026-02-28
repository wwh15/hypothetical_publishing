/**
 * Shared column definitions for sales tables.
 * Consolidates pure definitions for saved data and interactive definitions for pending data.
 */

import { ColumnDef } from "@/components/BaseDataTable";
import { SaleListItem, PendingSaleItem } from "@/lib/data/records";
import Link from "next/link";
import { X } from "lucide-react";

/**
 * Stable column IDs for type-safe column selection.
 */
export type SalesColumnId =
  | "id"
  | "title"
  | "author"
  | "quantity"
  | "publisherRevenue"
  | "authorRoyalty"
  | "date"
  | "paid"
  | "comment"
  | "source"
  | "actions";

// ─── REUSABLE CELL RENDERERS ──────────────────────────────────────────────

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

  source: (value: "DISTRIBUTOR" | "HAND_SOLD") => {
    const styles = {
      DISTRIBUTOR: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      HAND_SOLD: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    } as const;
    const label = value === "HAND_SOLD" ? "Hand Sold" : "Distributor";
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[value]}`}>
        {label}
      </span>
    );
  },

  /**
   * Enforces Absolute UTC display to prevent local timezone shifts.
   * Ensures a "Nov 1st 00:00Z" record doesn't show as "Oct" in Durham, NC.
   */
  date: (date: Date) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(date)),
};

// ─── SAVED SALES COLUMNS (SaleListItem) ───────────────────────────────────

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
    render: (row) => salesCellRenderers.date(row.date),
  },
  {
    key: "source",
    header: "Source",
    render: (row) => salesCellRenderers.source(row.source),
  },
  {
    key: "paid",
    header: "Royalty Status",
    render: (row) => salesCellRenderers.paidStatus(row.paid),
  },
  {
    key: "comment",
    header: "Comment",
    render: (row) => (
      <span className="text-muted-foreground">
        {row.comment != null && row.comment !== "" ? row.comment : "—"}
      </span>
    ),
  },
];

// ─── PENDING SALES COLUMNS (PendingSaleItem) ──────────────────────────────

/**
 * Generates columns for the staging/pending table.
 * Uses a higher-order function to inject interactivity.
 */
export function getPendingColumns(
  onTogglePaid: (row: PendingSaleItem) => void,
  onRemove: (row: PendingSaleItem) => void,
): ColumnDef<PendingSaleItem>[] {
  return [
    {
      key: "title",
      header: "Title",
      render: (row) => row.title,
    },
    {
      key: "date",
      header: "Date",
      render: (row) => salesCellRenderers.date(row.date),
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
      key: "source",
      header: "Source",
      render: (row) => salesCellRenderers.source(row.source),
    },
    {
      key: "paid",
      header: "Royalty Status (Toggleable)",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePaid(row);
          }}
          className="cursor-pointer rounded-full transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          title="Click to toggle paid / pending"
        >
          {salesCellRenderers.paidStatus(row.paid ? "paid" : "pending")}
        </button>
      ),
    },
    {
      key: "comment",
      header: "Comment",
      render: (row) => (
        <span className="text-muted-foreground text-sm">
          {row.comment != null && row.comment !== "" ? row.comment : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(row);
          }}
          className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded transition-colors"
          title="Remove record"
        >
          <X className="h-4 w-4" />
        </button>
      ),
    },
  ];
}

// ─── HELPERS & PRESETS ────────────────────────────────────────────────────

const columnMap = new Map<SalesColumnId, ColumnDef<SaleListItem>>();
salesColumns.forEach((col) => {
  columnMap.set(col.key as SalesColumnId, col);
});

function getColumnsByIds(columnIds: SalesColumnId[]): ColumnDef<SaleListItem>[] {
  return columnIds.map((id) => {
    const col = columnMap.get(id);
    if (!col) throw new Error(`Unknown column ID: ${id}`);
    return col;
  });
}

export const salesTablePresets = {
  // Full table with all columns (for the main sales listing page)
  full: {
    columnIds: [
      "id", "title", "author", "quantity", "publisherRevenue", 
      "authorRoyalty", "date", "source", "paid", "comment"
    ] as SalesColumnId[],
    defaultSortField: "date" as const,
    defaultSortDirection: "desc" as const,
    showDateFilter: true,
  },

  // Staging table for adding new records (adds 'actions', hides 'id')
  pending: {
    columnIds: [
      "title", "author", "quantity", "publisherRevenue", 
      "authorRoyalty", "date", "source", "paid", "comment", "actions"
    ] as SalesColumnId[],
    defaultSortField: "date" as const,
    defaultSortDirection: "desc" as const,
    showDateFilter: false,
  },

  // Book detail view (hides redundant title/author info)
  bookDetail: {
    columnIds: [
      "id", "quantity", "publisherRevenue", "authorRoyalty", 
      "date", "source", "paid"
    ] as SalesColumnId[],
    defaultSortField: "date" as const,
    defaultSortDirection: "desc" as const,
    showDateFilter: true,
  },
} as const;

export function getPresetColumns(preset: keyof typeof salesTablePresets) {
  return getColumnsByIds(salesTablePresets[preset].columnIds);
}

export function getColumnsByVisibleIds(visibleIds: SalesColumnId[]) {
  return getColumnsByIds(visibleIds);
}