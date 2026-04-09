"use client";

import React, { useState } from "react";
import {
  AuthorGroup,
  markAllPaid,
  type AuthorPaymentGrandTotals,
} from "@/lib/data/author-payment";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PaginationControls } from "@/components/PaginationControls";
import { TableInfo } from "@/components/TableInfo";
import { BaseDataTable } from "@/components/BaseDataTable";
import {
  getPresetColumns,
  saleListRowClassNameForBookReleased,
} from "@/lib/table-configs/sales-columns";
import { createSalesRecordPath } from "@/lib/table-configs/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronDown, Hourglass, Search, Wallet, X } from "lucide-react";

type UnpaidChipVariant = "page" | "inline";

function UnpaidRoyaltyChips({
  payable,
  projected,
  variant,
}: {
  payable: number;
  projected: number;
  variant: UnpaidChipVariant;
}) {
  const page = variant === "page";
  return (
    <div
      className={cn("flex flex-wrap items-stretch gap-2", page && "gap-3")}
      role="group"
      aria-label="Unpaid royalty breakdown"
    >
      <div
        className={cn(
          "flex items-center rounded-lg border border-emerald-200/90 bg-emerald-50 dark:border-emerald-900/55 dark:bg-emerald-950/35",
          page ? "gap-3 px-4 py-3 min-w-[9.5rem]" : "gap-2 px-2.5 py-1.5"
        )}
        title="Released books — included when you use Mark all as paid"
      >
        <Wallet
          className={cn(
            "shrink-0 text-emerald-700 dark:text-emerald-400",
            page ? "h-5 w-5" : "h-4 w-4"
          )}
          aria-hidden
        />
        <div className="min-w-0 text-left">
          <p
            className={cn(
              "font-medium uppercase tracking-wide text-emerald-900/70 dark:text-emerald-300/85",
              page ? "text-xs" : "text-[10px] leading-tight"
            )}
          >
            Payable
          </p>
          <p
            className={cn(
              "font-semibold tabular-nums text-emerald-950 dark:text-emerald-50",
              page ? "text-xl" : "text-sm"
            )}
          >
            ${payable.toFixed(2)}
          </p>
        </div>
      </div>

      {projected > 0 && (
        <div
          className={cn(
            "flex items-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/25 dark:bg-muted/15",
            page ? "gap-3 px-4 py-3 min-w-[9.5rem]" : "gap-2 px-2.5 py-1.5"
          )}
          title="Unreleased books — held until the book is released"
        >
          <Hourglass
            className={cn(
              "shrink-0 text-muted-foreground",
              page ? "h-5 w-5" : "h-4 w-4"
            )}
            aria-hidden
          />
          <div className="min-w-0 text-left">
            <p
              className={cn(
                "font-medium uppercase tracking-wide text-muted-foreground",
                page ? "text-xs" : "text-[10px] leading-tight"
              )}
            >
              Pre-release
            </p>
            <p
              className={cn(
                "font-semibold tabular-nums text-muted-foreground",
                page ? "text-xl" : "text-sm"
              )}
            >
              ${projected.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface AuthorPaymentsTableProps {
  groups: AuthorGroup[];
  totals: AuthorPaymentGrandTotals;
  totalGroups: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  showAll: boolean;
  search: string;
}

export default function AuthorPaymentsTable({
  groups,
  totals,
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

  const handlePaypalClick = async (group: AuthorGroup) => {
    const payPalUsername = group.payPalUsername?.trim();
    const payableAmount = group.unpaidPayableTotal.toFixed(2);
    if (payPalUsername) {
      const paypalUrl = `https://paypal.me/${payPalUsername}/${payableAmount}`;
      window.open(paypalUrl, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(`/authors/${group.authorId}/edit`);
  };

  const handleVenmoClick = async (group: AuthorGroup) => {
    const venmoUsername = group.venmoUsername?.trim().replace(/^@/, '');;
    const payableAmount = group.unpaidPayableTotal.toFixed(2);
    if (venmoUsername) {
      const venmoUrl = `https://venmo.com/${venmoUsername}?amount=${payableAmount}&note=Author%20Royalty`;
      window.open(venmoUrl, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(`/authors/${group.authorId}/edit`);
  };

  const startRecord = totalGroups === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord =
    totalGroups === 0 ? 0 : Math.min(currentPage * pageSize, totalGroups);
  const columns = React.useMemo(
    () =>
      getPresetColumns("full")
        .filter((col) => col.key !== "author")
        .map((col) => ({
          ...col,
          className: cn("text-center align-middle", col.className),
          headerClassName: "text-center",
        })),
    []
  );

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

      <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
        <p className="text-xs text-muted-foreground mb-2">
          Unpaid totals{search.trim() ? " (search)" : ""}
        </p>
        <UnpaidRoyaltyChips
          payable={totals.unpaidPayable}
          projected={totals.unpaidProjected}
          variant="page"
        />
      </div>

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
                  "flex flex-col gap-4 p-4 cursor-pointer transition-colors select-none sm:flex-row sm:items-center sm:justify-between",
                  isOpen ? "bg-muted/50 border-b" : "hover:bg-muted/20"
                )}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <ChevronDown
                    className={cn(
                      "mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                  <div className="min-w-0 space-y-2">
                    <h3 className="font-bold text-lg leading-tight">
                      <Link
                        href={`/authors/${group.authorId}`}
                        className="text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {group.author}
                      </Link>
                    </h3>
                    <div className="flex flex-wrap items-stretch gap-2">
                      <UnpaidRoyaltyChips
                        payable={group.unpaidPayableTotal}
                        projected={group.unpaidProjectedTotal}
                        variant="inline"
                      />
                      <Button
                        type="button"
                        variant={"outline"}
                        size="sm"
                        className="h-auto self-stretch"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handlePaypalClick(group);
                        }}
                      >
                        {group.payPalUsername ? "Pay on Paypal" : "+ Add Paypal"}
                      </Button>
                      <Button
                        type="button"
                        variant={"outline"}
                        size="sm"
                        className="h-auto self-stretch"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleVenmoClick(group);
                        }}
                      >
                        {group.venmoUsername ? "Pay on Venmo" : "+ Add Venmo"}
                      </Button>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="self-start sm:self-center sm:shrink-0 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openConfirm(group.authorId, group.author);
                  }}
                  disabled={
                    loadingAuthorId === group.authorId ||
                    group.unpaidPayableTotal <= 0
                  }
                >
                  {loadingAuthorId === group.authorId
                    ? "Processing..."
                    : "Mark All as Paid"}
                </Button>
              </div>

              {/* 4. Sales Data: Only rendered if isOpen is true */}
              {isOpen && (
                <div className="p-0 animate-in fade-in slide-in-from-top-1 duration-200">
                  <BaseDataTable
                    columns={columns}
                    data={group.sales}
                    emptyMessage={`${group.author} has no recorded sales.`}
                    getRowHref={(sale) =>
                      createSalesRecordPath(sale.id, "/sales/records", {
                        from: "payments",
                      })
                    }
                    getRowLinkLabel={(sale) =>
                      sale.title
                        ? `Sale: ${sale.title}`
                        : `Sale record ${sale.id}`
                    }
                    getRowClassName={saleListRowClassNameForBookReleased}
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
            <DialogTitle>Mark payable royalties as paid?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 pt-1">
                <p>
                  This updates <strong>{confirmingAuthor?.name}</strong>
                  &apos;s released-book sales only. Pre-release rows stay
                  pending. This cannot be undone.
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