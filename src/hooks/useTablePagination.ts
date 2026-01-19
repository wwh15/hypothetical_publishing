import { useState, useMemo } from 'react';

export interface UseTablePaginationOptions<T> {
  data: T[];
  itemsPerPage?: number;
  enabled?: boolean;
}

export function useTablePagination<T>({
  data,
  itemsPerPage = 50,
  enabled = true,
}: UseTablePaginationOptions<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  // Paginate the data
  const paginatedData = useMemo(() => {
    if (!enabled || showAll) {
      return data;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage, enabled, showAll]);

  // Calculate pagination info
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startRecord = data.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPage * itemsPerPage, data.length);
  const totalRecords = data.length;

  // Navigate to a specific page
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Toggle show all
  const toggleShowAll = () => {
    setShowAll(!showAll);
    setCurrentPage(1);
  };

  // Reset to first page (useful when sorting changes)
  const resetToFirstPage = () => {
    setCurrentPage(1);
  };

  return {
    paginatedData,
    currentPage,
    totalPages,
    startRecord,
    endRecord,
    totalRecords,
    showAll,
    goToPage,
    setShowAll,
    toggleShowAll,
    resetToFirstPage,
  };
}
