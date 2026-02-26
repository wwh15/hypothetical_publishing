import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { ColumnDef } from './DataTable';
import { SortColumn } from '@/lib/types/sort';

export type SortDirection = 'asc' | 'desc' | null;

interface TableHeaderCellProps<T> {
  column: ColumnDef<T>;
  /** Legacy single-sort field */
  sortField: string | null;
  /** Legacy single-sort direction */
  sortDirection: SortDirection;
  /** Legacy single-sort handler */
  onSort: (columnKey: string, direction: SortDirection) => void;
  /** Multi-sort: current sort columns */
  sortColumns?: SortColumn[];
  /** Multi-sort: handler called with (columnKey, direction) */
  onMultiSort?: (columnKey: string, direction: SortDirection) => void;
}

export function TableHeaderCell<T>({
  column,
  sortField,
  sortDirection,
  onSort,
  sortColumns,
  onMultiSort,
}: TableHeaderCellProps<T>) {
  const multiSortMode = sortColumns != null && onMultiSort != null;

  // Determine sort state for this column
  const multiSortIndex = multiSortMode
    ? sortColumns.findIndex((s) => s.field === column.key)
    : -1;
  const isMultiSorted = multiSortMode && multiSortIndex !== -1;
  const multiSortDir = isMultiSorted ? sortColumns[multiSortIndex].direction : null;

  // Legacy single-sort state
  const isSingleSorted = !multiSortMode && sortField === column.key;

  const isSorted = multiSortMode ? isMultiSorted : isSingleSorted;
  const currentDir = multiSortMode ? multiSortDir : (isSingleSorted ? sortDirection : null);

  const handleClick = () => {
    if (column.sortable === false || !column.accessor) return;

    if (multiSortMode) {
      // Multi-sort cycle: unsorted → asc → desc → remove
      const nextDirection: SortDirection =
        !isMultiSorted ? 'asc' : multiSortDir === 'asc' ? 'desc' : null;
      onMultiSort(column.key, nextDirection);
    } else {
      // Legacy single-sort cycle
      const nextDirection: SortDirection =
        !isSingleSorted ? 'asc' : sortDirection === 'asc' ? 'desc' : null;
      onSort(column.key, nextDirection);
    }
  };

  const canSort = column.sortable !== false && column.accessor;
  const showBadge = multiSortMode && isMultiSorted && sortColumns.length > 1;

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
                'ml-1 p-0.5 rounded hover:bg-muted transition-colors relative',
                isSorted && 'text-blue-600'
              )}
              aria-label={
                !isSorted
                  ? `Sort by ${column.header} ascending`
                  : currentDir === 'asc'
                    ? `Sorted ascending, click for descending`
                    : `Sorted descending, click to clear sort`
              }
            >
              {!isSorted ? (
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              ) : currentDir === 'asc' ? (
                <ArrowUp className="w-4 h-4" />
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
              {showBadge && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {multiSortIndex + 1}
                </span>
              )}
            </button>
          )}
        </span>
      </div>
    </TableHead>
  );
}
