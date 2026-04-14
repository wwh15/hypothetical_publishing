"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteSale, togglePaidStatus } from "@/app/(main)/sales/action";
import type { SaleDetailPayload } from "@/lib/data/records";
import { CURRENCY_SYMBOLS } from "@/lib/currency-conversion";
import { Decimal } from "decimal.js";
import { cn } from "@/lib/utils";
import {
  saleDistributorBadge,
  saleFormatBadge,
} from "@/lib/table-configs/sales-columns";
import type { SaleSource } from "@prisma/client";
import { Button } from "@/components/ui/button";

interface SalesRecordViewProps {
  sale: SaleDetailPayload;
  onEdit: () => void;
}

const SOURCE_BADGE_CLASS: Record<SaleSource, string> = {
  DISTRIBUTOR:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  HAND_SOLD:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  KICKSTARTER:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
};

const SOURCE_LABEL: Record<SaleSource, string> = {
  DISTRIBUTOR: "Distributor",
  HAND_SOLD: "Hand sold",
  KICKSTARTER: "Kickstarter",
};

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border/60 py-2.5 last:border-0 sm:grid sm:grid-cols-[minmax(8rem,30%)_1fr] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-sm font-medium text-foreground">
        {children}
      </dd>
    </div>
  );
}

function unitsLine(sale: SaleDetailPayload): string {
  if (sale.format === "KINDLE_UNLIMITED") {
    return sale.kenp != null ? `${sale.kenp.toLocaleString()} KENP` : "—";
  }
  return sale.quantity != null ? `${sale.quantity} units` : "—";
}

export default function SalesRecordView({ sale, onEdit }: SalesRecordViewProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [togglingPaid, setTogglingPaid] = useState(false);

  const currencyUpper = sale.currency.toUpperCase();
  const isZeroDecimal = sale.currency === "JPY";
  const formattedAmount = new Decimal(sale.publisherRevenueOriginal).toFixed(
    isZeroDecimal ? 0 : 2
  );

  const periodLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(sale.date);

  const handleDelete = async () => {
    setLoading(true);
    await deleteSale(sale.id);
  };

  const bookReleased = sale.book.released;
  const cannotMarkProjectedPaid = !bookReleased && !sale.paid;

  const handleTogglePaid = async () => {
    if (cannotMarkProjectedPaid) return;
    setTogglingPaid(true);
    const result = await togglePaidStatus(sale.id, sale.paid);
    setTogglingPaid(false);
    if (result?.success) router.refresh();
    else if (result?.error) alert(result.error);
  };

  return (
    <>
      <header className="mb-8 flex flex-col gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Sale #{sale.id}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Accounting period: {periodLabel}{" "}
            <span className="text-muted-foreground/80">(UTC)</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" onClick={onEdit}>
            Edit record
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete
          </Button>
        </div>
      </header>

      {/* Money first — what finance users open this page for */}
      <section className="mb-10">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Amounts
        </h2>
        <div className="grid gap-4 lg:grid-cols-12 lg:items-stretch">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm lg:col-span-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Author royalty (USD)
            </p>
            <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-primary sm:text-5xl">
              ${new Decimal(sale.authorRoyalty).toFixed(2)}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Publisher revenue (USD)
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 sm:text-3xl">
                ${new Decimal(sale.publisherRevenueUSD).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Publisher revenue ({currencyUpper})
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 sm:text-3xl">
                <bdi>{CURRENCY_SYMBOLS[sale.currency]}</bdi>
                {formattedAmount}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Payment + volume — operational */}
      <section className="mb-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card shadow-sm p-5 sm:p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Royalty payment
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className={
                sale.paid
                  ? "inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100"
                  : "inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-950 dark:bg-amber-950/50 dark:text-amber-100"
              }
            >
              {sale.paid ? "Paid" : "Pending"}
            </span>
            <Button
              type="button"
              variant={sale.paid ? "outline" : "default"}
              size="sm"
              onClick={handleTogglePaid}
              disabled={togglingPaid || cannotMarkProjectedPaid}
              className={cn(
                !sale.paid &&
                  !cannotMarkProjectedPaid &&
                  "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
              )}
            >
              {togglingPaid
                ? "Updating…"
                : sale.paid
                  ? "Mark as unpaid"
                  : "Mark as paid"}
            </Button>
          </div>
          {!bookReleased && (
            <p className="mt-3 max-w-md text-xs text-muted-foreground">
              {sale.paid
                ? "This book is still pre-release. You can mark this row as unpaid if payment was recorded in error."
                : "This book is still pre-release. Projected sales cannot be marked paid until the book is released."}
            </p>
          )}
          <dl className="mt-6">
            <MetaRow label="Units / KENP">{unitsLine(sale)}</MetaRow>
            <MetaRow label="Original currency">{currencyUpper}</MetaRow>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm p-5 sm:p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Channels
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Format
              </p>
              {saleFormatBadge(sale.format, "comfortable")}
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Distributor
              </p>
              {saleDistributorBadge(sale.distributor, "comfortable")}
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Source
              </p>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
                  SOURCE_BADGE_CLASS[sale.source]
                )}
              >
                {SOURCE_LABEL[sale.source]}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Book context — secondary to the transaction */}
      <section className="mb-10 rounded-xl border border-border/80 bg-card shadow-sm px-5 py-5 sm:px-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Book
        </h2>
        <p className="mt-3 text-lg font-semibold leading-snug sm:text-xl">
          <Link
            href={`/books/${sale.book.id}`}
            className="underline-offset-4 hover:underline"
          >
            {sale.book.title}
          </Link>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          <Link
            href={`/authors/${sale.book.author.id}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {sale.book.author.name}
          </Link>
        </p>
      </section>

      <section className="border-t border-border/80 pt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Comment
        </h2>
        <p className="max-w-3xl whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
          {sale.comment != null && sale.comment !== "" ? sale.comment : "—"}
        </p>
      </section>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-sale-title"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg"
          >
            <h3
              id="delete-sale-title"
              className="text-lg font-bold text-destructive"
            >
              Delete this sale?
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              This permanently removes the sale record. This cannot be undone.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? "Deleting…" : "Delete"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
