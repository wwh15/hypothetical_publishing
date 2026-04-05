/**
 * Shared column definitions for author tables
 */

import { ColumnDef } from "@/components/BaseDataTable";
import { AuthorBookItem, AuthorListItem } from "@/lib/data/author";
import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * Stable column IDs for type-safe column selection (author list table only)
 */
export type AuthorColumnId =
  | "name"
  | "email"
  | "authoredBooks"
  | "totalAuthorRoyalty"
  | "paidAuthorRoyalty"
  | "unpaidAuthorRoyalty";

// Reusable cell renderers
export const authorCellRenderers = {
  currency: (value: number, colorClass?: string) => (
    <span className={cn("font-medium", colorClass)}>${value.toFixed(2)}</span>
  ),

  email: (email: string | null) => (
    <span className="text-sm text-gray-500">{email || "—"}</span>
  ),

  unpaidStatus: (value: number) => (
    <span
      className={cn(
        "font-medium",
        value > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400"
      )}
    >
      ${value.toFixed(2)}
    </span>
  ),
};

/**
 * Complete column definitions for author records
 */
export const authorColumns: ColumnDef<AuthorListItem>[] = [
  {
    key: "name",
    header: "Author Name",
    className: "w-1/4",
    headerClassName: "w-1/4",
    render: (row) => <span className="font-medium">{row.name}</span>,
  },
  {
    key: "email",
    header: "Email",
    render: (row) => authorCellRenderers.email(row.email),
  },
  {
    key: "authoredBooks",
    header: "Books",
    render: (row) => <div className="text-center">{row.authoredBooks}</div>,
  },
  {
    key: "totalAuthorRoyalty",
    header: "Total Royalty",
    render: (row) => authorCellRenderers.currency(row.totalAuthorRoyalty),
  },
  {
    key: "paidAuthorRoyalty",
    header: "Paid",
    render: (row) =>
      authorCellRenderers.currency(
        row.paidAuthorRoyalty,
        "text-green-600 dark:text-green-400"
      ),
  },
  {
    key: "unpaidAuthorRoyalty", // Matches your SORT_ASC/DESC key precise casing
    header: "Unpaid Balance",
    render: (row) => authorCellRenderers.unpaidStatus(row.unpaidAuthorRoyalty),
  },
];

export const authorBookColumns: ColumnDef<AuthorBookItem>[] = [
  {
    key: "cover",
    header: "Cover",
    render: (row) => {
      if (row.coverArtPath) {
        return (
          <img
            src={`/api/books/cover?path=${encodeURIComponent(
              row.coverArtPath
            )}`}
            alt=""
            className="h-10 w-7 object-cover rounded border border-gray-200 dark:border-gray-600"
          />
        );
      }
      return <span className="text-muted-foreground text-xs">No cover</span>;
    },
  },
  {
    key: "title",
    header: "Title",
    render: (row) => (
      <Link
        href={`/books/${row.id}`}
        onClick={(e) => e.stopPropagation()}
        className="text-blue-600 hover:underline focus:outline focus:underline"
      >
        {row.title}
      </Link>
    ),
  },
  {
    key: "series",
    header: "Series",
    render: (row) => {
      if (!row.seriesName) {
        return <span>-</span>;
      }
      const label =
        row.seriesOrder != null
          ? `${row.seriesName} (${row.seriesOrder})`
          : row.seriesName;
      return <span>{label}</span>;
    },
  },
  {
    key: "isbn13",
    header: "ISBN-13",
    render: (row) =>
      row.ISBN13 ? (
        <span>{row.ISBN13}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "publication",
    header: "Publication",
    render: (row) => (
      <span>
        {[row.publicationMonth, row.publicationYear].filter(Boolean).join(" ")}
      </span>
    ),
  },
  {
    key: "totalSales",
    header: "Total Sales",
    render: (row) => (
      <span className="font-medium">{row.totalSales.toLocaleString()}</span>
    ),
  },
  {
    key: "totalAuthorRoyalty",
    header: "Total Author Royalty",
    render: (row) => authorCellRenderers.currency(row.totalAuthorRoyalty),
  },
  {
    key: "paidAuthorRoyalty",
    header: "Paid Author Royalty",
    render: (row) =>
      authorCellRenderers.currency(
        row.paidAuthorRoyalty,
        "text-green-600 dark:text-green-400"
      ),
  },
  {
    key: "unpaidAuthorRoyalty", // Matches your SORT_ASC/DESC key precise casing
    header: "Unpaid Author Royalty",
    render: (row) => authorCellRenderers.unpaidStatus(row.unpaidAuthorRoyalty),
  },
];

/**
 * Map for Author list lookup
 */
const authorColumnMap = new Map<AuthorColumnId, ColumnDef<AuthorListItem>>();
authorColumns.forEach((col) => {
  authorColumnMap.set(col.key as AuthorColumnId, col);
});

/**
 * Get author columns by their IDs (internal helper)
 */
export function getAuthorColumnsByIds(
  columnIds: AuthorColumnId[]
): ColumnDef<AuthorListItem>[] {
  return columnIds.map((id) => {
    const col = authorColumnMap.get(id);
    if (!col) {
      throw new Error(`Unknown author column ID: ${id}`);
    }
    return col;
  });
}

/**
 * Table configuration presets for different contexts
 */
export const authorTablePresets = {
  // Table for getting author details (All Authors Page)
  full: {
    columnIds: [
      "name",
      "email",
      "authoredBooks",
      "totalAuthorRoyalty",
      "paidAuthorRoyalty",
      "unpaidAuthorRoyalty",
    ] as AuthorColumnId[],
    defaultSortField: "name" as const,
    defaultSortDirection: "asc" as const,
  },
} as const;

/**
 * Get columns for an author list preset (returns ColumnDef<AuthorListItem>[])
 */
export function getAuthorPresetColumns(
  preset: keyof typeof authorTablePresets = "full"
): ColumnDef<AuthorListItem>[] {
  const config = authorTablePresets[preset];
  return getAuthorColumnsByIds(config.columnIds as AuthorColumnId[]);
}
