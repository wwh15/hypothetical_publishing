"use client";

import { useRouter } from "next/navigation";
import { DataTable, ColumnDef } from "@/components/DataTable";
import { BookListItem } from "@/lib/data/books";
import { useBookSearch } from "@/hooks/useBookSearch";

interface BooksTableProps {
  books: BookListItem[];
}

export default function BooksTable({ books }: BooksTableProps) {
  const router = useRouter();
  const { searchQuery, setSearchQuery, filteredBooks } = useBookSearch(books);

  const handleRowClick = (book: BookListItem) => {
    router.push(`/books/${book.id}`);
  };

  const columns: ColumnDef<BookListItem>[] = [
    {
      key: 'title',
      header: 'Title',
      accessor: 'title',
      sortable: true,
    },
    {
      key: 'authors',
      header: 'Author(s)',
      accessor: 'authors',
      sortable: true,
    },
    {
      key: 'isbn13',
      header: 'ISBN-13',
      accessor: 'isbn13',
      sortable: true,
      render: (row) => (
        <span>{row.isbn13 || '-'}</span>
      ),
    },
    {
      key: 'isbn10',
      header: 'ISBN-10',
      accessor: 'isbn10',
      sortable: true,
      render: (row) => (
        <span>{row.isbn10 || '-'}</span>
      ),
    },
    {
      key: 'publication',
      header: 'Publication',
      accessor: 'publicationSortKey',
      sortable: true,
      render: (row) => {
        if (row.publicationMonth && row.publicationYear) {
          const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
          ];
          const monthIndex = parseInt(row.publicationMonth) - 1;
          const monthName = monthIndex >= 0 && monthIndex < 12 
            ? monthNames[monthIndex] 
            : row.publicationMonth;
          return <span>{monthName} {row.publicationYear}</span>;
        }
        return <span>-</span>;
      },
    },
    {
      key: 'defaultRoyaltyRate',
      header: 'Royalty Rate',
      accessor: 'defaultRoyaltyRate',
      sortable: true,
      render: (row) => (
        <span className="font-medium">{row.defaultRoyaltyRate}%</span>
      ),
    },
    {
      key: 'totalSales',
      header: 'Total Sales',
      accessor: 'totalSales',
      sortable: true,
      render: (row) => (
        <span className="font-medium">{row.totalSales.toLocaleString()}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title, author, or ISBN..."
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear search"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Data Table (client-side pagination, sorting, and filtering) */}
      <DataTable<BookListItem>
        columns={columns}
        data={filteredBooks}
        emptyMessage={searchQuery.trim() ? "No books match your search" : "No books found"}
        onRowClick={handleRowClick}
        defaultSortField="title"
        defaultSortDirection="asc"
      />
    </div>
  );
}
