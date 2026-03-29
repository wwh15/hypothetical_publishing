"use client";

import { useEffect, useRef, useState } from "react";
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
import type { SaleFormat } from "@prisma/client";

interface InputRecordFormProps {
  onAddRecord: (record: PendingSaleItem) => void;
  booksData: BookListItem[];
  initialBookId?: number;
  usdRatesInitial?: Record<string, number> | null;
}

const FORMAT_LABELS: Record<SaleFormat, string> = {
  PRINT: "Print",
  EBOOK: "Ebook",
  KINDLE_UNLIMITED: "Kindle Unlimited",
};

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
  usdRatesInitial,
}: InputRecordFormProps) {
  const [books] = useState<BookListItem[]>(booksData);
  const {
    formData,
    formErrors,
    handleInputChange,
    handleBlur,
    handleSubmit,
    allowedFormats,
    lastAddedAt,
  } = useSalesForm(books, onAddRecord, initialBookId, usdRatesInitial);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const kenpInputRef = useRef<HTMLInputElement>(null);

  const isKu = formData.format === "KINDLE_UNLIMITED";
  const isDistributor = formData.source === "DISTRIBUTOR";

  useEffect(() => {
    if (!lastAddedAt) return;
    if (isKu) {
      kenpInputRef.current?.focus();
      return;
    }
    quantityInputRef.current?.focus();
  }, [isKu, lastAddedAt]);

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
          Optimized for fast entry: search by title, ISBN-13/10, or Amazon ASIN
          (dashes ignored). Defaults: distributor source, Other distributor,
          print format, USD.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FormField label="Sale Period" required error={formErrors.date}>
          <MonthYearSelector
            className="w-full justify-start text-left"
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

        <FormField label="Sale source" required>
          <select
            value={formData.source}
            onChange={(e) =>
              handleInputChange(
                "source",
                e.target.value as "DISTRIBUTOR" | "HAND_SOLD"
              )
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="DISTRIBUTOR">Distributor</option>
            <option value="HAND_SOLD">Hand sold</option>
          </select>
        </FormField>

        {isDistributor && (
          <FormField label="Distributor" required>
            <select
              value={formData.distributor}
              onChange={(e) =>
                handleInputChange("distributor", e.target.value)
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="OTHER">Other</option>
              <option value="AMAZON">Amazon</option>
              <option value="INGRAM_SPARK">Ingram Spark</option>
            </select>
          </FormField>
        )}

        <FormField label="Format" required>
          <select
            value={formData.format}
            onChange={(e) =>
              handleInputChange("format", e.target.value as SaleFormat)
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {allowedFormats.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABELS[f]}
              </option>
            ))}
          </select>
          {isKu && (
            <p className="text-xs text-muted-foreground mt-1">
              Kindle Unlimited uses KENP instead of units sold. Distributor is
              set to Amazon.
            </p>
          )}
        </FormField>

        {isKu ? (
          <FormField label="KENP" required error={formErrors.kenp}>
            <Input
              ref={kenpInputRef}
              type="text"
              inputMode="numeric"
              value={formData.kenp}
              onChange={(e) => handleInputChange("kenp", e.target.value)}
              placeholder="e.g. 2400"
            />
          </FormField>
        ) : (
          <FormField label="Quantity sold" required error={formErrors.quantity}>
            <Input
              ref={quantityInputRef}
              type="text"
              inputMode="numeric"
              value={formData.quantity}
              onChange={(e) => handleInputChange("quantity", e.target.value)}
              placeholder="0"
            />
          </FormField>
        )}

        <FormField label="Currency" required>
          <select
            value={isDistributor ? formData.currency : "USD"}
            disabled={!isDistributor}
            onChange={(e) => handleInputChange("currency", e.target.value)}
            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
              !isDistributor ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {SUPPORTED_CURRENCIES.map((curr) => (
              <option key={curr.code} value={curr.code}>
                {curr.code} - {curr.name} ({curr.symbol})
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label={`Publisher revenue (${formData.currency})`}
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
            readOnly={!isDistributor}
            className={
              !isDistributor ? "bg-muted cursor-not-allowed" : ""
            }
          />
          {!isDistributor && (
            <p className="text-xs text-muted-foreground mt-1">
              Hand sold: computed as (cover price − print cost) × quantity in USD
              (definition 9).
            </p>
          )}
        </FormField>

        <FormField label="Publisher revenue (USD)">
          <Input
            type="text"
            value={formData.publisherRevenueUSD}
            placeholder="0.00"
            readOnly
            className="bg-muted cursor-default font-medium"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {isDistributor
              ? `Converted from ${formData.currency} using current rates (req. 3.7).`
              : "Same as original for hand sold (USD)."}
          </p>
        </FormField>

        <FormField label="Author royalty (USD)" required>
          <Input
            type="text"
            value={formData.authorRoyalty}
            placeholder="0.00"
            readOnly
            className="bg-muted cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Rate × publisher revenue (USD); not editable. Author-paid defaults to
            false when you add the row.
          </p>
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
          <Plus className="mr-2 h-4 w-4" /> Add record
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        After adding, period/book/source/distributor/format stay selected for the next row.
      </p>
    </form>
  );
}
