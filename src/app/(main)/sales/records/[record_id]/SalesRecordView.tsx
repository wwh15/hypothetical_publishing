"use client";

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

interface SalesRecordViewProps {
  sale: SaleDetailPayload;
  onEdit: () => void;
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

  const handleDelete = async () => {
    setLoading(true);
    await deleteSale(sale.id);
  };

  const handleTogglePaid = async () => {
    setTogglingPaid(true);
    const result = await togglePaidStatus(sale.id, sale.paid);
    setTogglingPaid(false);
    if (result?.success) router.refresh();
    else if (result?.error) alert(result.error);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
      <div className="grid min-w-0 grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-medium text-gray-500">
            Record ID
          </label>
          <p className="text-lg font-semibold mt-1">{sale.id}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">
            Book Title
          </label>
          <p className="text-lg font-semibold mt-1">
            <Link
              href={`/books/${sale.book.id}`}
              className="text-blue-600 hover:underline"
            >
              {sale.book.title}
            </Link>
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">Author</label>
          <p className="text-lg font-semibold mt-1">
            {sale.book.author.name}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">Period</label>
          <p className="text-lg font-semibold mt-1">
            {new Intl.DateTimeFormat("en-US", {
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            }).format(sale.date)}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">
            Quantity
          </label>
          <p className="text-lg font-semibold mt-1">
            {sale.quantity != null ? `${sale.quantity} units` : "—"}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">KENP</label>
          <p className="text-lg font-semibold mt-1">
            {sale.kenp != null ? sale.kenp.toLocaleString() : "—"}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">Format</label>
          <div className="mt-1">
            {saleFormatBadge(sale.format, "comfortable")}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">
            Distributor
          </label>
          <div className="mt-1">
            {saleDistributorBadge(sale.distributor, "comfortable")}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">
            Publisher Revenue ({CURRENCY_SYMBOLS[sale.currency]}
            {currencyUpper})
          </label>
          <p className="text-lg font-semibold mt-1 text-green-600">
            <bdi>{CURRENCY_SYMBOLS[sale.currency]}</bdi>
            {formattedAmount}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">
            Publisher Revenue (USD Equivalent)
          </label>
          <p className="text-lg font-semibold mt-1 text-green-600">
            ${new Decimal(sale.publisherRevenueUSD).toFixed(2)}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">
            Author Royalty
          </label>
          <p className="text-lg font-semibold mt-1 text-blue-600">
            ${new Decimal(sale.authorRoyalty).toFixed(2)}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">Source</label>
          <p className="mt-1">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
                sale.source === "HAND_SOLD"
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
              )}
            >
              {sale.source === "HAND_SOLD" ? "Hand Sold" : "Distributor"}
            </span>
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">
            Payment Status
          </label>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
                sale.paid
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
              )}
            >
              {sale.paid ? "Paid" : "Pending"}
            </span>
            <button
              type="button"
              onClick={handleTogglePaid}
              disabled={togglingPaid}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                sale.paid
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  : "bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800",
                togglingPaid && "opacity-70 cursor-not-allowed"
              )}
            >
              {togglingPaid
                ? "Updating…"
                : sale.paid
                  ? "Mark as unpaid"
                  : "Mark as paid"}
            </button>
          </div>
        </div>

        <div className="md:col-span-2 min-w-0 max-w-full">
          <label className="text-sm font-medium text-gray-500">
            Comment
          </label>
          <p className="mt-1 max-w-full whitespace-pre-wrap break-words text-lg font-semibold text-muted-foreground">
            {sale.comment != null && sale.comment !== ""
              ? sale.comment
              : "—"}
          </p>
        </div>
      </div>

      <div className="flex gap-4 mt-8 pt-6 border-t">
        <button
          type="button"
          onClick={onEdit}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Edit Record
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Delete Record
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md shadow-lg border dark:border-gray-700">
            <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
            <p className="mb-6 text-muted-foreground">
              This permanently removes this sale record. This cannot be
              undone.
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
