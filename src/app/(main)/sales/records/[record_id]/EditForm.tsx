"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateSale,
  deleteSale,
  togglePaidStatus,
} from "@/app/(main)/sales/action";
import type { SaleDetailPayload } from "@/lib/data/records";
import Link from "next/link";
import { BookSelectBox } from "@/components/BookSelectBox";
import { BookListItem } from "@/lib/data/books";
import MonthYearSelector from "@/components/MonthYearSelector";
import { Decimal } from "decimal.js";
import {
  isValidCurrencyInput,
  isValidQuantityInput,
  normalizeCurrency,
  validateCurrency,
  validateDatePeriod,
  validateQuantity,
  validateRoyaltyLimit,
} from "@/lib/validation";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { convertCurrency, CURRENCY_SYMBOLS } from "@/lib/currency-conversion";

/** Get the royalty rate (as percentage) for a book based on sale source */
function getRateForSource(
  book: BookListItem,
  source: "DISTRIBUTOR" | "HAND_SOLD"
): number {
  return source === "HAND_SOLD"
    ? book.handSoldRoyaltyRate
    : book.distRoyaltyRate;
}

/** Auto-calculate revenue for hand-sold: (coverPrice - printCost) * quantity */
function calcHandSoldRevenue(
  book: BookListItem,
  quantity: number
): number | null {
  if (quantity > 0) {
    return (book.coverPrice - book.printCost) * quantity;
  }
  return null;
}

interface EditFormProps {
  books: BookListItem[];
  sale: SaleDetailPayload;
}

const SALES_YEAR_MIN = 1000;
const SALES_YEAR_MAX = new Date().getFullYear();

function initialDateMonth(date: Date): string {
  if (
    !date ||
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() < SALES_YEAR_MIN || // Use UTC here too
    date.getUTCFullYear() > SALES_YEAR_MAX
  ) {
    return "";
  }
  // getUTCMonth() ensures Nov 1st 00:00Z returns 10 (November)
  return String(date.getUTCMonth() + 1).padStart(2, "0");
}

function initialDateYear(date: Date): string {
  if (!date || !Number.isFinite(date.getTime())) {
    return "";
  }

  const year = date.getUTCFullYear(); // Use UTC

  if (year < SALES_YEAR_MIN || year > SALES_YEAR_MAX) {
    return "";
  }
  return String(year);
}

