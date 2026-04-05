/**
 * Shared column definitions for sales tables.
 * Consolidates pure definitions for saved data and interactive definitions for pending data.
 */

import { ColumnDef } from "@/components/BaseDataTable";
import { SaleListItem, PendingSaleItem } from "@/lib/data/records";
import type { SaleSource } from "@prisma/client";
import Link from "next/link";
import { X } from "lucide-react";
import { CURRENCY_SYMBOLS } from "../currency-conversion";
import { cn } from "../utils";

/** Table cells use compact pills; sale detail page uses comfortable. */
export type SaleBadgeSize = "compact" | "comfortable";

const saleBadgeSizeClass: Record<SaleBadgeSize, string> = {
  compact: "text-xs px-2.5 py-0.5",
  comfortable: "text-sm px-3 py-1",
};

const FORMAT_BADGE_STYLES: Record<
  "PRINT" | "EBOOK" | "KINDLE_UNLIMITED",
  string
> = {
  PRINT:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  EBOOK:
    "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200",
  KINDLE_UNLIMITED:
    "bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-200",
};

const FORMAT_BADGE_LABELS = {
  PRINT: "Print",
  EBOOK: "Ebook",
  KINDLE_UNLIMITED: "Kindle Unlimited",
} as const;

export function saleFormatBadge(
  value: "PRINT" | "EBOOK" | "KINDLE_UNLIMITED",
  size: SaleBadgeSize = "compact"
) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        saleBadgeSizeClass[size],
        FORMAT_BADGE_STYLES[value]
      )}
    >
      {FORMAT_BADGE_LABELS[value]}
    </span>
  );
}

const DISTRIBUTOR_BADGE_STYLES: Record<
  "INGRAM_SPARK" | "AMAZON" | "OTHER",
  string
> = {
  INGRAM_SPARK:
    "bg-teal-100 text-teal-900 dark:bg-teal-900/40 dark:text-teal-200",
  AMAZON:
    "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200",
  OTHER: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
};

const DISTRIBUTOR_BADGE_LABELS = {
  INGRAM_SPARK: "Ingram Spark",
  AMAZON: "Amazon",
  OTHER: "Other",
} as const;

export function saleDistributorBadge(
  value: "INGRAM_SPARK" | "AMAZON" | "OTHER" | null,
  size: SaleBadgeSize = "compact"
) {
  if (value == null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        saleBadgeSizeClass[size],
        DISTRIBUTOR_BADGE_STYLES[value]
      )}
    >
      {DISTRIBUTOR_BADGE_LABELS[value]}
    </span>
  );
}

/**
 * Stable column IDs for type-safe column selection.
 */
export type SalesColumnId =
  | "title"
  | "author"
  | "quantity"
  | "kenp"
  | "format"
  | "distributor"
  | "publisherRevenue"
  | "authorRoyalty"
  | "date"
  | "paid"
  | "comment"
  | "source"
  | "actions";

// ─── REUSABLE CELL RENDERERS ──────────────────────────────────────────────

