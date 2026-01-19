import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useTableSort } from '../hooks/useTableSort';
import { useTablePagination } from '../hooks/useTablePagination';
import { useTableFilter } from '../hooks/useTableFilter';
import { DateRangeFilter } from './DateRangeFilter';
import { TableHeaderCell } from './TableHeaderCell';
import { PaginationControls } from './PaginationControls';
import { TableInfo } from './TableInfo';

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
    dateFilterField?: keyof T; // ADD THIS - field to filter by date
    showDateFilter?: boolean;
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
    dateFilterField,        // ADD THIS
    showDateFilter = false, // ADD THIS
}: DataTableProps<T>) {

    const {
        filteredData,
        dateRange,
        setStartDate,
        setEndDate,
        clearDateRange,
        hasActiveFilter,
    } = useTableFilter({
        data,
        dateField: dateFilterField,
    });

    // Use custom hooks for sorting and pagination
    const { sortedData, sortField, sortDirection, handleSort } = useTableSort({
        data: filteredData,
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
        if (column.render) return column.render(row);
        if (column.accessor) return row[column.accessor];
        return null;
    };

    return (
        <div className="space-y-4">
            {/* Date Range Filter */}
            {showDateFilter && dateFilterField && (
                <DateRangeFilter
                    startDate={dateRange.startDate}
                    endDate={dateRange.endDate}
                    onStartDateChange={(date) => {
                        setStartDate(date);
                        resetToFirstPage();
                    }}
                    onEndDateChange={(date) => {
                        setEndDate(date);
                        resetToFirstPage();
                    }}
                    onClear={() => {
                        clearDateRange();
                        resetToFirstPage();
                    }}
                    hasActiveFilter={hasActiveFilter}
                />
            )}

            {/* Table Info */}
            {showPagination && (
                <TableInfo
                    startRecord={startRecord}
                    endRecord={endRecord}
                    totalRecords={totalRecords}
                    showAll={showAll}
                    itemsPerPage={itemsPerPage}
                    onToggleShowAll={toggleShowAll}
                />
            )}

            {/* Table */}
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((column) => (
                            <TableHeaderCell
                                key={column.key}
                                column={column}
                                sortField={sortField}
                                sortDirection={sortDirection}
                                onSort={handleSortAndReset}
                            />
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
            {showPagination && !showAll && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                />
            )}
        </div>
    );
}