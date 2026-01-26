"use client";

import { DataTable } from "@/components/DataTable";
import { ColumnDef } from "@/components/DataTable";
import { PendingSaleItem } from "@/lib/data/records";
import { X } from "lucide-react";

interface PendingRecordsTableProps {
  pendingRecords: PendingSaleItem[];
  onRemove: (row: PendingSaleItem) => void;
}

export default function PendingRecordsTable({ 
  pendingRecords, 
  onRemove 
}: PendingRecordsTableProps) {
  // Define columns for pending sales table
  const pendingColumns: ColumnDef<PendingSaleItem>[] = [
    {
      key: "title",
      header: "Title",
      accessor: "title",
      sortable: true,
    },
    {
      key: "date",
      header: "Date",
      accessor: "date",
      sortable: true,
    },
    {
      key: "author",
      header: "Author",
      accessor: "author",
      sortable: true,
    },
    {
      key: "quantity",
      header: "Quantity",
      accessor: "quantity",
      sortable: true,
      render: (row) => <span>{row.quantity}</span>,
    },
    {
      key: "publisherRevenue",
      header: "Publisher Revenue",
      accessor: "publisherRevenue",
      sortable: true,
      render: (row) => (
        <span className="font-medium">${row.publisherRevenue.toFixed(2)}</span>
      ),
    },
    {
      key: "authorRoyalty",
      header: "Author Royalty",
      accessor: "authorRoyalty",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className={row.royaltyOverridden ? "font-bold text-orange-600" : "font-medium"}>
            ${row.authorRoyalty.toFixed(2)}
          </span>
          {row.royaltyOverridden && (
            <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-2 py-0.5 rounded">
              Overridden
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      sortable: false,
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
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4">
        Pending Records ({pendingRecords.length})
      </h2>
      {pendingRecords.length > 0 ? (
        <DataTable<PendingSaleItem>
          columns={pendingColumns}
          data={pendingRecords}
          emptyMessage="No pending records"
          showPagination={false}
          showDateFilter={false}
        />
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No pending records. Add records using the form above.
        </div>
      )}
    </div>
  );
}