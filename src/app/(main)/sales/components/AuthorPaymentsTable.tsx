"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AuthorGroup, markAllPaid } from "@/lib/data/author-payment";
import { cn } from "@/lib/utils";
import { SaleListItem } from "@/lib/data/records";
import { useRouter } from "next/navigation";
import { PaginationControls } from "@/components/PaginationControls";
import { TableInfo } from "@/components/TableInfo";
import Link from "next/link";

interface AuthorPaymentsTableProps {
  groups: AuthorGroup[];
  totalGroups: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  showAll: boolean;
}

export default function AuthorPaymentsTable({
  groups,
  totalGroups,
  currentPage,
  totalPages,
  pageSize,
  showAll,
}: AuthorPaymentsTableProps) {
  const router = useRouter();
  const [confirmingAuthor, setConfirmingAuthor] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [loadingAuthorId, setLoadingAuthorId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRowClick = (sale: SaleListItem) => {
    router.push(`/sales/records/${sale.id}?from=payments`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(page));
    params.delete("showAll"); // Clear showAll when paginating
    router.push(`/sales/payments?${params.toString()}`);
  };

  const openConfirm = (authorId: number, authorName: string) => {
    setError(null);
    setConfirmingAuthor({ id: authorId, name: authorName });
  };

  const handleConfirmMarkAllPaid = async () => {
    if (!confirmingAuthor) return;
    setLoadingAuthorId(confirmingAuthor.id);
    setError(null);
    const result = await markAllPaid(confirmingAuthor.id);
    setLoadingAuthorId(null);
    if (result.success) {
      setConfirmingAuthor(null);
      router.refresh();
    } else {
      setError(result.error ?? "Failed to mark as paid");
    }
  };

  const closeDialog = () => {
    if (loadingAuthorId === null) {
      setConfirmingAuthor(null);
      setError(null);
    }
  };

  const startRecord =
    totalGroups === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord =
    totalGroups === 0 ? 0 : Math.min(currentPage * pageSize, totalGroups);

  return (
    <div className="space-y-4">
      {/* Table Info - Using reusable component */}
      <TableInfo
        startRecord={startRecord}
        endRecord={endRecord}
        totalRecords={totalGroups}
        showAll={showAll}
        itemsPerPage={pageSize}
        onToggleShowAll={() => {
          const params = new URLSearchParams(window.location.search);
          if (showAll) {
            params.delete("showAll");
            params.set("page", "1");
          } else {
            params.set("showAll", "true");
            params.delete("page");
          }
          router.push(`/sales/payments?${params.toString()}`);
        }}
      />

      {/* Table */}
      <Table>
        <TableBody>
          {groups.map((group, groupIndex) => (
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
                  <button
                    onClick={() => openConfirm(group.authorId, group.author)}
                    disabled={
                      loadingAuthorId === group.authorId ||
                      group.unpaidTotal === 0
                    }
                    className={cn(
                      "text-sm font-medium transition-colors px-3 py-1 rounded",
                      group.unpaidTotal === 0 || loadingAuthorId === group.authorId
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    )}
                  >
                    {loadingAuthorId === group.authorId
                      ? "Processing..."
                      : "Mark all as paid"}
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
              {group.sales
                .map((sale) => (
                  <TableRow
                    key={sale.id}
                    onClick={() => handleRowClick(sale)}
                    className={cn(
                      "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800",
                      sale.paid === "paid" &&
                        "opacity-50 bg-gray-50 dark:bg-gray-900"
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
                    <TableCell className="text-right">
                      {sale.quantity}
                    </TableCell>
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
                        ${sale.authorRoyalty}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        year: "numeric",
                      }).format(sale.date)}
                    </TableCell>
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
              {groupIndex < groups.length - 1 && (
                <TableRow className="bg-gray-200 dark:bg-gray-700">
                  <TableCell colSpan={6} className="h-2 p-0" />
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>

      {/* Pagination Controls - Using reusable component */}
      {!showAll && totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* Mark all as paid confirmation dialog */}
      <Dialog open={!!confirmingAuthor} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => loadingAuthorId !== null && e.preventDefault()}
          onEscapeKeyDown={(e) => loadingAuthorId !== null && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Mark all as paid?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 pt-1">
                <p>
                  Mark all unpaid royalties for <strong>{confirmingAuthor?.name}</strong> as
                  paid? This cannot be undone.
                </p>
                {error && (
                  <p className="text-destructive text-sm font-medium">{error}</p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={loadingAuthorId !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmMarkAllPaid}
              disabled={loadingAuthorId !== null}
            >
              {loadingAuthorId !== null ? "Processing..." : "Mark all as paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
