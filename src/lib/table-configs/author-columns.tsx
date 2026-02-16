/**
 * Shared column definitions for author tables
 */

import { ColumnDef } from "@/components/BaseDataTable";
import { AuthorListItem } from "@/lib/data/author";
import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * Stable column IDs for type-safe column selection
 */
export type AuthorColumnId =
  | "id"
  | "name"
  | "email"
  | "authoredBooks"
  | "totalAuthorRoyalty"
  | "paidAuthorRoyalty"
  | "unPaidAuthorRoyalty";

// Reusable cell renderers
export const authorCellRenderers = {
  currency: (value: number, colorClass?: string) => (
    <span className={cn("font-medium", colorClass)}>
      ${value.toFixed(2)}
    </span>
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
    key: "id",
    header: "ID",
    className: "w-[80px]",
    render: (row) => row.id,
  },
  {
    key: "name",
    header: "Author Name",
    className: "w-1/4",
    render: (row) => (
      <Link
        href={`/authors/${row.id}`}
        onClick={(e) => e.stopPropagation()}
        className="font-medium text-blue-600 hover:underline focus:outline focus:underline"
      >
        {row.name}
      </Link>
    ),
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
    key: "unPaidAuthorRoyalty", // Matches your SORT_ASC/DESC key precise casing
    header: "Unpaid Balance",
    render: (row) => authorCellRenderers.unpaidStatus(row.unpaidAuthorRoyalty,),
  },
];

/**
 * Map of column ID to column definition for fast lookup
 */
const columnMap = new Map<AuthorColumnId, ColumnDef<AuthorListItem>>();
authorColumns.forEach((col) => {
  columnMap.set(col.key as AuthorColumnId, col);
});

/**
 * Get columns by their IDs (internal helper)
 */
export function getAuthorColumnsByIds(
  columnIds: AuthorColumnId[]
): ColumnDef<AuthorListItem>[] {
  return columnIds.map((id) => {
    const col = columnMap.get(id);
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
  // Full table with all columns (Author management page)
  full: {
    columnIds: [
      "id",
      "name",
      "email",
      "authoredBooks",
      "totalAuthorRoyalty",
      "paidAuthorRoyalty",
      "unPaidAuthorRoyalty",
    ] as AuthorColumnId[],
    defaultSortField: "name" as const,
    defaultSortDirection: "asc" as const,
  },
  // Minimalist view for dashboard widgets
  minimal: {
    columnIds: ["name", "unPaidAuthorRoyalty"] as AuthorColumnId[],
    defaultSortField: "unPaidAuthorRoyalty" as const,
    defaultSortDirection: "desc" as const,
  },
} as const;

/**
 * Get columns for a preset
 */
export function getAuthorPresetColumns(
  preset: keyof typeof authorTablePresets
): ColumnDef<AuthorListItem>[] {
  return getAuthorColumnsByIds(authorTablePresets[preset].columnIds);
}