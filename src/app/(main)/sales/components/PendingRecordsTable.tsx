"use client";

import { useMemo } from "react";
import { BaseDataTable, ColumnDef } from "@/components/BaseDataTable";
import { PendingSaleItem } from "@/lib/data/records";
import { getPendingColumns } from "@/lib/table-configs/sales-columns";

interface PendingRecordsTableProps {
  pendingRecords: PendingSaleItem[];
  onRemove: (row: PendingSaleItem) => void;
  onTogglePaid: (row: PendingSaleItem) => void;
  /** When true, the paid chip cannot be toggled (e.g. projected / unreleased book). */
  isPaidToggleDisabled?: (row: PendingSaleItem) => boolean;
}

export default function PendingRecordsTable({
  pendingRecords,
  onRemove,
  onTogglePaid,
  isPaidToggleDisabled,
}: PendingRecordsTableProps) {
  const pendingColumns: ColumnDef<PendingSaleItem>[] = useMemo(
    () =>
      getPendingColumns(onTogglePaid, onRemove, {
        isPaidToggleDisabled,
      }),
    [onTogglePaid, onRemove, isPaidToggleDisabled]
  );

  return (
    <div id="pending-records" className="mb-6 mt-6">
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
