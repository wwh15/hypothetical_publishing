import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useTableSort } from '@/hooks/useTableSort';
import { useTablePagination } from '@/hooks/useTablePagination';
import { useTableFilter } from '@/hooks/useTableFilter';
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
    /** When set, sorting is server-controlled: data is pre-sorted, clicks call onSortChange */
    sortField?: string | null;
    sortDirection?: 'asc' | 'desc';
    onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
    itemsPerPage?: number;
    showPagination?: boolean;
    dateFilterField?: keyof T;
    showDateFilter?: boolean;
}

export function DataTable<T extends object>({
    columns,
    data,
    emptyMessage = 'No data available',
    onRowClick,
    defaultSortField,
    defaultSortDirection = 'desc',
    sortField: externalSortField,
    sortDirection: externalSortDirection,
    onSortChange,
    itemsPerPage = 50,
    showPagination = true,
    dateFilterField,
    showDateFilter = false,
}: DataTableProps<T>) {
    const serverSortMode = onSortChange != null;

    // In server sort mode, skip client-side filtering/sorting/pagination
    // The data is already processed on the server (sorted, filtered, paginated)
    const {
        filteredData,
        dateRange,
        setStartDate,
        setEndDate,
        clearDateRange,
        hasActiveFilter,
    } = useTableFilter({
        data: serverSortMode ? [] : data, // Pass empty array in server mode to avoid unnecessary processing
        dateField: dateFilterField,
    });

    const { sortedData, sortField, sortDirection, handleSort } = useTableSort({
        data: serverSortMode ? [] : filteredData, // Pass empty array in server mode to avoid unnecessary processing
        columns,
        defaultSortField,
        defaultSortDirection,
    });

    // In server mode, use data directly; otherwise use processed data
    const dataForPagination = serverSortMode ? data : sortedData;

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
        data: dataForPagination,
        itemsPerPage,
        enabled: showPagination && !serverSortMode, // Disable pagination in server mode
    });

    // In server mode, display data as-is (already paginated on server)
    // In client mode, use paginated data
    const displayData = serverSortMode ? data : paginatedData;

    const displaySortField: string | null = serverSortMode
      ? (externalSortField ?? null)
      : (sortField ?? null);
    const displaySortDirection = serverSortMode
      ? (externalSortDirection ?? "asc")
      : sortDirection;

    const handleSortClick = (columnKey: string, direction: 'asc' | 'desc') => {
        if (serverSortMode) {
            onSortChange(columnKey, direction);
        } else {
            handleSort(columnKey, direction);
            resetToFirstPage();
        }
    };

    const getCellValue = (row: T, column: ColumnDef<T>): React.ReactNode => {
        if (column.render) return column.render(row);
        if (column.accessor) return row[column.accessor] as React.ReactNode;
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

            {/* Table Info - only show in client-side pagination mode */}
            {showPagination && !serverSortMode && (
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
                                sortField={displaySortField}
                                sortDirection={displaySortDirection}
                                onSort={handleSortClick}
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

            {/* Pagination Controls - only show in client-side pagination mode */}
            {showPagination && !serverSortMode && !showAll && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                />
            )}
        </div>
    );
}
