import React from 'react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { ColumnDef, SortSpecEntry } from './DataTable';

export type SortDirection = 'asc' | 'desc' | null;

interface TableHeaderCellProps<T> {
  column: ColumnDef<T>;
  sortField: string | null;
  sortDirection: SortDirection;
  /** When set, multi-column sort is active; per-column state is derived from this */
  sortSpec?: SortSpecEntry[] | null;
  onSort: (columnKey: string, direction: SortDirection) => void;
}

export function TableHeaderCell<T>({
  column,
  sortField,
  sortDirection,
  sortSpec,
  onSort,
}: TableHeaderCellProps<T>) {
  const multiSort = sortSpec && sortSpec.length > 0;
  const specEntry = multiSort ? sortSpec.find((s) => s.field === column.key) : null;
  const isSorted = multiSort ? !!specEntry : sortField === column.key;
  const sortPriority = specEntry ? sortSpec!.indexOf(specEntry) + 1 : null;
  const effectiveDirection: SortDirection = multiSort && specEntry ? specEntry.direction : sortDirection;

  const handleClick = () => {
    if (column.sortable === false || !column.accessor) return;
    const nextDirection: SortDirection =
      !isSorted ? 'asc' : effectiveDirection === 'asc' ? 'desc' : null;
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
                  : effectiveDirection === 'asc'
                    ? `Sorted ascending (${sortPriority ?? ''}), click for descending`
                    : `Sorted descending (${sortPriority ?? ''}), click to clear sort`
              }
            >
              {!isSorted ? (
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <>
                  {sortPriority != null && sortPriority > 1 && (
                    <span className="text-xs text-muted-foreground mr-0.5">{sortPriority}</span>
                  )}
                  {effectiveDirection === 'asc' ? (
                    <ArrowUp className="w-4 h-4" />
                  ) : (
                    <ArrowDown className="w-4 h-4" />
                  )}
                </>
              )}
            </button>
          )}
        </span>
      </div>
    </TableHead>
  );
}
