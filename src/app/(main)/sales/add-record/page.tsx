"use client";

import { useState } from "react";
import { DataTable } from "@/components/DataTable";
import { ColumnDef } from "@/components/DataTable";
import { PendingSaleItem } from "@/lib/data/records";
import { X } from "lucide-react";
import PendingRecordsTable from "@/app/(main)/sales/components/PendingRecordsTable";
import InputRecordForm from "@/app/(main)/sales/components/InputRecordForm";
import BulkPasteSalesPanel from "../components/BulkPasteSalesPanel";

export default function SalesInputPage() {
  // Mock pending records for now - you'll replace this with actual state management
  const [pendingRecords, setPendingRecords] = useState<PendingSaleItem[]>([
    // Example data - remove when you implement the form
    {
      bookId: 1,
      title: "1984",
      author: "George Orwell",
      date: "01-2025",
      quantity: 150,
      publisherRevenue: 3750.0,
      authorRoyalty: 937.5,
      royaltyOverridden: true,
      paid: false,
    },
    {
      bookId: 2,
      title: "Animal Farm",
      author: "George Orwell",
      date: "01-2025",
      quantity: 200,
      publisherRevenue: 5000.0,
      authorRoyalty: 1250.0,
      royaltyOverridden: false,
      paid: false,
    },
  ]);

  const handleAddRecord = (record: PendingSaleItem) => {
    setPendingRecords((prev) => [...prev, record]);
  }

  const handleClearAll = () => {
    setPendingRecords([]);
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
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Add Sales Records</h1>
        <p className="text-muted-foreground">
          Input sales records and review before submitting to the database.
        </p>
      </div>
      <BulkPasteSalesPanel />
      {/* Input form will go here */}
      <InputRecordForm onAddRecord={handleAddRecord}/>

      {/* Pending Records Table */}
      <PendingRecordsTable
        pendingRecords={pendingRecords}
        onRemove={handleRemove}
      />

      {/* Submit Button */}
      {pendingRecords.length > 0 && (
        <div className="flex justify-end gap-4">
          <button
            className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={handleClearAll}
          >
            Clear All
          </button>
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Submit {pendingRecords.length} Record
            {pendingRecords.length !== 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  );
}
