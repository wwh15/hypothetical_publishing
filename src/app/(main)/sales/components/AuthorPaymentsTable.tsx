"use client";

import React, { useState } from "react";
import { AuthorGroup, markAllPaid } from "@/lib/data/author-payment";
import { cn } from "@/lib/utils";
import { SaleListItem } from "@/lib/data/records";
import { useRouter } from "next/navigation";
import { PaginationControls } from "@/components/PaginationControls";
import { TableInfo } from "@/components/TableInfo";
import { BaseDataTable } from "@/components/BaseDataTable";
import { getAuthorPaymentPresetColumns } from "@/lib/table-configs/author-payment-columns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronDown, Search, X } from "lucide-react";

interface AuthorPaymentsTableProps {
  groups: AuthorGroup[];
  totalGroups: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  showAll: boolean;
  search: string;
}

export default function AuthorPaymentsTable({
  groups,
  totalGroups,
  currentPage,
  totalPages,
  pageSize,
  showAll,
  search,
}: AuthorPaymentsTableProps) {
  const router = useRouter();
  const [confirmingAuthor, setConfirmingAuthor] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [loadingAuthorId, setLoadingAuthorId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(search ?? "");

  // Manual state to track which authors are expanded
  const [openIds, setOpenIds] = useState<number[]>([]);
  const toggleGroup = (id: number) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleRowClick = (sale: SaleListItem) => {
    router.push(`/sales/records/${sale.id}?from=payments`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(page));
    params.delete("showAll");
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);

    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    } else {
      params.delete("search");
    }

    params.set("page", "1"); // Reset to page 1 on new search
    router.push(`/sales/payments?${params.toString()}`);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    const params = new URLSearchParams(window.location.search);
    params.delete("search");
    params.set("page", "1");
    router.push(`/sales/payments?${params.toString()}`);
  };

  const startRecord = totalGroups === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord =
    totalGroups === 0 ? 0 : Math.min(currentPage * pageSize, totalGroups);
  const columns = getAuthorPaymentPresetColumns("full");

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearchSubmit} className="relative group/form">
        {/* Clickable Search Icon */}
        <button
          type="submit"
          className="absolute inset-y-0 left-0 pl-3 flex items-center z-10"
          aria-label="Submit search"
        >
          <Search className="h-5 w-5 text-gray-400 hover:text-blue-500 transition-colors" />
        </button>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search authors by name or email..."
          className={cn(
            "block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-lg",
            "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
            "focus:outline-none focus:ring-2 focus:ring-blue-500"
          )}
        />

        {/* Clear Button */}
        {searchQuery && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 z-10"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </form>
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

      <div className="space-y-4">
        {groups.map((group) => {
          // Check if this specific author is open
          const isOpen = openIds.includes(group.authorId);

          return (
            <div
              key={group.authorId}
              className="border rounded-lg overflow-hidden bg-white dark:bg-gray-950 shadow-sm"
            >
              {/* Header: Clickable to toggle, but button is protected by stopPropagation */}
              <div
                onClick={() => toggleGroup(group.authorId)}
                className={cn(
                  "flex items-center justify-between p-4 cursor-pointer transition-colors select-none",
                  isOpen ? "bg-muted/50 border-b" : "hover:bg-muted/20"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Chevron rotates based on open state */}
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-gray-400 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                  <div>
                    <h3 className="font-bold text-lg text-foreground leading-none mb-1">
                      {group.author}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Unpaid Total:{" "}
                      <span className="text-foreground font-semibold">
                        ${group.unpaidTotal.toFixed(2)}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openConfirm(group.authorId, group.author);
                  }}
                  disabled={
                    loadingAuthorId === group.authorId ||
                    !group.sales.some((s) => s.paid === "pending")
                  }
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-all shadow-sm shrink-0",
                    !group.sales.some((s) => s.paid === "pending") ||
                      loadingAuthorId === group.authorId
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                  )}
                >
                  {loadingAuthorId === group.authorId
                    ? "Processing..."
                    : "Mark all as paid"}
                </button>
              </div>

              {/* 4. Sales Data: Only rendered if isOpen is true */}
              {isOpen && (
                <div className="p-0 animate-in fade-in slide-in-from-top-1 duration-200">
                  <BaseDataTable
                    columns={columns}
                    data={group.sales}
                    emptyMessage={`${group.author} has no recorded sales.`}
                    onRowClick={handleRowClick}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalGroups === 0 && (
          <p className="text-muted-foreground">
            No authors found matching your criteria.
          </p>
      )}

      {!showAll && totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      <Dialog
        open={!!confirmingAuthor}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) =>
            loadingAuthorId !== null && e.preventDefault()
          }
          onEscapeKeyDown={(e) =>
            loadingAuthorId !== null && e.preventDefault()
          }
        >
          <DialogHeader>
            <DialogTitle>Mark all as paid?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 pt-1">
                <p>
                  Mark all unpaid royalties for{" "}
                  <strong>{confirmingAuthor?.name}</strong> as paid? This cannot
                  be undone.
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