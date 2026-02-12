import React from 'react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { ColumnDef } from './DataTable';

export type SortDirection = 'asc' | 'desc' | null;

interface TableHeaderCellProps<T> {
  column: ColumnDef<T>;
  sortField: string | null;
  sortDirection: SortDirection;
  onSort: (columnKey: string, direction: SortDirection) => void;
}

export function TableHeaderCell<T>({
  column,
  sortField,
  sortDirection,
  onSort,
}: TableHeaderCellProps<T>) {
  const isSorted = sortField === column.key;

  const handleClick = () => {
    if (column.sortable === false || !column.accessor) return;
    const nextDirection: SortDirection =
      !isSorted ? 'asc' : sortDirection === 'asc' ? 'desc' : null;
    onSort(column.key, nextDirection);
  };

  const canSort = column.sortable !== false && column.accessor;

  return (
    <TableHead className={cn(column.className)}>
      <div className="flex flex-col gap-1">
        <span className="font-semibold flex items-center gap-1">
          {column.header}
          {canSort && (
            <button
              type="button"
              onClick={handleClick}
              className={cn(
                'ml-1 p-0.5 rounded hover:bg-muted transition-colors',
                isSorted && 'text-blue-600'
              )}
              aria-label={
                !isSorted
                  ? `Sort by ${column.header} ascending`
                  : sortDirection === 'asc'
                    ? `Sorted ascending, click for descending`
                    : `Sorted descending, click to clear sort`
              }
            >
              {!isSorted ? (
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              ) : sortDirection === 'asc' ? (
                <ArrowUp className="w-4 h-4" />
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
            </button>
          )}
        </span>
      </div>
    </TableHead>
  );
}
