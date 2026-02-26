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

  const priorityLabel =
    sortPriority === 1
      ? "1st"
      : sortPriority === 2
        ? "2nd"
        : sortPriority === 3
          ? "3rd"
          : sortPriority != null
            ? `${sortPriority}th`
            : null;

  const handleClick = () => {
    if (column.sortable === false || !column.accessor) return;
    const nextDirection: SortDirection =
      !isSorted ? 'asc' : effectiveDirection === 'asc' ? 'desc' : null;
    onSort(column.key, nextDirection);
  };

  const canSort = column.sortable !== false && column.accessor;

  const sortHint = !isSorted
    ? `Sort by ${column.header} first (then keep current order as tie-breakers)`
    : effectiveDirection === 'asc'
      ? `${column.header} ascending (${priorityLabel ?? ""}). Click for descending, or again to remove.`
      : effectiveDirection === 'desc'
        ? `${column.header} descending (${priorityLabel ?? ""}). Click to remove from sort.`
        : '';

  return (
    <TableHead className={cn(column.className)}>
      <div className="flex flex-col gap-1">
        <span className="font-semibold flex items-center gap-1">
          {column.header}
          {canSort && (
            <button
              type="button"
              onClick={handleClick}
              title={sortHint}
              className={cn(
                'ml-1 p-0.5 rounded hover:bg-muted transition-colors',
                isSorted && 'text-blue-600'
              )}
              aria-label={sortHint || `Sort by ${column.header}`}
            >
              {!isSorted ? (
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <>
                  {priorityLabel && (
                    <span className="text-xs text-muted-foreground mr-0.5" aria-hidden>
                      {priorityLabel}
                    </span>
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
