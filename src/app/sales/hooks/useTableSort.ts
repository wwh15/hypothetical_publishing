import { useState, useMemo } from 'react';

export interface UseTableSortOptions<T> {
  data: T[];
  columns: Array<{ key: string; accessor?: keyof T }>;
  defaultSortField?: string;
  defaultSortDirection?: 'asc' | 'desc';
}

export function useTableSort<T extends Record<string, any>>({
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

      // Compare values
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