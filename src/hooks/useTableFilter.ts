import { useState, useMemo } from 'react';

export interface DateRangeFilter {
  startDate: string; // Format: YYYY-MM-DD or MM-YYYY
  endDate: string;
}

export interface UseTableFilterOptions<T> {
  data: T[];
  dateField?: keyof T; // Which field to filter on (e.g., 'date')
}

export function useTableFilter<T extends Record<string, any>>({
  data,
  dateField,
}: UseTableFilterOptions<T>) {
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    startDate: '',
    endDate: '',
  });

  const filteredData = useMemo(() => {
    // If no date field specified or no filter set, return all data
    if (!dateField || (!dateRange.startDate && !dateRange.endDate)) {
      console.log('No filter applied - returning all data');
      return data;
    }
  
    console.log('Filtering with:', { 
      startDate: dateRange.startDate, 
      endDate: dateRange.endDate,
      dataLength: data.length 
    });
  
    const filtered = data.filter((row) => {
      const rowDate = row[dateField] as string;
      if (!rowDate) return true;
  
      const normalizedRowDate = convertToComparableDate(rowDate);
      
      // Check start date
      if (dateRange.startDate) {
        const start = convertToComparableDate(dateRange.startDate);
        console.log('Comparing:', { rowDate, normalizedRowDate, start, passes: normalizedRowDate >= start });
        if (normalizedRowDate < start) return false;
      }
  
      // Check end date
      if (dateRange.endDate) {
        const end = convertToComparableDate(dateRange.endDate);
        if (normalizedRowDate > end) return false;
      }
  
      return true;
    });
  
    console.log('Filtered data length:', filtered.length);
    return filtered;
  }, [data, dateRange, dateField]);

  const setStartDate = (date: string) => {
    setDateRange((prev) => ({ ...prev, startDate: date }));
  };

  const setEndDate = (date: string) => {
    setDateRange((prev) => ({ ...prev, endDate: date }));
  };

  const clearDateRange = () => {
    setDateRange({ startDate: '', endDate: '' });
  };

  const hasActiveFilter = dateRange.startDate !== '' || dateRange.endDate !== '';

  return {
    filteredData,
    dateRange,
    setStartDate,
    setEndDate,
    setDateRange,
    clearDateRange,
    hasActiveFilter,
  };
}

// Helper function to normalize dates for comparison
function convertToComparableDate(date: string): string {
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  // Convert MM-YYYY to YYYY-MM-01 for comparison
  if (/^\d{2}-\d{4}$/.test(date)) {
    const [month, year] = date.split('-');
    return `${year}-${month}-01`;
  }

  return date;
}
