"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable, ColumnDef } from "@/components/DataTable";
import { BookListItem } from "@/lib/data/books";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { PaginationControls } from "@/components/PaginationControls";
import { TableInfo } from "@/components/TableInfo";
import { SortColumn, serializeSortParam, DEFAULT_BOOK_SORT } from "@/lib/types/sort";

interface BooksTableProps {
  books: BookListItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  sortColumns: SortColumn[];
  showAll?: boolean;
  normalPageSize?: number;
}

export default function BooksTable({
  books,
  total,
  page,
  pageSize,
  search,
  sortColumns,
  showAll = false,
  normalPageSize = 20,
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
      key: "cover",
      header: "Cover",
      accessor: "coverArtPath",
      sortable: false,
      render: (row) => {
        if (row.coverArtPath) {
          return (
            <img
              src={`/api/books/cover?path=${encodeURIComponent(row.coverArtPath)}`}
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
      accessor: "title",
      sortable: true,
    },
    {
      key: "author",
      header: "Author",
      accessor: "author",
      sortable: true,
    },
    {
      key: "series",
      header: "Series",
      accessor: "seriesName",
      sortable: true,
      render: (row) => {
        if (!row.seriesName) {
          return <span>-</span>;
        }
        const label =
          row.seriesOrder != null
            ? `${row.seriesName} #${row.seriesOrder}`
            : row.seriesName;
        return <span>{label}</span>;
      },
    },
    {
      key: "isbn13",
      header: "ISBN-13",
      accessor: "isbn13",
      sortable: true,
      render: (row) => <span>{row.isbn13}</span>,
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
      render: (row) => (
        <span>
          {new Intl.DateTimeFormat("en-US", {
            month: "short",
            year: "numeric",
          }).format(row.publicationDate)}
        </span>
      ),
    },
    {
      key: "distRoyaltyRate",
      header: "Dist. Rate",
      accessor: "distRoyaltyRate",
      sortable: true,
      render: (row) => (
        <span className="font-medium">{row.distRoyaltyRate}%</span>
      ),
    },
    {
      key: "handSoldRoyaltyRate",
      header: "Hand-Sold Rate",
      accessor: "handSoldRoyaltyRate",
      sortable: false,
      render: (row) => (
        <span className="font-medium">{row.handSoldRoyaltyRate}%</span>
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
    sort?: SortColumn[];
    showAll?: boolean;
  } = {}) => {
    const params = new URLSearchParams();
    const q = overrides.q !== undefined ? overrides.q : search.trim();
    const p = overrides.page ?? page;
    const cols = overrides.sort !== undefined ? overrides.sort : sortColumns;
    const sa = overrides.showAll !== undefined ? overrides.showAll : showAll;

    if (q) params.set("q", q);
    params.set("page", String(p));
    // Only set sort param if it differs from default
    const serialized = serializeSortParam(cols);
    const defaultSerialized = serializeSortParam(DEFAULT_BOOK_SORT);
    if (serialized && serialized !== defaultSerialized) {
      params.set("sort", serialized);
    }
    if (sa) params.set("showAll", "true");
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

  const handleMultiSortChange = (newSortColumns: SortColumn[]) => {
    // If all sorts removed, fall back to default
    const cols = newSortColumns.length > 0 ? newSortColumns : DEFAULT_BOOK_SORT;
    const params = buildQueryParams({ sort: cols, page: 1 });
    router.push(`/books?${params.toString()}`);
  };

  const handleClearSort = () => {
    const params = buildQueryParams({ sort: DEFAULT_BOOK_SORT, page: 1 });
    router.push(`/books?${params.toString()}`);
  };

  const handleToggleShowAll = () => {
    const params = buildQueryParams({
      showAll: !showAll,
      page: 1,
    });
    router.push(`/books?${params.toString()}`);
  };

  const isDefaultSort =
    serializeSortParam(sortColumns) === serializeSortParam(DEFAULT_BOOK_SORT);

  const hasSearch = search.trim().length > 0;
  const startRecord = showAll ? 1 : (page - 1) * normalPageSize + 1;
  const endRecord = showAll ? total : Math.min(page * normalPageSize, total);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, author, series, or ISBN..."
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
        {!isDefaultSort && (
          <button
            type="button"
            onClick={handleClearSort}
            className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
          >
            Clear Sort
          </button>
        )}
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

      <DataTable<BookListItem>
        columns={columns}
        data={books}
        emptyMessage={
          hasSearch ? "No books match your search" : "No books found"
        }
        onRowClick={handleRowClick}
        sortColumns={sortColumns}
        onMultiSortChange={handleMultiSortChange}
        showPagination={false}
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
