'use client';

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { AuthorGroup } from "@/lib/data/author-payment";
import { useTablePagination } from "../hooks/useTablePagination";
import { cn } from "@/lib/utils";

export default function AuthorPaymentsTable({ authorPaymentData }: { authorPaymentData: AuthorGroup[] }) {
  
  // Use pagination hook to paginate author groups
  const {
    paginatedData,
    currentPage,
    totalPages,
    startRecord,
    endRecord,
    totalRecords,
    showAll,
    goToPage,
    toggleShowAll,
  } = useTablePagination({
    data: authorPaymentData,
    itemsPerPage: 10, // Show 10 authors per page
    enabled: true,
  });

  const paidStyles = {
    paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  } as const;

  return (
    <div className="space-y-4">
      {/* Header with record count and Show All button */}
      {totalRecords > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {showAll
              ? `Showing all ${totalRecords} authors`
              : `Showing ${startRecord}-${endRecord} of ${totalRecords} authors`
            }
          </p>

          {totalRecords > 10 && (
            <button
              onClick={toggleShowAll}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
            >
              {showAll ? 'Show Paginated' : 'Show All Authors'}
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <Table>
        <TableBody>
          {paginatedData.map((group, groupIndex) => (
            <React.Fragment key={`group-${groupIndex}`}>
              {/* Author Header Row */}
              <TableRow className="bg-muted/50">
                <TableCell colSpan={2} className="font-semibold text-base">
                  {group.author}
                </TableCell>
                <TableCell colSpan={2} className="text-right font-semibold">
                  Unpaid Total: ${group.unpaidTotal.toFixed(2)}
                </TableCell>
                <TableCell colSpan={2} className="text-right">
                  <button className="text-sm font-medium text-blue-600 hover:underline">
                    Mark all as paid
                  </button>
                </TableCell>
              </TableRow>

              {/* Column Headers for Sales */}
              <TableRow className="bg-gray-100 dark:bg-gray-800">
                <TableHead>Title</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Publisher Revenue</TableHead>
                <TableHead className="text-right">Author Royalty</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>

              {/* Sales Data Rows */}
              {group.sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{sale.title}</TableCell>
                  <TableCell className="text-right">{sale.quantity}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${sale.publisherRevenue.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${sale.authorRoyalty.toFixed(2)}
                  </TableCell>
                  <TableCell>{sale.date}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${paidStyles[sale.paid]}`}
                    >
                      {sale.paid.charAt(0).toUpperCase() + sale.paid.slice(1)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      {!showAll && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                currentPage === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              ← Previous
            </button>

            <span className="text-sm text-muted-foreground px-2">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                currentPage === totalPages
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              Next →
            </button>
          </div>

          {/* Page jump input */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Go to page:</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (!isNaN(page)) goToPage(page);
              }}
              className="w-16 px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            />
          </div>
        </div>
      )}
    </div>
  );
}