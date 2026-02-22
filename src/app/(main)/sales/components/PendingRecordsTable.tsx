"use client";

import { BaseDataTable, ColumnDef } from "@/components/BaseDataTable";
import { PendingSaleItem } from "@/lib/data/records";
import { salesCellRenderers } from "@/lib/table-configs/sales-columns";
import { X } from "lucide-react";

interface PendingRecordsTableProps {
  pendingRecords: PendingSaleItem[];
  onRemove: (row: PendingSaleItem) => void;
  onTogglePaid: (row: PendingSaleItem) => void;
}

export default function PendingRecordsTable({
  pendingRecords,
  onRemove,
  onTogglePaid,
}: PendingRecordsTableProps) {
  // Define columns for pending sales table
  const pendingColumns: ColumnDef<PendingSaleItem>[] = [
    {
      key: "title",
      header: "Title",
      render: (row) => row.title,
    },
    {
      key: "date",
      header: "Date",
      render: (row) =>
        new Intl.DateTimeFormat("en-US", {
          month: "short",
          year: "numeric",
        }).format(row.date),
    },
    {
      key: "author",
      header: "Author",
      render: (row) => (
        <span>
          {row.author}
        </span>
      ),
    },
    {
      key: "quantity",
      header: "Quantity",
      render: (row) => <span>{row.quantity}</span>,
    },
    {
      key: "publisherRevenue",
      header: "Publisher Revenue",
      render: (row) => (
        <span className="font-medium">${row.publisherRevenue.toFixed(2)}</span>
      ),
    },
    {
      key: "authorRoyalty",
      header: "Author Royalty",
      render: (row) => (
        <span className="font-medium">${row.authorRoyalty.toFixed(2)}</span>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (row) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${row.source === "HAND_SOLD" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"}`}>
          {row.source === "HAND_SOLD" ? "Hand Sold" : "Distributor"}
        </span>
      ),
    },
    {
      key: "paid",
      header: "Royalty Status (Toggable)",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePaid(row);
          }}
          className="cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          title="Click to toggle paid / pending"
        >
          {salesCellRenderers.paidStatus(row.paid ? "paid" : "pending")}
        </button>
      ),
    },
    {
      key: "comment",
      header: "Comment",
      render: (row) => (
        <span className="text-muted-foreground text-sm">
          {row.comment != null && row.comment !== "" ? row.comment : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(row);
          }}
          className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded"
          title="Remove record"
        >
          <X className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="mb-6 mt-6">
      <h2 className="text-xl font-semibold mb-4">
        Pending Records ({pendingRecords.length})
      </h2>
      {pendingRecords.length > 0 ? (
        <BaseDataTable<PendingSaleItem>
          columns={pendingColumns}
          data={pendingRecords}
          emptyMessage="No pending records"
        />
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No pending records. Add records using the form above.
        </div>
      )}
    </div>
  );
}
