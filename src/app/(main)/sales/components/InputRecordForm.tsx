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
import MonthYearSelector from "@/components/MonthYearSelector";
import { SUPPORTED_CURRENCIES } from "@/lib/currency-conversion";

interface InputRecordFormProps {
  onAddRecord: (record: PendingSaleItem) => void;
  booksData: BookListItem[];
  initialBookId?: number;
}

function FormField({
  label,
  required,
  htmlFor,
  children,
  error,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-sm font-medium leading-none">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

export default function InputRecordForm({
  onAddRecord,
  booksData,
  initialBookId,
}: InputRecordFormProps) {
  const [books] = useState<BookListItem[]>(booksData);
  const { formData, formErrors, handleInputChange, handleBlur, handleSubmit } =
    useSalesForm(books, onAddRecord, initialBookId);

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-6"
    >
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold tracking-tight">
          Add single sales record
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in details for a manual sale.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Month & Year Selection */}
        <FormField label="Sale Period" required error={formErrors.date}>
          <MonthYearSelector
            className="w-full justify-start text-left" // Forces the trigger to fill the column width
            value={
              formData.year && formData.month
                ? `${formData.year}-${formData.month}`
                : null
            }
            onChange={(val) => {
              if (val) {
                const [y, m] = val.split("-");
                handleInputChange("date", { year: y, month: m });
              }
            }}
          />
        </FormField>

        <FormField label="Book" required error={formErrors.bookId}>
          <BookSelectBox
            books={books}
            selectedBookId={formData.bookId}
            onSelect={(bookId) => handleInputChange("bookId", bookId)}
          />
        </FormField>

        <FormField label="Quantity" required error={formErrors.quantity}>
          <Input
            type="text"
            value={formData.quantity}
            onChange={(e) => handleInputChange("quantity", e.target.value)}
            placeholder="0"
          />
        </FormField>

        <FormField label="Currency" required>
          <select
            /* Requirement 3.4.1: Force USD for Hand Sold */
            value={formData.source === "HAND_SOLD" ? "USD" : formData.currency}
            disabled={formData.source === "HAND_SOLD"}
            onChange={(e) => handleInputChange("currency", e.target.value)}
            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
              formData.source === "HAND_SOLD"
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {SUPPORTED_CURRENCIES.map((curr) => (
              <option key={curr.code} value={curr.code}>
                {curr.code} - {curr.name} ({curr.symbol})
              </option>
            ))}
          </select>
        </FormField>

        {/* Original Revenue Input */}
        <FormField
          label={`Publisher Revenue (${formData.currency})`}
          required
          error={formErrors.publisherRevenue}
        >
          <Input
            type="text"
            value={formData.publisherRevenueOriginal}
            placeholder="0.00"
            onChange={(e) =>
              handleInputChange("publisherRevenueOriginal", e.target.value)
            }
            onBlur={() => handleBlur("publisherRevenueOriginal")}
            readOnly={formData.source === "HAND_SOLD"}
            className={
              formData.source === "HAND_SOLD"
                ? "bg-muted cursor-not-allowed"
                : ""
            }
          />
        </FormField>

        {/* Converted USD Display (Non-Modifiable) */}
        <FormField label="Publisher Revenue (USD Equivalent)">
          <Input
            type="text"
            value={formData.publisherRevenueUSD}
            placeholder="0.00"
            /* Always read-only as it's a derived/converted value */
            readOnly
            className="bg-muted cursor-default font-medium"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formData.source === "HAND_SOLD"
              ? "Calculated automatically from book costs."
              : `Converted from ${formData.currency} to USD using current exchange rates.`}
          </p>
        </FormField>

        <FormField
          label="Author Royalty ($)"
          required
          error={formErrors.authorRoyalty}
        >
          <Input
            type="text"
            value={formData.authorRoyalty}
            placeholder="0.00"
            readOnly
            className="bg-muted cursor-not-allowed"
          />
        </FormField>

        <FormField label="Source" required>
          <select
            value={formData.source}
            onChange={(e) => handleInputChange("source", e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="DISTRIBUTOR">Distributor</option>
            <option value="HAND_SOLD">Hand Sold</option>
          </select>
        </FormField>

        <div className="lg:col-span-2">
          <FormField label="Comment">
            <Textarea
              value={formData.comment}
              onChange={(e) => handleInputChange("comment", e.target.value)}
              placeholder="Optional note"
              maxLength={256}
              className="resize-none"
            />
          </FormField>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit">
          <Plus className="mr-2 h-4 w-4" /> Add Record
        </Button>
      </div>
    </form>
  );
}
