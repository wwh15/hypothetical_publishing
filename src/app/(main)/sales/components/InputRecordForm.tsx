"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PendingSaleItem } from "@/lib/data/records";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSalesForm } from "../hooks/useSalesForm";
import { BookSelectBox } from "@/components/BookSelectBox";

interface Book {
  id: number;
  title: string;
  author: { name: string };
  authorRoyaltyRate: number;
  isbn13?: string | null;
  isbn10?: string | null;
}

interface InputRecordFormProps {
  onAddRecord: (record: PendingSaleItem) => void;
}

// Mock books data - replace with real API call when books API is ready
const MOCK_BOOKS: Book[] = [
  // Books with single author
  {
    id: 1,
    title: "The Test Novel",
    author: { name: "Alice Johnson" },
    authorRoyaltyRate: 0.25,
    isbn13: "9781234567890",
    isbn10: "1234567890",
  },
  {
    id: 2,
    title: "Sample Story",
    author: { name: "Bob Smith" },
    authorRoyaltyRate: 0.25,
    isbn13: "9780987654321",
    isbn10: "0987654321",
  },
  {
    id: 3,
    title: "Example Book",
    author: { name: "Carol Williams" },
    authorRoyaltyRate: 0.25,
    isbn13: "9781122334455",
    isbn10: "1122334455",
  },
  {
    id: 4,
    title: "Demo Fiction",
    author: { name: "David Brown" },
    authorRoyaltyRate: 0.25,
    isbn13: "9785566778899",
    isbn10: "5566778899",
  },
  {
    id: 5,
    title: "Test Data Chronicles",
    author: { name: "Emma Davis" },
    authorRoyaltyRate: 0.25,
    isbn13: "9786677889900",
    isbn10: "6677889900",
  },
  // Books with multiple authors
  {
    id: 6,
    title: "Collaborative Work",
    author: { name: "Alice Johnson, Bob Smith" },
    authorRoyaltyRate: 0.25,
    isbn13: "9782233445566",
    isbn10: "2233445566",
  },
  {
    id: 7,
    title: "Joint Publication",
    author: { name: "David Brown, Carol Williams" },
    authorRoyaltyRate: 0.25,
    isbn13: "9783344556677",
    isbn10: "3344556677",
  },
  {
    id: 8,
    title: "Multi-Author Project",
    author: { name: "Bob Smith, Alice Johnson, Carol Williams" },
    authorRoyaltyRate: 0.25,
    isbn13: "9784455667788",
    isbn10: "4455667788",
  },
  {
    id: 9,
    title: "Team Effort",
    author: { name: "Emma Davis, David Brown" },
    authorRoyaltyRate: 0.25,
    isbn13: "9787788990011",
    isbn10: "7788990011",
  },
  {
    id: 10,
    title: "Group Collaboration",
    author: { name: "Carol Williams, Emma Davis, Bob Smith" },
    authorRoyaltyRate: 0.25,
    isbn13: "9788899001122",
    isbn10: "8899001122",
  },
];

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

export default function InputRecordForm({ onAddRecord }: InputRecordFormProps) {
  const [books] = useState<Book[]>(MOCK_BOOKS);
  const {
    formData,
    handleInputChange,
    handleRoyaltyChange,
    handleSubmit,
    revertRoyalty,
  } = useSalesForm(books, onAddRecord);

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
          />
        </FormField>

        {/* Author Royalty */}
        <FormField label="Author Royalty ($)" required htmlFor="authorRoyalty">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {formData.royaltyOverridden && (
                <span className="text-xs text-orange-600 font-normal">
                  (Overridden)
                </span>
              )}
            </div>
            <Input
              type="number"
              id="authorRoyalty"
              value={formData.authorRoyalty}
              onChange={(e) => handleRoyaltyChange(e.target.value)}
              min="0.00"
              step="0.01"
              className={
                formData.royaltyOverridden
                  ? "border-orange-500 dark:border-orange-600"
                  : ""
              }
              required
            />
            {formData.royaltyOverridden && (
              <button
                type="button"
                onClick={revertRoyalty}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                Revert to calculated value
              </button>
            )}
          </div>
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
