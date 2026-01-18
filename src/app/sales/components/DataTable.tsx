import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useTableSort } from '../hooks/useTableSort';
import { useTablePagination } from '../hooks/useTablePagination';

export interface ColumnDef<T> {
    key: string;
    header: string;
    accessor?: keyof T;
    render?: (row: T) => React.ReactNode;
    className?: string;
    sortable?: boolean;
}

export interface DataTableProps<T> {
    columns: ColumnDef<T>[];
    data: T[];
    emptyMessage?: string;
    onRowClick?: (row: T) => void;
    defaultSortField?: string;
    defaultSortDirection?: 'asc' | 'desc';
    itemsPerPage?: number;
    showPagination?: boolean;
}

export function DataTable<T extends Record<string, any>>({
    columns,
    data,
    emptyMessage = 'No data available',
    onRowClick,
    defaultSortField,
    defaultSortDirection = 'desc',
    itemsPerPage = 50,
    showPagination = true,
}: DataTableProps<T>) {

    // Use custom hooks for sorting and pagination
    const { sortedData, sortField, sortDirection, handleSort } = useTableSort({
        data,
        columns,
        defaultSortField,
        defaultSortDirection,
    });

    const {
        paginatedData,
        currentPage,
        totalPages,
        startRecord,
        endRecord,
        totalRecords,
        showAll,
        goToPage,
        toggleShowAll,
        resetToFirstPage,
    } = useTablePagination({
        data: sortedData,
        itemsPerPage,
        enabled: showPagination,
    });

    // When sorting changes, reset to first page
    const handleSortAndReset = (columnKey: string, direction: 'asc' | 'desc') => {
        handleSort(columnKey, direction);
        resetToFirstPage();
    };

    const getCellValue = (row: T, column: ColumnDef<T>) => {
        if (column.render) {
            return column.render(row);
        }
        if (column.accessor) {
            return row[column.accessor];
        }
        return null;
    };

    return (
        <div className="space-y-4">
            {/* Header with record count and Show All button */}
            {showPagination && totalRecords > 0 && (
                <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                        {showAll
                            ? `Showing all ${totalRecords} records`
                            : `Showing ${startRecord}-${endRecord} of ${totalRecords} records`
                        }
                    </p>

                    {totalRecords > itemsPerPage && (
                        <button
                            onClick={toggleShowAll}
                            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                        >
                            {showAll ? 'Show Paginated' : 'Show All'}
                        </button>
                    )}
                </div>
            )}

            {/* Table */}
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((column) => (
                            <TableHead key={column.key} className={cn(column.className)}>
                                <div className="flex flex-col gap-1">
                                    {/* Column Header */}
                                    <span className="font-semibold flex items-center gap-1">
                                        {column.header}
                                        {/* Visual indicator for sorted column */}
                                        {sortField === column.key && (
                                            <span
                                                className={cn(
                                                    'ml-1 transition-transform inline-block',
                                                    'text-blue-600',
                                                    sortDirection === 'asc'
                                                        ? 'rotate-0'
                                                        : 'rotate-180'
                                                )}
                                                aria-label={
                                                    sortDirection === 'asc'
                                                        ? 'Sorted ascending'
                                                        : 'Sorted descending'
                                                }
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
                                            <button
                                                type="button"
                                                onClick={() => handleSortAndReset(column.key, 'asc')}
                                                className={cn(
                                                    'flex items-center px-1 py-0.5 rounded focus:outline-none border',
                                                    'transition-colors duration-150',
                                                    sortField === column.key && sortDirection === 'asc'
                                                        ? 'text-white bg-blue-600 border-blue-600 shadow'
                                                        : 'text-gray-500 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent',
                                                )}
                                                aria-label={`Sort ${column.header} ascending`}
                                            >
                                                <svg className="mr-1" width="12" height="12" viewBox="0 0 16 16" fill="none">
                                                    <path d="M8 4L3 9h10L8 4z" fill="currentColor" />
                                                </svg>
                                                <span>A-Z</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSortAndReset(column.key, 'desc')}
                                                className={cn(
                                                    'flex items-center px-1 py-0.5 rounded focus:outline-none border',
                                                    'transition-colors duration-150',
                                                    sortField === column.key && sortDirection === 'desc'
                                                        ? 'text-white bg-blue-600 border-blue-600 shadow'
                                                        : 'text-gray-500 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent',
                                                )}
                                                aria-label={`Sort ${column.header} descending`}
                                            >
                                                <svg className="mr-1" width="12" height="12" viewBox="0 0 16 16" fill="none">
                                                    <path d="M8 12L13 7H3l5 5z" fill="currentColor" />
                                                </svg>
                                                <span>Z-A</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedData.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length}
                                className="h-24 text-center text-muted-foreground"
                            >
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    ) : (
                        paginatedData.map((row, rowIndex) => (
                            <TableRow
                                key={rowIndex}
                                onClick={() => onRowClick?.(row)}
                                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                            >
                                {columns.map((column) => (
                                    <TableCell key={column.key} className={cn(column.className)}>
                                        {getCellValue(row, column)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {/* Pagination Controls */}
            {showPagination && !showAll && totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={cn(
                                'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                                currentPage === 1
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                            )}
                        >
                            ← Previous
                        </button>

                        <span className="text-sm text-muted-foreground px-2">
                            Page {currentPage} of {totalPages}
                        </span>

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={cn(
                                'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                                currentPage === totalPages
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                            )}
                        >
                            Next →
                        </button>
                    </div>

                    {/* Page jump input */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Go to page:</span>
                        <input
                            type="number"
                            min="1"
                            max={totalPages}
                            value={currentPage}
                            onChange={(e) => {
                                const page = parseInt(e.target.value);
                                if (!isNaN(page)) goToPage(page);
                            }}
                            className="w-16 px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}