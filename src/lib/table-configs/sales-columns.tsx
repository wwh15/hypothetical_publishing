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
  | "format"
  | "distributor"
  | "publisherRevenueOriginal"
  | "publisherRevenueUSD"
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

  /** ISO currency code + original-currency amount (replaces separate CCY + Pub. orig columns). */
  publisherOriginalWithCcy: (
    value: number,
    currencyCode: string,
    colorClass?: string
  ) => {
    const sym = CURRENCY_SYMBOLS[currencyCode] ?? "$";
    const amount =
      currencyCode === "JPY" ? value.toFixed(0) : value.toFixed(2);
    return (
      <div className="flex min-w-0 items-baseline gap-x-1.5 gap-y-0.5 tabular-nums">
        <span
          className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground"
          title={`Original currency: ${currencyCode}`}
        >
          {currencyCode}
        </span>
        <span className={cn("min-w-0 font-medium", colorClass)}>
          <bdi>{sym}</bdi>
          <span>{amount}</span>
        </span>
      </div>
    );
  },

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
    className:
      "max-w-[min(11rem,40vw)] min-w-0 align-top whitespace-normal",
    render: (row) => (
      <Link
        href={`/books/${row.bookId}`}
        onClick={(e) => e.stopPropagation()}
        className="block truncate text-blue-600 hover:underline focus:outline focus:underline"
        title={row.title}
      >
        {row.title}
      </Link>
    ),
  },
  {
    key: "author",
    header: "Author",
    className: "max-w-[min(9rem,32vw)] min-w-0 align-top",
    render: (row) => (
      <span className="block truncate" title={row.author}>
        {row.author}
      </span>
    ),
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
    key: "publisherRevenueOriginal",
    header: "Pub. orig",
    headerTitle:
      "Publisher revenue in original currency (ISO code + amount)",
    headerClassName: "whitespace-nowrap",
    className: "min-w-0 max-w-[min(9rem,28vw)] whitespace-nowrap",
    render: (row) =>
      salesCellRenderers.publisherOriginalWithCcy(
        row.publisherRevenueOriginal,
        row.currency
      ),
  },
  {
    key: "publisherRevenueUSD",
    header: "Pub. USD",
    headerTitle: "Publisher revenue (USD)",
    headerClassName: "whitespace-nowrap",
    className: "min-w-0 whitespace-nowrap tabular-nums",
    render: (row) =>
      salesCellRenderers.currency(row.publisherRevenueUSD, row.currency),
  },
  {
    key: "authorRoyalty",
    header: "Auth. Royalty",
    headerTitle: "Author royalty",
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
    header: "Status",
    headerTitle: "Royalty status",
    render: (row) => salesCellRenderers.paidStatus(row.paid),
  },
  {
    key: "comment",
    header: "Comment",
    className: "max-w-[6rem] min-w-0 align-top sm:max-w-[7rem]",
    render: (row) => {
      const comment = row.comment;

      if (!comment) return <span className="text-muted-foreground">—</span>;

      return (
        <span
          className="block truncate text-muted-foreground"
          title={comment}
        >
          {comment}
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
  onRemove: (row: PendingSaleItem) => void,
  options?: {
    /** When true, paid chip is not clickable (e.g. projected sale still pending release). */
    isPaidToggleDisabled?: (row: PendingSaleItem) => boolean;
  }
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
      key: "publisherRevenueOriginal",
      header: "Pub. orig",
      headerTitle:
        "Publisher revenue in original currency (ISO code + amount)",
      headerClassName: "whitespace-nowrap",
      className: "min-w-0 max-w-[min(9rem,28vw)] whitespace-nowrap",
      render: (row) =>
        salesCellRenderers.publisherOriginalWithCcy(
          row.publisherRevenueOriginal,
          row.currency
        ),
    },
    {
      key: "publisherRevenueUSD",
      header: "Pub. USD",
      headerTitle: "Publisher revenue (USD)",
      headerClassName: "whitespace-nowrap",
      className: "min-w-0 whitespace-nowrap tabular-nums",
      render: (row) =>
        salesCellRenderers.currency(row.publisherRevenueUSD, "USD"),
    },
    {
      key: "authorRoyalty",
      header: "Auth. Royalty (USD)",
      headerTitle: "Author royalty (USD)",
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
      header: "Status",
      headerTitle:
        "Royalty status (click chip to toggle when the book is released; projected sales stay pending)",
      render: (row) => {
        const disabled = options?.isPaidToggleDisabled?.(row) ?? false;
        return (
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) onTogglePaid(row);
            }}
            className={cn(
              "rounded-full transition-transform focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
              disabled
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer active:scale-95"
            )}
            title={
              disabled
                ? "Projected (pre-release) sales cannot be marked paid until the book is released"
                : "Click to toggle paid / pending"
            }
          >
            {salesCellRenderers.paidStatus(row.paid ? "paid" : "pending")}
          </button>
        );
      },
    },
    {
      key: "comment",
      header: "Comment",
      className: "max-w-[6rem] min-w-0 align-top sm:max-w-[7rem]",
      render: (row) => {
        const comment = row.comment;

        if (!comment) return <span className="text-muted-foreground">—</span>;

        return (
          <span
            className="block truncate text-muted-foreground"
            title={comment}
          >
            {comment}
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

/** Muted row styling for sales whose book is not yet released (pre-release / projected). */
export function saleListRowClassNameForBookReleased(
  row: Pick<SaleListItem, "bookReleased">
): string | undefined {
  return row.bookReleased
    ? undefined
    : [
        "border-l-[3px] border-l-muted-foreground/35",
        "bg-neutral-200/95 text-foreground/90",
        "hover:bg-neutral-300/95",
        "dark:border-l-muted-foreground/45",
        "dark:bg-zinc-900/65 dark:text-foreground/95",
        "dark:hover:bg-zinc-900/85",
      ].join(" ");
}

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
      "format",
      "distributor",
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
