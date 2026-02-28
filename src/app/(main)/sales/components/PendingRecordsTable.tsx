"use client";

import { BaseDataTable, ColumnDef } from "@/components/BaseDataTable";
import { PendingSaleItem } from "@/lib/data/records";
import { getPendingColumns, salesCellRenderers } from "@/lib/table-configs/sales-columns";
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
  const pendingColumns: ColumnDef<PendingSaleItem>[] = getPendingColumns(onTogglePaid, onRemove);

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
