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

export default function EditForm({ sale, books }: EditFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    bookId: sale.bookId,
    date: sale.date,
    quantity: sale.quantity,
    publisherRevenue: sale.publisherRevenue,
    authorRoyalty: sale.authorRoyalty,
    royaltyOverridden: sale.royaltyOverridden,
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const result = await updateSale(sale.id, formData);
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
            <p className="text-lg font-semibold mt-1">{sale.date}</p>
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

        {/* Date */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Period (MM-YYYY)
          </label>
          <input
            type="text"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            placeholder="01-2025"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Quantity Sold
          </label>
          <input
            type="number"
            min={0}
            value={
              Number.isFinite(formData.quantity) ? formData.quantity : ""
            }
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
                authorRoyalty,
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
              const royalty = Number.isFinite(raw) ? Math.max(0, raw) : 0;
              setFormData({
                ...formData,
                authorRoyalty: royalty,
                royaltyOverridden: true,
              });
            }}
            className="w-full px-3 py-2 border rounded-md"
          />
          <label className="flex items-center mt-2 text-sm">
            <input
              type="checkbox"
              checked={formData.royaltyOverridden}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  royaltyOverridden: e.target.checked,
                })
              }
              className="mr-2"
            />
            Mark as overridden
          </label>
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
