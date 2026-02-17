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
  validateDatePeriod, 
  validatePositiveNumber, 
  validateRoyaltyLimit
} from "@/lib/validation";
import { cn } from "@/lib/utils"; // Assuming you have a cn utility for Tailwind classes

interface EditFormProps {
  books: BookListItem[];
  sale: SaleDetailPayload;
}

const SALES_YEAR_MIN = 1000;
const SALES_YEAR_MAX = new Date().getFullYear();

function initialDateMonth(date: Date): string {
  if (!date || !Number.isFinite(date.getTime()) || date.getFullYear() < SALES_YEAR_MIN || date.getFullYear() > SALES_YEAR_MAX) {
    return "";
  }
  return String(date.getMonth() + 1).padStart(2, "0");
}

function initialDateYear(date: Date): string {
  const year = date?.getFullYear();
  if (!date || !Number.isFinite(date.getTime()) || year < SALES_YEAR_MIN || year > SALES_YEAR_MAX) {
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

    // 1. Run the base validations first
    const dateCheck = validateDatePeriod(formData.dateYear, formData.dateMonth);
    const revenueCheck = validatePositiveNumber(formData.publisherRevenue, "Publisher Revenue");
    const royaltyCheck = validatePositiveNumber(formData.authorRoyalty, "Author Royalty");
    const qtyCheck = validatePositiveNumber(formData.quantity, "Quantity");

    if (!dateCheck.success) {
      setDateError(dateCheck.error);
      return;
    }

    if (!revenueCheck.success || !royaltyCheck.success || !qtyCheck.success) {
      const newErrors: Record<string, string> = {};
      if (!revenueCheck.success) newErrors.publisherRevenue = revenueCheck.error;
      if (!royaltyCheck.success) newErrors.authorRoyalty = royaltyCheck.error;
      if (!qtyCheck.success) newErrors.quantity = qtyCheck.error;
      setErrors(newErrors);
      return;
    }

    // 2. Run ONLY if revenueCheck and royaltyCheck passed
    const limitCheck = validateRoyaltyLimit(royaltyCheck.data, revenueCheck.data);
    if (!limitCheck.success) {
      setErrors({ authorRoyalty: limitCheck.error });
      return;
    }

    setLoading(true);
    try {
      const result = await updateSale(sale.id, {
        bookId: formData.bookId,
        date: dateCheck.data,
        quantity: qtyCheck.data,
        publisherRevenue: revenueCheck.data,
        authorRoyalty: royaltyCheck.data,
        royaltyOverridden: formData.royaltyOverridden,
      });

      if (result.success) {
        setIsEditing(false);
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    await deleteSale(sale.id);
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
            <label className="text-sm font-medium text-gray-500">Book Title</label>
            <p className="text-lg font-semibold mt-1">
              <Link href={`/books/${sale.book.id}`} className="text-blue-600 hover:underline">
                {sale.book.title}
              </Link>
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Author</label>
            <p className="text-lg font-semibold mt-1">{sale.book.author.name}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Period</label>
            <p className="text-lg font-semibold mt-1">
              {new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(sale.date)}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Quantity</label>
            <p className="text-lg font-semibold mt-1">{sale.quantity} units</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Publisher Revenue</label>
            <p className="text-lg font-semibold mt-1 text-green-600">
              ${new Decimal(sale.publisherRevenue).toFixed(2)}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Author Royalty</label>
            <p className="text-lg font-semibold mt-1 text-blue-600">
              ${new Decimal(sale.authorRoyalty).toFixed(2)}
              {sale.royaltyOverridden && <span className="ml-2 text-xs text-orange-600">(Override)</span>}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Payment Status</label>
            <div className="mt-1 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${sale.paid ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                {sale.paid ? "Paid" : "Pending"}
              </span>
              <button onClick={handleTogglePaid} disabled={loading} className="text-sm text-blue-600 hover:underline">Toggle</button>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-8 pt-6 border-t">
          <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Edit Record</button>
          <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete Record</button>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md">
              <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
              <p className="mb-6">Are you sure you want to delete this sale record?</p>
              <div className="flex gap-4">
                <button onClick={handleDelete} disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">{loading ? "Deleting..." : "Delete"}</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const selectorValue = formData.dateYear && formData.dateMonth ? `${formData.dateYear}-${String(formData.dateMonth).padStart(2, "0")}` : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
      <h2 className="text-xl font-bold mb-4">Edit Sale Record</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Book Reference */}
        <div>
          <label className="block text-sm font-medium mb-2">Book Reference</label>
          <BookSelectBox
            books={books}
            selectedBookId={String(formData.bookId)}
            onSelect={(bookId) => {
              const book = books.find((b) => b.id === Number(bookId));
              const rate = book?.defaultRoyaltyRate;
              const newRoyalty = rate != null ? formData.publisherRevenue * (rate / 100) : formData.authorRoyalty;
              setFormData({ ...formData, bookId: Number(bookId), authorRoyalty: normalizeCurrency(newRoyalty) });
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
              if (!v) { setFormData({ ...formData, dateYear: "", dateMonth: "" }); return; }
              const [y, m] = v.split("-");
              setFormData({ ...formData, dateYear: y, dateMonth: m ? String(parseInt(m, 10)).padStart(2, "0") : "" });
            }}
            placeholder="Select month & year"
          />
          {dateError && <p className="mt-2 text-sm text-red-600">{dateError}</p>}
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium mb-2">Quantity Sold</label>
          <input
            type="text"
            inputMode="numeric" 
            placeholder="0"
            value={displayQuantity}
            className={cn("w-full px-3 py-2 border rounded-md transition-colors", errors.quantity ? "border-red-500" : "border-gray-300")}
            onChange={(e) => {
              const val = e.target.value;
              if (isValidQuantityInput(val)) {
                setDisplayQuantity(val);
                const numericQty = parseInt(val, 10) || 0;
                setFormData((prev) => ({ ...prev, quantity: Math.max(0, numericQty) }));
                if (errors.quantity) setErrors(prev => ({ ...prev, quantity: "" }));
              }
            }}
            onBlur={() => {
              const numericValue = parseInt(displayQuantity, 10) || 0;
              setDisplayQuantity(numericValue !== 0 ? String(numericValue) : "");
            }}
          />
          {errors.quantity && <p className="mt-1 text-xs text-red-500">{errors.quantity}</p>}
        </div>

        {/* Publisher Revenue */}
        <div>
          <label className="block text-sm font-medium mb-2">Publisher Revenue ($)</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={displayRevenue}
            className={cn("w-full px-3 py-2 border rounded-md transition-colors", errors.publisherRevenue ? "border-red-500" : "border-gray-300")}
            onChange={(e) => {
              const val = e.target.value;
              if (isValidCurrencyInput(val)) {
                setDisplayRevenue(val);
                const numericRevenue = parseFloat(val) || 0;
                const book = books.find((b) => b.id === Number(formData.bookId));
                const rate = book?.defaultRoyaltyRate;
                const newRoyalty = rate != null ? numericRevenue * (rate / 100) : formData.authorRoyalty;
                setDisplayRoyalty(newRoyalty.toFixed(2));
                setFormData({ ...formData, publisherRevenue: numericRevenue, authorRoyalty: normalizeCurrency(newRoyalty), royaltyOverridden: false });
                if (errors.publisherRevenue) setErrors(prev => ({ ...prev, publisherRevenue: "" }));
              }
            }}
            onBlur={() => {
              const numericValue = parseFloat(displayRevenue) || 0;
              setDisplayRevenue(numericValue !== 0 ? numericValue.toFixed(2) : "");
            }}
          />
          {errors.publisherRevenue && <p className="mt-1 text-xs text-red-500">{errors.publisherRevenue}</p>}
        </div>

        {/* Author Royalty */}
        <div>
          <label className="block text-sm font-medium mb-2">Author Royalty ($)</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={displayRoyalty}
            className={cn(
              "w-full px-3 py-2 border rounded-md transition-colors", 
              errors.authorRoyalty ? "border-red-500" : "border-gray-300",
              formData.royaltyOverridden && !errors.authorRoyalty && "border-orange-300 bg-orange-50/20"
            )}
            onChange={(e) => {
              const val = e.target.value;
              if (isValidCurrencyInput(val)) {
                setDisplayRoyalty(val);
                const book = books.find((b) => b.id === Number(formData.bookId));
                const rate = book?.defaultRoyaltyRate;
                const computedRoyalty = rate != null ? formData.publisherRevenue * (rate / 100) : null;
                const numericRoyalty = parseFloat(val) || 0;
                const isMismatched = computedRoyalty !== null && numericRoyalty.toFixed(2) !== computedRoyalty.toFixed(2);
                setFormData({ ...formData, authorRoyalty: normalizeCurrency(numericRoyalty), royaltyOverridden: isMismatched });
                if (errors.authorRoyalty) setErrors(prev => ({ ...prev, authorRoyalty: "" }));
              }
            }}
            onBlur={() => {
              const numericValue = parseFloat(displayRoyalty) || 0;
              setDisplayRoyalty(numericValue !== 0 ? numericValue.toFixed(2) : "");
            }}
          />
          {errors.authorRoyalty && <p className="mt-1 text-xs text-red-500">{errors.authorRoyalty}</p>}
          {errors.limit && <p className="mt-1 text-xs text-red-500">{errors.limit}</p>}
          {formData.royaltyOverridden && !errors.authorRoyalty && (
            <p className="mt-2 text-sm text-orange-600">(Overridden)</p>
          )}
        </div>
      </div>

      <div className="flex gap-4 mt-8 pt-6 border-t">
        <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
          {loading ? "Saving..." : "Save Changes"}
        </button>
        <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancel</button>
      </div>
    </div>
  );
}