export const salesCellRenderers = {
  currency: (
    value: number,
    currencyCode: string,
    original: boolean = false,
    colorClass?: string
  ) => (
    <div>
      <span className={cn("font-medium", colorClass)}>
        <span>
          {/* Use <bdi> to keep the Saudi symbol from jumbling the numbers */}
          <bdi>{original ? CURRENCY_SYMBOLS[currencyCode] : `$`}</bdi>
        </span>
        <span>{currencyCode === "JPY" ? value.toFixed(0) : value.toFixed(2)}</span>
      </span>
    </div>
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

  quantity: (value: number | null) => (
    <span>{value != null ? value : "—"}</span>
  ),

  kenp: (value: number | null) => (
    <span>{value != null ? value.toLocaleString() : "—"}</span>
  ),

  format: (value: "PRINT" | "EBOOK" | "KINDLE_UNLIMITED") =>
    saleFormatBadge(value, "compact"),

  distributor: (value: "INGRAM_SPARK" | "AMAZON" | "OTHER" | null) =>
    saleDistributorBadge(value, "compact"),

  source: (value: SaleSource) => {
    const styles: Record<SaleSource, string> = {
      DISTRIBUTOR:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      HAND_SOLD:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      KICKSTARTER:
        "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
    };
    const label =
      value === "HAND_SOLD"
        ? "Hand Sold"
        : value === "KICKSTARTER"
          ? "Kickstarter"
          : "Distributor";
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[value]}`}
      >
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
    key: "kenp",
    header: "KENP",
    render: (row) => salesCellRenderers.kenp(row.kenp),
  },
  {
    key: "format",
    header: "Format",
    render: (row) => salesCellRenderers.format(row.format),
  },
  {
    key: "distributor",
    header: "Distributor",
    render: (row) => salesCellRenderers.distributor(row.distributor),
  },
  {
    key: "currency",
    header: "Original Currency",
    render: (row) => row.currency,
  },
  {
    key: "publisherRevenueOriginal",
    header: "Pub. Revenue (Original)",
    render: (row) =>
      salesCellRenderers.currency(
        row.publisherRevenueOriginal,
        row.currency,
        true
      ),
  },
  {
    key: "publisherRevenueUSD",
    header: "Pub. Revenue (USD)",
    render: (row) =>
      salesCellRenderers.currency(row.publisherRevenueUSD, row.currency),
  },
  {
    key: "authorRoyalty",
    header: "Author Royalty",
    render: (row) =>
      salesCellRenderers.currency(row.authorRoyalty, row.currency),
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
    render: (row) => {
      const MAX_LENGTH = 30; // Define your character limit here
      const comment = row.comment;

      if (!comment) return <span className="text-muted-foreground">—</span>;

      const displayComment =
        comment.length > MAX_LENGTH
          ? `${comment.slice(0, MAX_LENGTH)}...`
          : comment;

      return (
        <span className="text-muted-foreground" title={comment}>
          {displayComment}
        </span>
      );
    },
  },
];

// ─── PENDING SALES COLUMNS (PendingSaleItem) ──────────────────────────────

/**
 * Generates columns for the staging/pending table.
 * Uses a higher-order function to inject interactivity.
 */
export function getPendingColumns(
  onTogglePaid: (row: PendingSaleItem) => void,
  onRemove: (row: PendingSaleItem) => void
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
      key: "format",
      header: "Format",
      render: (row) => salesCellRenderers.format(row.format),
    },
    {
      key: "distributor",
      header: "Distributor",
      render: (row) => salesCellRenderers.distributor(row.distributor),
    },
    {
      key: "quantity",
      header: "Qty / KENP",
      render: (row) =>
        row.format === "KINDLE_UNLIMITED"
          ? salesCellRenderers.kenp(row.kenp)
          : salesCellRenderers.quantity(row.quantity),
    },
    {
      key: "currency",
      header: "Original Currency",
      render: (row) => row.currency,
    },
    {
      key: "publisherRevenueOriginal",
      header: "Pub. Revenue (Original)",
      render: (row) =>
        salesCellRenderers.currency(
          row.publisherRevenueOriginal,
          row.currency,
          true
        ),
    },
    {
      key: "publisherRevenueUSD",
      header: "Pub. Revenue (USD)",
      render: (row) =>
        salesCellRenderers.currency(row.publisherRevenueUSD, "USD"),
    },
    {
      key: "authorRoyalty",
      header: "Author Royalty (USD)",
      render: (row) =>
        salesCellRenderers.currency(row.authorRoyalty, "USD"),
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
      render: (row) => {
        const MAX_LENGTH = 30; // Define your character limit here
        const comment = row.comment;

        if (!comment) return <span className="text-muted-foreground">—</span>;

        const displayComment =
          comment.length > MAX_LENGTH
            ? `${comment.slice(0, MAX_LENGTH)}...`
            : comment;

        return (
          <span className="text-muted-foreground" title={comment}>
            {displayComment}
          </span>
        );
      },
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

function getColumnsByIds(
  columnIds: SalesColumnId[]
): ColumnDef<SaleListItem>[] {
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
      "title",
      "author",
      "quantity",
      "kenp",
      "format",
      "distributor",
      "currency",
      "publisherRevenueOriginal",
      "publisherRevenueUSD",
      "authorRoyalty",
      "date",
      "source",
      "paid",
      "comment",
    ] as SalesColumnId[],
    defaultSortField: "date" as const,
    defaultSortDirection: "desc" as const,
    showDateFilter: true,
  },

  // Staging table for adding new records (adds 'actions')
  pending: {
    columnIds: [
      "title",
      "author",
      "quantity",
      "currency",
      "publisherRevenueOriginal",
      "publisherRevenueUSD",
      "authorRoyalty",
      "date",
      "source",
      "paid",
      "comment",
      "actions",
    ] as SalesColumnId[],
    defaultSortField: "date" as const,
    defaultSortDirection: "desc" as const,
    showDateFilter: false,
  },

  // Book detail view (hides redundant title/author info)
  bookDetail: {
    columnIds: [
      "quantity",
      "kenp",
      "format",
      "distributor",
      "publisherRevenueUSD",
      "authorRoyalty",
      "date",
      "source",
      "paid",
      "comment",
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
