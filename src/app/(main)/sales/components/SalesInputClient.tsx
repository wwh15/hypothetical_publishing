"use client";

import { useCallback, useRef, useState } from "react";
import { PendingSaleItem } from "@/lib/data/records";
import { BookListItem } from "@/lib/data/books";
import PendingRecordsTable from "./PendingRecordsTable";
import InputRecordForm from "./InputRecordForm";
import BulkPasteSalesPanel from "./BulkPasteSalesPanel";
import AmazonXlsxImportPanel from "./AmazonXlsxImportPanel";
import { addSalesBulk } from "../action";
import BackerkitXlsxImport from "./BackerkitXlsxImport";
import { Button } from "@/components/ui/button";

interface SalesInputClientProps {
  booksData: BookListItem[];
  /** When set (e.g. from /sales/add-record?bookId=123), the single-record form opens with this book pre-selected. */
  initialBookId?: number;
  /** Preloaded USD base rates for instant FX in the single-record form (from server). */
  usdRatesInitial?: Record<string, number> | null;
}

export default function SalesInputClient({
  booksData,
  initialBookId,
  usdRatesInitial,
}: SalesInputClientProps) {
  const pendingRecordsSectionRef = useRef<HTMLElement>(null);
  const scrollToPendingRecords = useCallback(() => {
    pendingRecordsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const [pendingRecords, setPendingRecords] = useState<PendingSaleItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const handleAddRecord = (record: PendingSaleItem) => {
    setPendingRecords((prev) => [...prev, record]);
    setSubmitError(null);
  };

  const handleAddRecords = (records: PendingSaleItem[]) => {
    setPendingRecords((prev) => [...prev, ...records]);
    setSubmitError(null);
  };

  
  const handleSubmit = async () => {
    setShowSaveConfirm(false);
    if (pendingRecords.length === 0) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
  
    // Capture the result from your server action
    const result = await addSalesBulk(pendingRecords);
  
    setIsSubmitting(false);
  
    // Check the response object instead of a 'failed' counter
    if (result.success) {
      setPendingRecords([]);
      // Success! The "Pending" table is now cleared.
    } else {
      // Display the error returned by the server
      setSubmitError(
        result.error || "Failed to save records. Please check your connection."
      );
    }
  };

  const handleClearAll = () => {
    setPendingRecords([]);
    setSubmitError(null);
  };

  const handleRemove = (row: PendingSaleItem) => {
    setPendingRecords((prev) => prev.filter((r) => r.id !== row.id));
  };

  const handleTogglePaid = (row: PendingSaleItem) => {
    setPendingRecords((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, paid: !r.paid } : r)),
    );
  };

  return (
    <>
      <BulkPasteSalesPanel
        onAddRecord={handleAddRecord}
        booksData={booksData}
      />
      <AmazonXlsxImportPanel
        onAddRecord={handleAddRecord}
        booksData={booksData}
      />
      <BackerkitXlsxImport
        onAddRecords={handleAddRecords}
        booksData={booksData}
        onViewPendingRecords={scrollToPendingRecords}
      />
      <InputRecordForm
        onAddRecord={handleAddRecord}
        booksData={booksData}
        initialBookId={initialBookId}
        usdRatesInitial={usdRatesInitial}
      />
      <section
        ref={pendingRecordsSectionRef}
        id="pending-sales-records"
        aria-label="Pending sales records"
        className="scroll-mt-6"
      >
        <PendingRecordsTable
          pendingRecords={pendingRecords}
          onRemove={handleRemove}
          onTogglePaid={handleTogglePaid}
        />
      </section>
      {submitError && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-2 text-sm">
          {submitError}
        </div>
      )}
      {pendingRecords.length > 0 && (
        <div className="flex justify-end gap-4 items-center">

          {/* Clear all button */}
          <button
            type="button"
            className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            onClick={handleClearAll}
            disabled={isSubmitting}
          >
            Clear All
          </button>

          {/* Save button */}
          <button
            type="button"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            onClick={() => setShowSaveConfirm(true)}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : `Submit ${pendingRecords.length} Record${pendingRecords.length !== 1 ? "s" : ""}`}
          </button>

          {/* Save confirmation */}
          {showSaveConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md">
                <h3 className="text-lg font-bold mb-4">Confirm Save</h3>
                <p className="mb-6">
                  Are you sure you want to save {pendingRecords.length} sale
                  record{pendingRecords.length !== 1 ? "s" : ""}?
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setShowSaveConfirm(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
