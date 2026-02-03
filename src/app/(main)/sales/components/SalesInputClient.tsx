"use client";

import { useState } from "react";
import { PendingSaleItem } from "@/lib/data/records";
import { BookListItem } from "@/lib/data/books";
import PendingRecordsTable from "./PendingRecordsTable";
import InputRecordForm from "./InputRecordForm";
import BulkPasteSalesPanel from "./BulkPasteSalesPanel";
import { addSale } from "../action";

interface SalesInputClientProps {
  booksData: BookListItem[];
  /** When set (e.g. from /sales/add-record?bookId=123), the single-record form opens with this book pre-selected. */
  initialBookId?: number;
}

export default function SalesInputClient({
  booksData,
  initialBookId,
}: SalesInputClientProps) {
  const [pendingRecords, setPendingRecords] = useState<PendingSaleItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleAddRecord = (record: PendingSaleItem) => {
    setPendingRecords((prev) => [...prev, record]);
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (pendingRecords.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);

    let failed = 0;
    for (const record of pendingRecords) {
      const result = await addSale({
        bookId: record.bookId,
        date: record.date,
        quantity: record.quantity,
        publisherRevenue: record.publisherRevenue,
        authorRoyalty: record.authorRoyalty,
        royaltyOverridden: record.royaltyOverridden,
        paid: record.paid,
      });
      if (!result.success) failed += 1;
    }

    setIsSubmitting(false);

    if (failed === 0) {
      setPendingRecords([]);
      // optional: set a short-lived "Saved!" message
    } else {
      setSubmitError(`Failed to save ${failed} of ${pendingRecords.length} record(s).`);
    }
  };

  const handleClearAll = () => {
    setPendingRecords([]);
    setSubmitError(null);
  };

  const handleRemove = (row: PendingSaleItem) => {
    setPendingRecords((prev) => {
      const index = prev.findIndex(
        (r) =>
          r.bookId === row.bookId &&
          r.date === row.date &&
          r.quantity === row.quantity &&
          r.publisherRevenue === row.publisherRevenue,
      );
      return index !== -1 ? prev.filter((_, i) => i !== index) : prev;
    });
  };

  return (
    <>
      <BulkPasteSalesPanel
        onAddRecord={handleAddRecord}
        booksData={booksData}
      />
      <InputRecordForm
        onAddRecord={handleAddRecord}
        booksData={booksData}
        initialBookId={initialBookId}
      />
      <PendingRecordsTable
        pendingRecords={pendingRecords}
        onRemove={handleRemove}
      />
      {submitError && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-2 text-sm">
          {submitError}
        </div>
      )}
      {pendingRecords.length > 0 && (
        <div className="flex justify-end gap-4 items-center">
          <button
            type="button"
            className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            onClick={handleClearAll}
            disabled={isSubmitting}
          >
            Clear All
          </button>
          <button
            type="button"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? `Saving...`
              : `Submit ${pendingRecords.length} Record${pendingRecords.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}
    </>
  );
}