import React from 'react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ColumnDef } from './DataTable';

interface TableHeaderCellProps<T> {
  column: ColumnDef<T>;
  sortField: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (columnKey: string, direction: 'asc' | 'desc') => void;
}

export function TableHeaderCell<T>({ 
  column, 
  sortField, 
  sortDirection, 
  onSort 
}: TableHeaderCellProps<T>) {
  const isSorted = sortField === column.key;

  return (
    <TableHead className={cn(column.className)}>
      <div className="flex flex-col gap-1">
        {/* Column Header */}
        <span className="font-semibold flex items-center gap-1">
          {column.header}
          {/* Visual indicator for sorted column */}
          {isSorted && (
            <span
              className={cn(
                'ml-1 transition-transform inline-block text-blue-600',
                sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'
              )}
              aria-label={sortDirection === 'asc' ? 'Sorted ascending' : 'Sorted descending'}
              style={{ fontSize: '0.95em' }}
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 6a1 1 0 0 1 .7.3l3 3a1 1 0 0 1-1.4 1.4L10 8.41 7.7 10.7A1 1 0 0 1 6.3 9.3l3-3A1 1 0 0 1 10 6z" />
              </svg>
            </span>
          )}
        </span>

        {/* Sort Buttons */}
        {column.sortable !== false && column.accessor && (
          <div className="flex gap-1 text-xs mt-0.5">
            <SortButton
              direction="asc"
              isActive={isSorted && sortDirection === 'asc'}
              onClick={() => onSort(column.key, 'asc')}
              label={`Sort ${column.header} ascending`}
            />
            <SortButton
              direction="desc"
              isActive={isSorted && sortDirection === 'desc'}
              onClick={() => onSort(column.key, 'desc')}
              label={`Sort ${column.header} descending`}
            />
          </div>
        )}
      </div>
    </TableHead>
  );
}

interface SortButtonProps {
  direction: 'asc' | 'desc';
  isActive: boolean;
  onClick: () => void;
  label: string;
}

function SortButton({ direction, isActive, onClick, label }: SortButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center px-1 py-0.5 rounded focus:outline-none border transition-colors duration-150',
        isActive
          ? 'text-white bg-blue-600 border-blue-600 shadow'
          : 'text-gray-500 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent'
      )}
      aria-label={label}
    >
      <svg className="mr-1" width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path
          d={direction === 'asc' ? 'M8 4L3 9h10L8 4z' : 'M8 12L13 7H3l5 5z'}
          fill="currentColor"
        />
      </svg>
      <span>{direction === 'asc' ? 'A-Z' : 'Z-A'}</span>
    </button>
  );
}
