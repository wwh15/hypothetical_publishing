import { useState, useMemo } from 'react';

export interface UseTableSortOptions<T> {
    data: T[];
    columns: Array<{ key: string; accessor?: keyof T }>;
    defaultSortField?: string;
    defaultSortDirection?: 'asc' | 'desc';
}

export function useTableSort<T extends object>({
    data,
    columns,
    defaultSortField,
    defaultSortDirection = 'desc',
}: UseTableSortOptions<T>) {
    const [sortField, setSortField] = useState<string | null>(defaultSortField || null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection);

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

            // Special handling for Date objects
            if (aValue instanceof Date && bValue instanceof Date) {
                const aT = aValue.getTime();
                const bT = bValue.getTime();
                if (aT < bT) return sortDirection === 'asc' ? -1 : 1;
                if (aT > bT) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            }

            // Special handling for date fields in MM-YYYY format (string)
            if (isDateField(aValue) && isDateField(bValue)) {
                const aComparable = convertDateToComparable(aValue as string);
                const bComparable = convertDateToComparable(bValue as string);

                if (aComparable < bComparable) return sortDirection === 'asc' ? -1 : 1;
                if (aComparable > bComparable) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            }

            // Compare other values normally
            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortField, sortDirection, columns]);

    const handleSort = (columnKey: string, direction: 'asc' | 'desc') => {
        setSortField(columnKey);
        setSortDirection(direction);
    };

    return {
        sortedData,
        sortField,
        sortDirection,
        handleSort,
    };
}

// Helper to detect if a value is a date in MM-YYYY format
function isDateField(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return /^\d{2}-\d{4}$/.test(value);
}

// Helper to convert MM-YYYY to YYYY-MM for proper sorting
function convertDateToComparable(date: string): string {
    const [month, year] = date.split('-');
    return `${year}-${month}`;  // Convert to YYYY-MM for correct sorting
}
