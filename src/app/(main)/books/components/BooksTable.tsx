"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable, ColumnDef } from "@/components/DataTable";
import { BookListItem } from "@/lib/data/books";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { PaginationControls } from "@/components/PaginationControls";

interface BooksTableProps {
  books: BookListItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortDir: "asc" | "desc";
}

export default function BooksTable({
  books,
  total,
  page,
  pageSize,
  search,
  sortBy,
  sortDir,
}: BooksTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(search ?? "");

  const totalPages = useMemo(
    () => (total > 0 ? Math.ceil(total / pageSize) : 1),
    [total, pageSize],
  );

  const handleRowClick = (book: BookListItem) => {
    router.push(`/books/${book.id}`);
  };

  const columns: ColumnDef<BookListItem>[] = [
    {
      key: "title",
      header: "Title",
      accessor: "title",
      sortable: true,
    },
    {
      key: "authors",
      header: "Author(s)",
      accessor: "authors",
      sortable: true,
    },
    {
      key: "isbn13",
      header: "ISBN-13",
      accessor: "isbn13",
      sortable: true,
      render: (row) => <span>{row.isbn13 || "-"}</span>,
    },
    {
      key: "isbn10",
      header: "ISBN-10",
      accessor: "isbn10",
      sortable: true,
      render: (row) => <span>{row.isbn10 || "-"}</span>,
    },
    {
      key: "publication",
      header: "Publication",
      accessor: "publicationSortKey",
      sortable: true,
      render: (row) => {
        if (row.publicationMonth && row.publicationYear) {
          const monthNames = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
          ];
          const monthIndex = parseInt(row.publicationMonth) - 1;
          const monthName =
            monthIndex >= 0 && monthIndex < 12
              ? monthNames[monthIndex]
              : row.publicationMonth;
          return <span>{monthName} {row.publicationYear}</span>;
        }
        return <span>-</span>;
      },
    },
    {
      key: "defaultRoyaltyRate",
      header: "Royalty Rate",
      accessor: "defaultRoyaltyRate",
      sortable: true,
      render: (row) => (
        <span className="font-medium">{row.defaultRoyaltyRate}%</span>
      ),
    },
    {
      key: "totalSales",
      header: "Total Sales",
      accessor: "totalSales",
      sortable: true,
      render: (row) => (
        <span className="font-medium">{row.totalSales.toLocaleString()}</span>
      ),
    },
  ];

  const buildQueryParams = (overrides: {
    page?: number;
    q?: string;
    sortBy?: string;
    sortDir?: "asc" | "desc";
  } = {}) => {
    const params = new URLSearchParams();
    const q = overrides.q !== undefined ? overrides.q : search.trim();
    const p = overrides.page ?? page;
    const sb = overrides.sortBy ?? sortBy;
    const sd = overrides.sortDir ?? sortDir;

    if (q) params.set("q", q);
    params.set("page", String(p));
    params.set("sortBy", sb);
    params.set("sortDir", sd);
    return params;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = buildQueryParams({ q: searchQuery.trim(), page: 1 });
    router.push(`/books?${params.toString()}`);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    const params = buildQueryParams({ q: "", page: 1 });
    router.push(`/books?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = buildQueryParams({ page: newPage });
    router.push(`/books?${params.toString()}`);
  };

  const handleSortChange = (field: string, direction: "asc" | "desc") => {
    const params = buildQueryParams({
      sortBy: field,
      sortDir: direction,
      page: 1,
    });
    router.push(`/books?${params.toString()}`);
  };

  const hasSearch = search.trim().length > 0;

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
          placeholder="Search by title, author, or ISBN..."
          className={cn(
            "block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-lg",
            "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
            "placeholder:text-gray-400 dark:placeholder:text-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "transition-colors",
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

      <div className="text-sm text-muted-foreground flex justify-between items-center">
        <span>
          {total > 0 ? (
            <>
              Showing page {page} of {totalPages} ({total}{" "}
              {hasSearch ? "matching books" : "books"})
            </>
          ) : hasSearch ? (
            "No books match your search"
          ) : (
            "No books found"
          )}
        </span>
      </div>

      <DataTable<BookListItem>
        columns={columns}
        data={books}
        emptyMessage={
          hasSearch ? "No books match your search" : "No books found"
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
