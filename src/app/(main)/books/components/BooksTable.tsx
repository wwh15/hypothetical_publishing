"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable, ColumnDef } from "@/components/DataTable";
import { BookListItem, BookSortEntry, encodeBookSortSpec } from "@/lib/data/books";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { PaginationControls } from "@/components/PaginationControls";
import { TableInfo } from "@/components/TableInfo";

interface BooksTableProps {
  books: BookListItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  sortSpec: BookSortEntry[];
  showAll?: boolean;
  normalPageSize?: number;
}

export default function BooksTable({
  books,
  total,
  page,
  pageSize,
  search,
  sortSpec,
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
    sortSpec?: BookSortEntry[] | null;
    showAll?: boolean;
  } = {}) => {
    const params = new URLSearchParams();
    const q = overrides.q !== undefined ? overrides.q : search.trim();
    const p = overrides.page ?? page;
    const spec = "sortSpec" in overrides ? overrides.sortSpec : sortSpec;
    const sa = overrides.showAll !== undefined ? overrides.showAll : showAll;

    if (q) params.set("q", q);
    params.set("page", String(p));
    if (spec != null && spec.length > 0) params.set("sort", encodeBookSortSpec(spec));
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

  const handleSortChange = (field: string, direction: "asc" | "desc" | null) => {
    let newSpec: BookSortEntry[];
    if (direction === null) {
      newSpec = sortSpec.filter((s) => s.field !== field);
      // When user clears the last column, leave spec empty so URL has no sort param;
      // server will apply default (author, series, title) without jumping the UI state.
    } else {
      const rest = sortSpec.filter((s) => s.field !== field);
      newSpec = [{ field, dir: direction }, ...rest];
    }
    const params = buildQueryParams({ sortSpec: newSpec, page: 1 });
    router.push(`/books?${params.toString()}`);
  };

  const handleToggleShowAll = () => {
    const params = buildQueryParams({
      showAll: !showAll,
      page: 1,
    });
    router.push(`/books?${params.toString()}`);
  };

  const hasSearch = search.trim().length > 0;
  const startRecord = showAll ? 1 : (page - 1) * normalPageSize + 1;
  const endRecord = showAll ? total : Math.min(page * normalPageSize, total);

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

      {/* Sort order summary so users see the full sequence at a glance */}
      {sortSpec.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Sorted by:</span>
          <ol className="flex flex-wrap items-center gap-1.5 list-none">
            {sortSpec.map((entry, i) => {
              const header = columns.find((c) => c.key === entry.field)?.header ?? entry.field;
              const dir = entry.dir === "asc" ? "A→Z" : "Z→A";
              return (
                <li key={`${entry.field}-${i}`} className="flex items-center gap-1">
                  {i > 0 && <span aria-hidden className="text-muted-foreground/70">then</span>}
                  <span>
                    {header} {dir}
                  </span>
                  {i < sortSpec.length - 1 && (
                    <span aria-hidden className="text-muted-foreground/50">,</span>
                  )}
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            onClick={() => {
              const defaultSpec: BookSortEntry[] = [
                { field: "author", dir: "asc" },
                { field: "series", dir: "asc" },
                { field: "title", dir: "asc" },
              ];
              const params = buildQueryParams({ sortSpec: defaultSpec, page: 1 });
              router.push(`/books?${params.toString()}`);
            }}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Reset to default
          </button>
        </div>
      )}

      <DataTable<BookListItem>
        columns={columns}
        data={books}
        emptyMessage={
          hasSearch ? "No books match your search" : "No books found"
        }
        onRowClick={handleRowClick}
        sortSpec={sortSpec.map((s) => ({ field: s.field, direction: s.dir }))}
        onSortChange={handleSortChange}
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
