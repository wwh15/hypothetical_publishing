"use client";

import { useState } from "react";
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
    date.getFullYear() < SALES_YEAR_MIN ||
    date.getFullYear() > SALES_YEAR_MAX
  ) {
    return "";
  }
  return String(date.getMonth() + 1).padStart(2, "0");
}

function initialDateYear(date: Date): string {
  const year = date?.getFullYear();
  if (
    !date ||
    !Number.isFinite(date.getTime()) ||
    year < SALES_YEAR_MIN ||
    year > SALES_YEAR_MAX
  ) {
    return "";
  }
  return String(year);
}

export default function EditForm({ sale, books }: EditFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    bookId: sale.book.id,
    dateMonth: initialDateMonth(sale.date),
    dateYear: initialDateYear(sale.date),
    quantity: sale.quantity,
    publisherRevenue: new Decimal(sale.publisherRevenue).toNumber(),
    authorRoyalty: new Decimal(sale.authorRoyalty).toNumber(),
    royaltyOverridden: sale.royaltyOverridden,
    comment: sale.comment ?? "",
    source: sale.source,
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validation States
  const [dateError, setDateError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [displayRevenue, setDisplayRevenue] = useState(
    formData.publisherRevenue !== 0 ? formData.publisherRevenue.toFixed(2) : ""
  );
  const [displayRoyalty, setDisplayRoyalty] = useState(
    formData.authorRoyalty !== 0 ? formData.authorRoyalty.toFixed(2) : ""
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
    const revenueCheck = validateCurrency(displayRevenue);
  
    // 2. Accumulate errors
    if (!dateCheck.success) {
      setDateError(dateCheck.error);
      newErrors.date = dateCheck.error;
    }
    if (!qtyCheck.success) newErrors.quantity = qtyCheck.error;
    if (!revenueCheck.success) newErrors.publisherRevenue = revenueCheck.error;
  
    // 3. Stop if there are errors (This handles the UI)
    if (Object.keys(newErrors).length > 0) {
      setErrors({ ...newErrors, global: "Please fix the errors above." });
      return;
    }
  
    // 4. FINAL GUARD (This satisfies TypeScript)
    // By checking .success here, TypeScript "narrows" the type inside the block
    if (dateCheck.success && qtyCheck.success && revenueCheck.success) {
      setLoading(true);
      try {
        const result = await updateSale(sale.id, {
          bookId: formData.bookId,
          date: dateCheck.data,       // ✅ TypeScript now knows .data exists
          quantity: qtyCheck.data,   // ✅ TypeScript now knows .data exists
          publisherRevenue: revenueCheck.data, // ✅ TypeScript now knows .data exists
          authorRoyalty: parseFloat(displayRoyalty) || 0,
          source: formData.source,
          comment: formData.comment.trim() || null,
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
      dateMonth: String(sale.date.getMonth() + 1).padStart(2, "0"),
      dateYear: String(sale.date.getFullYear()),
      quantity: sale.quantity,
      publisherRevenue: new Decimal(sale.publisherRevenue).toNumber(),
      authorRoyalty: new Decimal(sale.authorRoyalty).toNumber(),
      royaltyOverridden: sale.royaltyOverridden,
      comment: sale.comment ?? "",
      source: sale.source,
    });

    setDisplayRevenue(new Decimal(sale.publisherRevenue).toFixed(2));
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
    setLoading(true);
    await togglePaidStatus(sale.id, sale.paid);
    setLoading(false);
  };

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
              Publisher Revenue
            </label>
            <p className="text-lg font-semibold mt-1 text-green-600">
              ${new Decimal(sale.publisherRevenue).toFixed(2)}
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
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  sale.paid
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {sale.paid ? "Paid" : "Pending"}
              </span>
              <button
                onClick={handleTogglePaid}
                disabled={loading}
                className="text-sm text-blue-600 hover:underline"
              >
                Toggle
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
              let revenue = formData.publisherRevenue;
              if (formData.source === "HAND_SOLD" && book) {
                const autoRev = calcHandSoldRevenue(book, formData.quantity);
                if (autoRev != null) {
                  revenue = normalizeCurrency(autoRev);
                  setDisplayRevenue(revenue.toFixed(2));
                }
              }
              const rate = book
                ? getRateForSource(book, formData.source)
                : null;
              const newRoyalty =
                rate != null ? revenue * (rate / 100) : formData.authorRoyalty;
              setDisplayRoyalty(newRoyalty.toFixed(2));
              setFormData({
                ...formData,
                bookId: Number(bookId),
                publisherRevenue: revenue,
                authorRoyalty: normalizeCurrency(newRoyalty),
              });
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
              if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: "" }));

              const qtyValidation = validateQuantity(val);
              if (qtyValidation.success) {
                const qty = qtyValidation.data;
                setFormData((prev) => {
                  const next = { ...prev, quantity: qty };
                  const book = books.find((b) => b.id === prev.bookId);

                  if (prev.source === "HAND_SOLD" && book) {
                    const autoRev = calcHandSoldRevenue(book, qty) ?? 0;
                    next.publisherRevenue = normalizeCurrency(autoRev);
                    setDisplayRevenue(next.publisherRevenue.toFixed(2));
                    const rate = getRateForSource(book, "HAND_SOLD");
                    next.authorRoyalty = normalizeCurrency(next.publisherRevenue * (rate / 100));
                    setDisplayRoyalty(next.authorRoyalty.toFixed(2));
                  } else {
                    const rate = book ? getRateForSource(book, "DISTRIBUTOR") : 0;
                    const newRoyalty = prev.publisherRevenue * (rate / 100);
                    next.authorRoyalty = normalizeCurrency(newRoyalty);
                    setDisplayRoyalty(next.authorRoyalty.toFixed(2));
                  }
                  return next;
                });
              }
            }}
          />
          {errors.quantity && (
            <p className="mt-1 text-xs text-red-500 font-medium">{errors.quantity}</p>
          )}
        </div>

        {/* Publisher Revenue */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Publisher Revenue ($)
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={displayRevenue}
            readOnly={formData.source === "HAND_SOLD"}
            className={cn(
              "w-full px-3 py-2 border rounded-md transition-colors",
              errors.publisherRevenue ? "border-red-500" : "border-gray-300",
              formData.source === "HAND_SOLD" &&
                "bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
            )}
            tabIndex={formData.source === "HAND_SOLD" ? -1 : undefined}
            onChange={(e) => {
              if (formData.source === "HAND_SOLD") return;
              const val = e.target.value;
              setDisplayRevenue(val);
              if (errors.publisherRevenue) setErrors((prev) => ({ ...prev, publisherRevenue: "" }));

              const revenueValidation = validateCurrency(val);
              if (revenueValidation.success) {
                const numericRevenue = revenueValidation.data;
                const book = books.find((b) => b.id === Number(formData.bookId));
                const rate = book ? getRateForSource(book, formData.source) : 0;
                const newRoyalty = normalizeCurrency(numericRevenue * (rate / 100));

                setDisplayRoyalty(newRoyalty.toFixed(2));
                setFormData((prev) => ({
                  ...prev,
                  publisherRevenue: numericRevenue,
                  authorRoyalty: newRoyalty,
                }));
              }
            }}
            onBlur={() => {
              if (formData.source === "HAND_SOLD" || displayRevenue === "") return;
              const revenueValidation = validateCurrency(displayRevenue);
              if (revenueValidation.success) {
                setDisplayRevenue(revenueValidation.data.toFixed(2));
              }
            }}
          />
          {errors.publisherRevenue && (
            <p className="mt-1 text-xs text-red-500 font-medium">
              {errors.publisherRevenue}
            </p>
          )}
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
            <p className="mt-1 text-xs text-red-500 font-medium">{errors.authorRoyalty}</p>
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