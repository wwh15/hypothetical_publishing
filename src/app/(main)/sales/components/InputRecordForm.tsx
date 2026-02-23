"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PendingSaleItem } from "@/lib/data/records";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useSalesForm } from "../hooks/useSalesForm";
import { BookSelectBox } from "@/components/BookSelectBox";
import { BookListItem } from "@/lib/data/books";

interface InputRecordFormProps {
  onAddRecord: (record: PendingSaleItem) => void;
  booksData: BookListItem[];
  /** Pre-select this book in the form (e.g. when navigating from a book details page). */
  initialBookId?: number;
}

// Simple FormField wrapper component
function FormField({
  label,
  required,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function InputRecordForm({
  onAddRecord,
  booksData,
  initialBookId,
}: InputRecordFormProps) {
  const [books] = useState<BookListItem[]>(booksData);
  const {
    formData,
    handleInputChange,
    handleSubmit,
  } = useSalesForm(books, onAddRecord, initialBookId);

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
    >
      <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold tracking-tight">
          Add single sales record
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select the details for a sales record to add to the pending table.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Month */}
        <FormField label="Month" required htmlFor="month">
          <select
            id="month"
            value={formData.month}
            onChange={(e) => handleInputChange("month", e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700"
            required
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
        </FormField>

        {/* Year */}
        <FormField label="Year" required htmlFor="year">
          <Input
            type="number"
            id="year"
            value={formData.year}
            onChange={(e) => handleInputChange("year", e.target.value)}
            min="2000"
            max="2100"
            required
          />
        </FormField>

        {/* Book */}
        <FormField label="Book" required htmlFor="book">
          <BookSelectBox
            books={books}
            selectedBookId={formData.bookId}
            onSelect={(bookId) => handleInputChange("bookId", bookId)}
          />
        </FormField>

        {/* Source */}
        <FormField label="Source" required htmlFor="source">
          <select
            id="source"
            value={formData.source}
            onChange={(e) => handleInputChange("source", e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700"
          >
            <option value="DISTRIBUTOR">Distributor</option>
            <option value="HAND_SOLD">Hand Sold</option>
          </select>
        </FormField>

        {/* Quantity */}
        <FormField label="Quantity" required htmlFor="quantity">
          <Input
            type="number"
            id="quantity"
            value={formData.quantity}
            onChange={(e) => handleInputChange("quantity", e.target.value)}
            min="1"
            step="1"
            required
          />
        </FormField>

        {/* Publisher Revenue */}
        <FormField
          label="Publisher Revenue ($)"
          required
          htmlFor="publisherRevenue"
        >
          <Input
            type="number"
            id="publisherRevenue"
            value={formData.publisherRevenue}
            onChange={(e) =>
              handleInputChange("publisherRevenue", e.target.value)
            }
            min="0.00"
            step="0.01"
            required
            readOnly={formData.source === "HAND_SOLD"}
            className={formData.source === "HAND_SOLD" ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" : ""}
            tabIndex={formData.source === "HAND_SOLD" ? -1 : undefined}
          />
        </FormField>

        {/* Author Royalty */}
        <FormField label="Author Royalty ($)" required htmlFor="authorRoyalty">
          <Input
            type="number"
            id="authorRoyalty"
            value={formData.authorRoyalty}
            readOnly
            className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
            tabIndex={-1}
          />
        </FormField>

        {/* Comment (optional) */}
        <FormField label="Comment" htmlFor="comment">
          <Textarea
            id="comment"
            value={formData.comment}
            onChange={(e) => handleInputChange("comment", e.target.value)}
            placeholder="Optional note (max 256 characters)"
            maxLength={256}
            rows={2}
            className="resize-none"
          />
        </FormField>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" variant="default" size="default">
          <Plus className="h-4 w-4" />
          Add Record
        </Button>
      </div>
    </form>
  );
}
