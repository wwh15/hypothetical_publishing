/**
 * Shared column definitions for author tables
 */

import { ColumnDef } from "@/components/BaseDataTable";
import { AuthorBookItem, AuthorListItem } from "@/lib/data/author";
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
  | "title" 
  | "seriesId"           
  | "seriesOrder"        
  | "ISBN13"             
  | "publicationDate"    
  | "authorRoyaltyRate"  
  | "totalSales"         
  | "totalAuthorRoyalty"
  | "paidAuthorRoyalty"
  | "unpaidAuthorRoyalty";

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
 * Complete column definitions for author's books
 */
export const authorBooksColumns: ColumnDef<AuthorBookItem>[] = [
  {
    key: "id",
    header: "ID",
    className: "w-[60px]",
    render: (row) => row.id,
  },
  {
    key: "title",
    header: "Title",
    className: "w-1/3",
    render: (row) => (
      <Link
        href={`/books/${row.id}`}
        onClick={(e) => e.stopPropagation()}
        className="font-medium text-blue-600 hover:underline"
      >
        {row.title}
      </Link>
    ),
  },
  {
    key: "seriesId", // Added separate column
    header: "Series",
    render: (row) => row.seriesId ? `ID: ${row.seriesId}` : "—",
  },
  {
    key: "seriesOrder", // Added separate column
    header: "Pos.",
    render: (row) => row.seriesOrder ?? "—",
  },
  {
    key: "ISBN13",
    header: "ISBN-13",
    className: "font-mono text-xs",
    render: (row) => row.ISBN13,
  },
  {
    key: "publicationDate",
    header: "Published",
    render: (row) => `${row.publicationMonth} ${row.publicationYear}`,
  },
  {
    key: "authorRoyaltyRate",
    header: "Rate",
    render: (row) => `${(row.authorRoyaltyRate * 100).toFixed(1)}%`,
  },
  {
    key: "totalSales",
    header: "Total Sales",
    className: "text-right",
    render: (row) => row.totalSales.toLocaleString(),
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
    key: "unpaidAuthorRoyalty",
    header: "Unpaid Balance",
    render: (row) => authorCellRenderers.unpaidStatus(row.unpaidAuthorRoyalty),
  },
];

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
    key: "unpaidAuthorRoyalty", // Matches your SORT_ASC/DESC key precise casing
    header: "Unpaid Balance",
    render: (row) => authorCellRenderers.unpaidStatus(row.unpaidAuthorRoyalty,),
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
 * Map for Book list lookup
 */
const bookColumnMap = new Map<AuthorColumnId, ColumnDef<AuthorBookItem>>();
authorBooksColumns.forEach((col) => {
  bookColumnMap.set(col.key as AuthorColumnId, col);
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
 * Get author book columns by their IDs (internal helper)
 */
export function getAuthorBookColumnsByIds(
  columnIds: AuthorColumnId[]
): ColumnDef<AuthorBookItem>[] {
  return columnIds.map((id) => {
    const col = bookColumnMap.get(id);
    if (!col) {
      throw new Error(`Unknown book column ID: ${id}`);
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
      "id",
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

  // Table for getting book details for author (Author Detail Page)
  /**
   * 
   * id: number;
  title: string;
  seriesId?: number;
  seriesOrder?: number;
  ISBN13: number;
  publicationMonth: string;
  publicationYear: string;
  authorRoyaltyRate: number;
  totalSales: number;
  totalAuthorRoyalty: number;
  unpaidAuthorRoyalty: number;
  paidAuthorRoyalty: number;
   */
  authorBooks: {
    columnIds: [
      "id",
      "title", 
      "seriesId", 
      "seriesOrder", 
      "ISBN13",
      "publicationDate", 
      "authorRoyaltyRate", 
      "totalSales", 
      "totalAuthorRoyalty",
      "paidAuthorRoyalty",
      "unpaidAuthorRoyalty"
    ] as AuthorColumnId[],
  }
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

/**
 * Get columns for an author's books preset (returns ColumnDef<AuthorBookItem>[])
 */
export function getAuthorBooksPresetColumns(
  preset: keyof typeof authorTablePresets = "authorBooks"
): ColumnDef<AuthorBookItem>[] {
  const config = authorTablePresets[preset];
  return getAuthorBookColumnsByIds(config.columnIds as AuthorColumnId[]);
}