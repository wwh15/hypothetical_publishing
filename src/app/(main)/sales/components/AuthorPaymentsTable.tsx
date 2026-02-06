"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { AuthorGroup, markAuthorPaid } from "@/lib/data/author-payment";
import { useTablePagination } from "@/hooks/useTablePagination";
import { cn } from "@/lib/utils";
import { SaleListItem } from "@/lib/data/records";
import { useRouter } from "next/navigation";
import { PaginationControls } from "@/components/PaginationControls";
import { TableInfo } from "@/components/TableInfo";
import Link from "next/link";

export default function AuthorPaymentsTable({
  authorPaymentData,
}: {
  authorPaymentData: AuthorGroup[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false); // Add loading state

  const handleRowClick = (sale: SaleListItem) => {
    router.push(`/sales/records/${sale.id}?from=payments`);
  };

  const handleMarkAllPaid = async (
    authorIds: number[],
    authorNames: string[],
  ) => {
    const names = authorNames.join(", ");
    if (!confirm(`Mark all unpaid royalties for ${names} as paid?`)) {
      return;
    }

    setLoading(true);
    const result = await markAuthorPaid(authorIds);
    setLoading(false);

    if (result.success) {
      alert(result.message); // "Marked 5 sale(s) as paid"
      router.refresh(); // Refresh to show updated data
    } else {
      alert(result.error);
    }
  };

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

  return (
    <div className="space-y-4">
      {/* Table Info - Using reusable component */}
      <TableInfo
        startRecord={startRecord}
        endRecord={endRecord}
        totalRecords={totalRecords}
        showAll={showAll}
        itemsPerPage={10}
        onToggleShowAll={toggleShowAll}
      />

      {/* Table */}
      <Table>
        <TableBody>
          {paginatedData.map((group, groupIndex) => (
            <React.Fragment key={`group-${groupIndex}`}>
              {/* Author Header Row */}
              <TableRow className="bg-muted/50">
                <TableCell colSpan={2} className="font-semibold text-base">
                  {group.authors.join(", ")}
                </TableCell>
                <TableCell colSpan={2} className="text-right font-semibold">
                  Unpaid Total: ${group.unpaidTotal.toFixed(2)}
                </TableCell>
                <TableCell colSpan={2} className="text-right">
                  <button
                    onClick={() =>
                      handleMarkAllPaid(group.authorIds, group.authors)
                    }
                    disabled={loading || group.unpaidTotal === 0}
                    className={cn(
                      "text-sm font-medium transition-colors px-3 py-1 rounded",
                      group.unpaidTotal === 0 || loading
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20",
                    )}
                  >
                    {loading ? "Processing..." : "Mark all as paid"}
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
                <TableRow
                  key={sale.id}
                  onClick={() => handleRowClick(sale)}
                  className={cn(
                    "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800",
                    sale.paid === "paid" &&
                      "opacity-50 bg-gray-50 dark:bg-gray-900",
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <Link
                          href={`/books/${sale.bookId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:underline focus:outline focus:underline"
                        >
                          {sale.title}
                        </Link>
                      </div>
                      {sale.paid === "paid" && (
                        <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded">
                          Paid
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{sale.quantity}</TableCell>
                  <TableCell className="text-right">
                    ${sale.publisherRevenue.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        sale.paid === "paid"
                          ? "text-gray-400"
                          : "text-blue-600 font-semibold"
                      }
                    >
                      ${sale.authorRoyalty.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{sale.date}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        sale.paid === "paid"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      }`}
                    >
                      {sale.paid === "paid" ? "Paid" : "Pending"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}

              {/* Separator Row */}
              {groupIndex < paginatedData.length - 1 && (
                <TableRow className="bg-gray-200 dark:bg-gray-700">
                  <TableCell colSpan={6} className="h-2 p-0" />
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>

      {/* Pagination Controls - Using reusable component */}
      {!showAll && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
        />
      )}
    </div>
  );
}