export default function EditForm({ sale, books }: EditFormProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    bookId: sale.book.id,
    dateMonth: initialDateMonth(sale.date),
    dateYear: initialDateYear(sale.date),
    quantity: sale.quantity,
    publisherRevenueOriginal: new Decimal(
      sale.publisherRevenueOriginal
    ).toNumber(),
    publisherRevenueUSD: new Decimal(sale.publisherRevenueUSD).toNumber(),
    currency: sale.currency,
    authorRoyalty: new Decimal(sale.authorRoyalty).toNumber(),
    royaltyOverridden: sale.royaltyOverridden,
    comment: sale.comment ?? "",
    source: sale.source,
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [togglingPaid, setTogglingPaid] = useState(false);

  // Validation States
  const [dateError, setDateError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [displayRevenueOriginal, setDisplayRevenueOriginal] = useState(
    formData.publisherRevenueOriginal !== 0
      ? formData.publisherRevenueOriginal.toFixed(2)
      : ""
  );
  const [displayRevenueUSD, setDisplayRevenueUSD] = useState(
    formData.publisherRevenueUSD !== 0
      ? formData.publisherRevenueUSD.toFixed(2)
      : ""
  );
  const [displayRoyalty, setDisplayRoyalty] = useState(
    formData.authorRoyalty.toFixed(2)
  );
  const [displayQuantity, setDisplayQuantity] = useState(
    formData.quantity !== 0 ? formData.quantity.toFixed(0) : ""
  );

  const handleSave = async () => {
    setErrors({});
    setDateError(null);
    const newErrors: Record<string, string> = {};

    // 1. Run validations
    const dateCheck = validateDatePeriod(formData.dateYear, formData.dateMonth);
    const qtyCheck = validateQuantity(displayQuantity);
    const revenueOriginalCheck = validateCurrency(displayRevenueOriginal);

    // 2. Accumulate errors
    if (!dateCheck.success) {
      setDateError(dateCheck.error);
      newErrors.date = dateCheck.error;
    }
    if (!qtyCheck.success) newErrors.quantity = qtyCheck.error;
    if (!revenueOriginalCheck.success)
      newErrors.publisherRevenue = revenueOriginalCheck.error;

    // 3. Stop if there are errors (This handles the UI)
    if (Object.keys(newErrors).length > 0) {
      setErrors({ ...newErrors, global: "Please fix the errors above." });
      return;
    }

    // 4. FINAL GUARD (This satisfies TypeScript)
    // By checking .success here, TypeScript "narrows" the type inside the block
    if (dateCheck.success && qtyCheck.success && revenueOriginalCheck.success) {
      setLoading(true);
      try {
        const result = await updateSale(sale.id, {
          bookId: formData.bookId,
          date: dateCheck.data, // ✅ TypeScript now knows .data exists
          quantity: qtyCheck.data, // ✅ TypeScript now knows .data exists
          publisherRevenueOriginal: revenueOriginalCheck.data, // ✅ TypeScript now knows .data exists
          publisherRevenueUSD: normalizeCurrency(displayRevenueUSD),
          authorRoyalty: parseFloat(displayRoyalty) || 0,
          source: formData.source,
          comment: formData.comment.trim() || null,
          currency: formData.currency,
        });

        if (result.success) {
          setIsEditing(false);
        } else {
          setErrors({ global: result.error ?? "Failed to update." });
        }
      } catch {
        setErrors({ global: "Network error occurred." });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    await deleteSale(sale.id);
  };

  const resetForm = () => {
    setFormData({
      bookId: sale.book.id,
      dateMonth: initialDateMonth(sale.date),
      dateYear: initialDateYear(sale.date),
      quantity: sale.quantity,
      publisherRevenueOriginal: new Decimal(
        sale.publisherRevenueOriginal
      ).toNumber(),
      publisherRevenueUSD: new Decimal(sale.publisherRevenueUSD).toNumber(),
      authorRoyalty: new Decimal(sale.authorRoyalty).toNumber(),
      royaltyOverridden: sale.royaltyOverridden,
      comment: sale.comment ?? "",
      currency: sale.currency,
      source: sale.source,
    });

    setDisplayRevenueOriginal(
      new Decimal(sale.publisherRevenueOriginal).toFixed(2)
    );
    setDisplayRevenueUSD(new Decimal(sale.publisherRevenueUSD).toFixed(2));
    setDisplayRoyalty(new Decimal(sale.authorRoyalty).toFixed(2));
    setDisplayQuantity(String(sale.quantity));

    setErrors({});
    setDateError(null);
  };

  const handleCancel = () => {
    resetForm();
    setIsEditing(false);
  };

  const handleTogglePaid = async () => {
    setTogglingPaid(true);
    const result = await togglePaidStatus(sale.id, sale.paid);
    setTogglingPaid(false);
    if (result?.success) router.refresh();
    else if (result?.error) alert(result.error);
  };

  {/* --------------------------Sales Detail View-------------------------- */}
  if (!isEditing) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <p className="text-lg font-semibold mt-1">{sale.quantity} units</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">
              Publisher Revenue ({CURRENCY_SYMBOLS[sale.currency]}{formData.currency})`
            </label>
            <p className="text-lg font-semibold mt-1 text-green-600">
              {CURRENCY_SYMBOLS[sale.currency]}{new Decimal(sale.publisherRevenueOriginal).toFixed(2)}
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
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  sale.source === "HAND_SOLD"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-blue-100 text-blue-800"
                }`}
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

          {sale.comment != null && sale.comment !== "" && (
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-500">
                Comment
              </label>
              <p className="text-lg font-semibold mt-1 whitespace-pre-wrap">
                {sale.comment}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-4 mt-8 pt-6 border-t">
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Edit Record
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete Record
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md">
              <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
              <p className="mb-6">
                Are you sure you want to delete this sale record?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  {loading ? "Deleting..." : "Delete"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
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

  const selectorValue =
    formData.dateYear && formData.dateMonth
      ? `${formData.dateYear}-${String(formData.dateMonth).padStart(2, "0")}`
      : null;

  {/* --------------------------Edit Form View-------------------------- */}
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
      <h2 className="text-xl font-bold mb-4">Edit Sale Record</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Book Reference */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Book Reference
          </label>
          <BookSelectBox
            books={books}
            selectedBookId={String(formData.bookId)}
            onSelect={(bookId) => {
              const book = books.find((b) => b.id === Number(bookId));
              if (!book) return;

              let revOriginal = formData.publisherRevenueOriginal;
              let revUSD = formData.publisherRevenueUSD;

              // 1. Handle Hand-Sold Logic
              if (formData.source === "HAND_SOLD") {
                const autoRev =
                  calcHandSoldRevenue(book, formData.quantity) ?? 0;
                revOriginal = autoRev;
                revUSD = autoRev; // Hand-sold is always USD

                // Update UI strings for the revenue fields
                setDisplayRevenueOriginal(revOriginal.toFixed(2));
                setDisplayRevenueUSD(revUSD.toFixed(2));
              } else {
                // 2. Handle Distributor Logic
                // Recalculate USD equivalent based on the current currency in state
                revUSD = convertCurrency(revOriginal, formData.currency);
                setDisplayRevenueUSD(revUSD.toFixed(2));
              }

              // 3. Royalty Calculation
              // Keeping your existing rate math exactly as is
              const rate = book
                ? getRateForSource(book, formData.source)
                : null;
              const newRoyalty =
                rate != null ? revUSD * (rate / 100) : formData.authorRoyalty;

              setDisplayRoyalty(newRoyalty.toFixed(2));

              // 4. Update the actual form state
              setFormData((prev) => ({
                ...prev,
                bookId: Number(bookId),
                publisherRevenueOriginal: revOriginal,
                publisherRevenueUSD: revUSD,
                authorRoyalty: newRoyalty,
              }));

              // Clear bookId error if it exists
              if (errors.bookId) setErrors((prev) => ({ ...prev, bookId: "" }));
            }}
          />
        </div>

        {/* Date Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Sale Date</label>
          <MonthYearSelector
            value={selectorValue}
            onChange={(v) => {
              setDateError(null);
              setErrors((prev) => ({ ...prev, date: "" }));
              if (!v) {
                setFormData({ ...formData, dateYear: "", dateMonth: "" });
                return;
              }
              const [y, m] = v.split("-");
              setFormData({
                ...formData,
                dateYear: y,
                dateMonth: m ? String(parseInt(m, 10)).padStart(2, "0") : "",
              });
            }}
            placeholder="Select month & year"
          />
          {dateError && (
            <p className="mt-2 text-sm text-red-600 font-medium">{dateError}</p>
          )}
        </div>

        {/* Source (read-only) */}
        <div>
          <label className="block text-sm font-medium mb-2">Source</label>
          <p className="mt-1">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                formData.source === "HAND_SOLD"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {formData.source === "HAND_SOLD" ? "Hand Sold" : "Distributor"}
            </span>
          </p>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Quantity Sold
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={displayQuantity}
            className={cn(
              "w-full px-3 py-2 border rounded-md transition-colors",
              errors.quantity ? "border-red-500" : "border-gray-300"
            )}
            onChange={(e) => {
              const val = e.target.value;
              setDisplayQuantity(val);
              if (errors.quantity)
                setErrors((prev) => ({ ...prev, quantity: "" }));

              const qtyValidation = validateQuantity(val);
              if (qtyValidation.success) {
                const qty = qtyValidation.data;

                setFormData((prev) => {
                  const next = { ...prev, quantity: qty };
                  const book = books.find((b) => b.id === prev.bookId);

                  // 1. Handle Hand-Sold (Req 3.4.1): Recalculate Revenue + Royalty
                  if (prev.source === "HAND_SOLD" && book) {
                    const autoRev = calcHandSoldRevenue(book, qty) ?? 0;

                    // Sync both Original and USD since Hand-sold is always USD
                    next.publisherRevenueOriginal = autoRev;
                    next.publisherRevenueUSD = autoRev;

                    // Update UI displays
                    setDisplayRevenueOriginal(autoRev.toFixed(2));
                    setDisplayRevenueUSD(autoRev.toFixed(2));

                    const rate = getRateForSource(book, "HAND_SOLD");
                    next.authorRoyalty = autoRev * (rate / 100);
                    setDisplayRoyalty(next.authorRoyalty.toFixed(2));
                  }
                  // 2. Handle Distributor: Just update Royalty based on existing USD Revenue
                  else {
                    const rate = book
                      ? getRateForSource(book, "DISTRIBUTOR")
                      : 0;
                    // Royalty is always calculated from the USD managed value
                    const newRoyalty = prev.publisherRevenueUSD * (rate / 100);
                    next.authorRoyalty = newRoyalty;
                    setDisplayRoyalty(newRoyalty.toFixed(2));
                  }

                  return next;
                });
              }
            }}
          />
          {errors.quantity && (
            <p className="mt-1 text-xs text-red-500 font-medium">
              {errors.quantity}
            </p>
          )}
        </div>

        {/* 1. Original Revenue Input */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Publisher Revenue (
            {CURRENCY_SYMBOLS[sale.currency]}{formData.currency})
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={displayRevenueOriginal}
            readOnly={formData.source === "HAND_SOLD"}
            className={cn(
              "w-full px-3 py-2 border rounded-md transition-colors",
              errors.publisherRevenue ? "border-red-500" : "border-gray-300",
              formData.source === "HAND_SOLD" &&
                "bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
            )}
            onChange={(e) => {
              if (formData.source === "HAND_SOLD") return;

              const val = e.target.value;
              setDisplayRevenueOriginal(val);
              if (errors.publisherRevenue)
                setErrors((prev) => ({ ...prev, publisherRevenue: "" }));

              const revCheck = validateCurrency(val);
              if (revCheck.success) {
                const originalValue = revCheck.data;

                // Convert to USD for system management
                const usdValue = convertCurrency(
                  originalValue,
                  formData.currency
                );
                setDisplayRevenueUSD(usdValue.toFixed(2));

                const book = books.find(
                  (b) => b.id === Number(formData.bookId)
                );
                const rate = book ? getRateForSource(book, formData.source) : 0;

                // Royalty calculated from USD value
                const newRoyalty = usdValue * (rate / 100);
                setDisplayRoyalty(newRoyalty.toFixed(2));

                setFormData((prev) => ({
                  ...prev,
                  publisherRevenueOriginal: originalValue,
                  publisherRevenueUSD: usdValue,
                  authorRoyalty: newRoyalty,
                }));
              }
            }}
            onBlur={() => {
              if (
                formData.source === "HAND_SOLD" ||
                displayRevenueOriginal === ""
              )
                return;
              const revCheck = validateCurrency(displayRevenueOriginal);
              if (revCheck.success) {
                setDisplayRevenueOriginal(revCheck.data.toFixed(2));
              }
            }}
          />
          {errors.publisherRevenue && (
            <p className="mt-1 text-xs text-red-500 font-medium">
              {errors.publisherRevenue}
            </p>
          )}
        </div>

        {/* 2. USD Equivalent Display (Non-modifiable) */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-500">
            Publisher Revenue (USD Equivalent)
          </label>
          <input
            type="text"
            value={displayRevenueUSD}
            readOnly
            tabIndex={-1}
            className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formData.source === "HAND_SOLD"
              ? "Calculated automatically from book costs."
              : `Converted from ${formData.currency} to USD using current exchange rates.`}
          </p>
        </div>

        {/* Author Royalty (read-only, auto-calculated) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Author Royalty ($)
          </label>
          <input
            type="text"
            value={displayRoyalty}
            readOnly
            className={cn(
              "w-full px-3 py-2 border rounded-md bg-gray-100 dark:bg-gray-700 cursor-not-allowed",
              errors.authorRoyalty ? "border-red-500" : "border-gray-300"
            )}
            tabIndex={-1}
          />
          {errors.authorRoyalty && (
            <p className="mt-1 text-xs text-red-500 font-medium">
              {errors.authorRoyalty}
            </p>
          )}
        </div>

        {/* Comment */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">Comment</label>
          <Textarea
            value={formData.comment}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, comment: e.target.value }))
            }
            placeholder="Optional note"
            maxLength={256}
            rows={2}
            className="resize-none w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-8 pt-6 border-t">
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center min-w-[120px]"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
