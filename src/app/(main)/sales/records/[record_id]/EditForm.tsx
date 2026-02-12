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

interface EditFormProps {
  books: BookListItem[];
  sale: SaleDetailPayload;
}

const SALES_YEAR_MIN = 2000;
const SALES_YEAR_MAX = 2100;

function initialDateMonth(date: Date): string {
  if (!date || !Number.isFinite(date.getTime())) return "";
  return String(date.getMonth() + 1).padStart(2, "0");
}

function initialDateYear(date: Date): string {
  if (!date || !Number.isFinite(date.getTime())) return "";
  return String(date.getFullYear());
}

export default function EditForm({ sale, books }: EditFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    bookId: sale.bookId,
    dateMonth: initialDateMonth(sale.date),
    dateYear: initialDateYear(sale.date),
    quantity: sale.quantity,
    publisherRevenue: sale.publisherRevenue,
    authorRoyalty: sale.authorRoyalty,
    royaltyOverridden: sale.royaltyOverridden,
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  const handleSave = async () => {
    setDateError(null);
    const year = formData.dateYear ? parseInt(formData.dateYear, 10) : NaN;
    if (
      !Number.isInteger(year) ||
      year < SALES_YEAR_MIN ||
      year > SALES_YEAR_MAX
    ) {
      setDateError(`Year must be between ${SALES_YEAR_MIN} and ${SALES_YEAR_MAX}`);
      return;
    }
    if (!formData.dateMonth) {
      setDateError("Please select a month");
      return;
    }
    const month = parseInt(formData.dateMonth, 10);
    if (month < 1 || month > 12) {
      setDateError("Please select a valid month");
      return;
    }
    const date = new Date(year, month - 1, 1);
    setLoading(true);
    const result = await updateSale(sale.id, {
      bookId: formData.bookId,
      date,
      quantity: formData.quantity,
      publisherRevenue: formData.publisherRevenue,
      authorRoyalty: formData.authorRoyalty,
      royaltyOverridden: formData.royaltyOverridden,
    });
    setLoading(false);

    if (result.success) {
      setIsEditing(false);
    } else {
      alert(result.error);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    await deleteSale(sale.id);
    // Redirects automatically in the action
  };

  const handleTogglePaid = async () => {
    setLoading(true);
    await togglePaidStatus(sale.id, sale.paid);
    setLoading(false);
  };

  function normalizeAuthorRoyalty(value: number): number {
    return (Math.round(value * 100) / 100);
  }

  if (!isEditing) {
    // View Mode
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Display fields */}
          <div>
            <label className="text-sm font-medium text-gray-500">
              Book Title
            </label>
            <p className="text-lg font-semibold mt-1">
              <Link
                href={`/books/${sale.bookId}`}
                onClick={(e) => e.stopPropagation()}
                className="text-blue-600 hover:underline focus:outline focus:underline"
              >
                {sale.book.title}
              </Link>
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Author</label>
            <p className="text-lg font-semibold mt-1">
              {sale.book.authors.length > 0
                ? sale.book.authors.map((a) => a.name).join(", ")
                : "-"}
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
              ${sale.publisherRevenue.toFixed(2)}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">
              Author Royalty
            </label>
            <p className="text-lg font-semibold mt-1 text-blue-600">
              ${sale.authorRoyalty.toFixed(2)}
              {sale.royaltyOverridden && (
                <span className="ml-2 text-xs text-orange-600">(Override)</span>
              )}
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
        </div>

        {/* Action Buttons */}
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

        {/* Delete Confirmation */}
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

  // Edit Mode
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
              const rate = book?.defaultRoyaltyRate;
              const newRoyalty =
                rate != null
                  ? formData.publisherRevenue * (rate / 100)
                  : formData.authorRoyalty;
              setFormData({
                ...formData,
                bookId: Number(bookId),
                authorRoyalty: newRoyalty,
              });
            }}
          />
        </div>

        {/* Date: month/year picker (same pattern as book edit form) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium mb-2">
            Period (month / year)
          </label>
          <div className="flex gap-3 items-center flex-wrap">
            <select
              value={formData.dateMonth}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  dateMonth: e.target.value,
                });
                setDateError(null);
              }}
              className="flex-1 min-w-[140px] h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-gray-700"
            >
              <option value="">Select Month</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m.toString().padStart(2, "0")}>
                  {new Date(2000, m - 1).toLocaleString("default", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={SALES_YEAR_MIN}
              max={SALES_YEAR_MAX}
              value={formData.dateYear}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  dateYear: e.target.value,
                });
                setDateError(null);
              }}
              placeholder="Year"
              className="w-24 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-gray-700"
            />
          </div>
          {dateError && (
            <p className="text-sm text-red-600 dark:text-red-400">{dateError}</p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Quantity Sold
          </label>
          <input
            type="number"
            min={0}
            value={Number.isFinite(formData.quantity) ? formData.quantity : ""}
            onChange={(e) => {
              const raw = parseInt(e.target.value, 10);
              const q = Number.isFinite(raw) ? Math.max(0, raw) : 0;
              setFormData({ ...formData, quantity: q });
            }}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        {/* Publisher Revenue */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Publisher Revenue ($)
          </label>
          <input
            type="number"
            step="0.01"
            min={0}
            value={
              Number.isFinite(formData.publisherRevenue)
                ? formData.publisherRevenue
                : ""
            }
            onChange={(e) => {
              const raw = parseFloat(e.target.value);
              const revenue = Number.isFinite(raw) ? Math.max(0, raw) : 0;
              const book = books.find((b) => b.id === Number(formData.bookId));
              const rate = book?.defaultRoyaltyRate;
              const newRoyalty =
                rate != null ? revenue * (rate / 100) : formData.authorRoyalty;
              const authorRoyalty = Number.isFinite(newRoyalty)
                ? Math.max(0, newRoyalty)
                : formData.authorRoyalty;
              setFormData({
                ...formData,
                publisherRevenue: revenue,
                authorRoyalty: normalizeAuthorRoyalty(authorRoyalty),
                royaltyOverridden: false,
              });
            }}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        {/* Author Royalty */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Author Royalty ($)
          </label>
          <input
            type="number"
            step="0.01"
            min={0}
            value={
              Number.isFinite(formData.authorRoyalty)
                ? formData.authorRoyalty
                : ""
            }
            onChange={(e) => {
              const raw = parseFloat(e.target.value);
              if (Number.isFinite(raw)) {
                setFormData({
                  ...formData,
                  authorRoyalty: Math.max(0, raw),
                  royaltyOverridden: true,
                });
              } else {
                // Cleared or invalid: revert to computed from book rate
                const book = books.find(
                  (b) => b.id === Number(formData.bookId)
                );
                const rate = book?.defaultRoyaltyRate;
                const computed =
                  rate != null
                    ? formData.publisherRevenue * (rate / 100)
                    : formData.authorRoyalty;
                setFormData({
                  ...formData,
                  authorRoyalty: Number.isFinite(computed) ? normalizeAuthorRoyalty(computed) : 0,
                  royaltyOverridden: false,
                });
              }
            }}
            className="w-full px-3 py-2 border rounded-md"
          />
          {formData.royaltyOverridden && (
            <p className="mt-2 text-sm text-orange-600">(Overridden)</p>
          )}
        </div>
      </div>

      {/* Save/Cancel Buttons */}
      <div className="flex gap-4 mt-8 pt-6 border-t">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
        <button
          onClick={() => setIsEditing(false)}
          className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
