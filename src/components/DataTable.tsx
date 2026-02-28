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
import { SortColumn } from '@/lib/types/sort';

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
    sortDirection?: 'asc' | 'desc' | null;
    onSortChange?: (field: string, direction: 'asc' | 'desc' | null) => void;
    itemsPerPage?: number;
    showPagination?: boolean;
    dateFilterField?: keyof T;
    showDateFilter?: boolean;
    /** Multi-sort: current sort columns (server-controlled) */
    sortColumns?: SortColumn[];
    /** Multi-sort: called when sort columns change */
    onMultiSortChange?: (columns: SortColumn[]) => void;
    /** Map column keys to display labels for the sort summary */
    columnLabels?: Record<string, string>;
    /** Called when user clicks "Clear Sort" in the sort summary */
    onClearSort?: () => void;
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
    sortColumns,
    onMultiSortChange,
    columnLabels,
    onClearSort,
}: DataTableProps<T>) {
    const multiSortMode = onMultiSortChange != null && sortColumns != null;
    const serverSortMode = onSortChange != null || multiSortMode;

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

    // In server mode, data is already paginated on server; in client mode use paginatedData
    const rowsToShow = serverSortMode ? data : paginatedData;

    const displaySortField: string | null = serverSortMode
      ? (externalSortField ?? null)
      : (sortField ?? null);
    const displaySortDirection = serverSortMode
      ? (externalSortDirection ?? null)
      : sortDirection;

    const handleSortClick = (columnKey: string, direction: 'asc' | 'desc' | null) => {
        if (multiSortMode) {
            // Handled by handleMultiSortClick instead
            return;
        }
        if (onSortChange) {
            onSortChange(columnKey, direction);
        } else {
            handleSort(columnKey, direction);
            resetToFirstPage();
        }
    };

    const handleMultiSortClick = (columnKey: string, direction: 'asc' | 'desc' | null) => {
        if (!onMultiSortChange || !sortColumns) return;
        const current = sortColumns;
        const idx = current.findIndex((s) => s.field === columnKey);
        let next: SortColumn[];
        if (idx === -1) {
            // Not in sort → append as asc
            next = [...current, { field: columnKey, direction: 'asc' }];
        } else if (direction === null) {
            // Remove from sort
            next = current.filter((_, i) => i !== idx);
        } else {
            // Toggle direction
            next = current.map((s, i) =>
                i === idx ? { ...s, direction } : s
            );
        }
        onMultiSortChange(next);
    };

    const handleDirectionToggle = (field: string) => {
        if (!onMultiSortChange || !sortColumns) return;
        onMultiSortChange(
            sortColumns.map((s) =>
                s.field === field
                    ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' }
                    : s
            )
        );
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

            {/* Sort Summary */}
            {multiSortMode && sortColumns.length > 0 && (
                <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                        Sorted by:{' '}
                        {sortColumns.map((col, i) => (
                            <span key={col.field}>
                                {i > 0 && <span className="mx-1">&rsaquo;</span>}
                                <span className="font-medium text-foreground">
                                    {columnLabels?.[col.field] ?? col.field}
                                </span>{' '}
                                <button
                                    type="button"
                                    onClick={() => handleDirectionToggle(col.field)}
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline decoration-dotted cursor-pointer transition-colors"
                                    aria-label={`Toggle ${columnLabels?.[col.field] ?? col.field} to ${col.direction === 'asc' ? 'descending' : 'ascending'}`}
                                >
                                    ({col.direction === 'asc' ? '↑ asc' : '↓ desc'})
                                </button>
                            </span>
                        ))}
                    </p>
                    {onClearSort && (
                        <button
                            type="button"
                            onClick={onClearSort}
                            className="px-2 py-0.5 text-xs font-medium text-red-600 hover:text-white border border-red-300 dark:border-red-700 rounded hover:bg-red-600 dark:text-red-400 dark:hover:text-white dark:hover:bg-red-600 transition-colors whitespace-nowrap"
                        >
                            Clear Sort
                        </button>
                    )}
                </div>
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
                                sortColumns={multiSortMode ? sortColumns : undefined}
                                onMultiSort={multiSortMode ? handleMultiSortClick : undefined}
                            />
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rowsToShow.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length}
                                className="h-24 text-center text-muted-foreground"
                            >
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    ) : (
                        rowsToShow.map((row, rowIndex) => (
                            <TableRow
                                key={rowIndex}
                                onClick={() => onRowClick?.(row)}
                                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                            >
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.key}
                                        className={column.className}
                                    >
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
