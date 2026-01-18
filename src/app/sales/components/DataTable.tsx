import React, { useMemo, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

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
}

export function DataTable<T extends Record<string, any>>({
    columns,
    data,
    emptyMessage = 'No data available',
    onRowClick,
    defaultSortField,
    defaultSortDirection = 'desc',
}: DataTableProps<T>) {

    // State for sorting
    const [sortField, setSortField] = useState<string | null>(defaultSortField || null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection);

    // Sort the data
    const sortedData = useMemo(() => {
        if (!sortField) return data;

        const column = columns.find(col => col.key === sortField);
        if (!column || !column.accessor) return data;

        return [...data].sort((a, b) => {
            const aValue = a[column.accessor!];
            const bValue = b[column.accessor!];

            // Handle null/undefined
            if (aValue == null) return 1;
            if (bValue == null) return -1;

            // Compare values
            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortField, sortDirection, columns]);

    // Handle sort click
    const handleSort = (columnKey: string, direction: 'asc' | 'desc') => {
        setSortField(columnKey);
        setSortDirection(direction);
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
        <Table>
            <TableHeader>
                <TableRow>
                    {columns.map((column) => (
                        <TableHead key={column.key} className={cn(column.className)}>
                            <div className="flex flex-col gap-1">
                                {/* Column Header */}
                                <span className="font-semibold flex items-center gap-1">
                                    {column.header}
                                    {/* Compact, animated visual indicator for sorted column */}
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
                                            {/* Up/down chevron SVG */}
                                            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M10 6a1 1 0 0 1 .7.3l3 3a1 1 0 0 1-1.4 1.4L10 8.41 7.7 10.7A1 1 0 0 1 6.3 9.3l3-3A1 1 0 0 1 10 6z"/>
                                            </svg>
                                        </span>
                                    )}
                                </span>
                                {/* Sort Buttons (only if sortable) */}
                                {column.sortable !== false && column.accessor && (
                                    <div className="flex gap-1 text-xs mt-0.5">
                                        <button
                                            type="button"
                                            onClick={() => handleSort(column.key, 'asc')}
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
                                                <path d="M8 4L3 9h10L8 4z" fill="currentColor"/>
                                            </svg>
                                            <span>A-Z</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSort(column.key, 'desc')}
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
                                                <path d="M8 12L13 7H3l5 5z" fill="currentColor"/>
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
                {sortedData.length === 0 ? (
                    <TableRow>
                        <TableCell
                            colSpan={columns.length}
                            className="h-24 text-center text-muted-foreground"
                        >
                            {emptyMessage}
                        </TableCell>
                    </TableRow>
                ) : (
                    sortedData.map((row, rowIndex) => (
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
    );
}