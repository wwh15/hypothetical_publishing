"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/DataTable";
import { SaleListItem } from "@/lib/data/records";
import { 
  salesTablePresets, 
  getPresetColumns, 
  getColumnsByVisibleIds,
  SalesColumnId 
} from "@/lib/table-configs/sales-columns";
import { createSalesRecordPath } from "@/lib/table-configs/navigation";

export type SalesTablePreset = keyof typeof salesTablePresets;

interface SalesRecordsTableProps {
  /** Sales data to display (view DTOs, not Prisma payloads) */
  rows: SaleListItem[];
  
  /** Preset configuration for column selection */
  preset?: SalesTablePreset;
  
  /** Explicit allowlist of columns to show (overrides preset) */
  visibleColumns?: SalesColumnId[];
  
  /** Custom row click handler */
  onRowClick?: (row: SaleListItem) => void;
  
  /** Navigation context - adds query params to default path */
  navigationContext?: Record<string, string | number>;
  
  /** Override date filter visibility */
  showDateFilter?: boolean;
}

/**
 * Sales records table component
 * 
 * Uses view DTOs (SaleListItem) for display, never Prisma payloads.
 * 
 * @example
 * // Use preset
 * <SalesRecordsTable rows={sales} preset="bookDetail" />
 * 
 * @example
 * // Custom columns
 * <SalesRecordsTable 
 *   rows={sales} 
 *   visibleColumns={['date', 'quantity', 'publisherRevenue']} 
 * />
 * 
 * @example
 * // Custom navigation with context
 * <SalesRecordsTable 
 *   rows={sales}
 *   navigationContext={{ from: 'book', bookId: 123 }}
 * />
 */
export default function SalesRecordsTable({ 
  rows,
  preset = 'full',
  visibleColumns,
  onRowClick,
  navigationContext,
  showDateFilter,
}: SalesRecordsTableProps) {
  const router = useRouter();

  // Select columns: explicit allowlist > preset > default
  const columns = visibleColumns
    ? getColumnsByVisibleIds(visibleColumns)
    : getPresetColumns(preset);

  // Get table config from preset
  const tableConfig = salesTablePresets[preset];

  // Navigation: onRowClick > navigationContext > default
  const handleRowClick = onRowClick || ((row: SaleListItem) => {
    if (navigationContext) {
      // Filter out undefined values and convert to strings
      const params: Record<string, string> = {};
      Object.entries(navigationContext).forEach(([key, value]) => {
        if (value !== undefined) {
          params[key] = String(value);
        }
      });
      const path = createSalesRecordPath(row.id, '/sales/records', params);
      router.push(path);
    } else {
      router.push(createSalesRecordPath(row.id));
    }
  });

  return (
    <DataTable<SaleListItem> 
      columns={columns} 
      data={rows} 
      emptyMessage="No sales found" 
      onRowClick={handleRowClick}
      defaultSortField={tableConfig.defaultSortField}
      defaultSortDirection={tableConfig.defaultSortDirection}
      showDateFilter={showDateFilter ?? tableConfig.showDateFilter}
      dateFilterField="date"
    />
  );
}