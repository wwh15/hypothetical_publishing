import { useState, useEffect } from 'react';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClear: () => void;
  hasActiveFilter: boolean;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
  hasActiveFilter,
}: DateRangeFilterProps) {
  const [error, setError] = useState<string>('');

  // Validate date range whenever BOTH dates are complete
  useEffect(() => {
    // Only validate if both dates are fully entered
    if (isValidFormat(startDate) && isValidFormat(endDate)) {
      const isValid = validateDateRange(startDate, endDate);
      if (!isValid) {
        setError('Start date must be before or equal to end date');
      } else {
        setError('');
      }
    } else {
      // Clear error while typing
      setError('');
    }
  }, [startDate, endDate]);

  const handleStartDateChange = (value: string) => {
    // Allow typing without validation
    onStartDateChange(value);
  };

  const handleEndDateChange = (value: string) => {
    // Allow typing without validation
    onEndDateChange(value);
  };

  // Validate format only when user leaves the field (onBlur)
  const handleStartBlur = () => {
    if (startDate && !isValidFormat(startDate)) {
      setError('Invalid format. Use MM-YYYY (e.g., 01-2026)');
    }
  };

  const handleEndBlur = () => {
    if (endDate && !isValidFormat(endDate)) {
      setError('Invalid format. Use MM-YYYY (e.g., 12-2026)');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filter by period:
        </span>

        {/* Start Date Input */}
        <div className="flex items-center gap-2">
          <label htmlFor="startDate" className="text-sm text-gray-600 dark:text-gray-400">
            From
          </label>
          <input
            id="startDate"
            type="text"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            onBlur={handleStartBlur}
            placeholder="01-2026"
            className="w-24 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600"
          />
        </div>

        {/* End Date Input */}
        <div className="flex items-center gap-2">
          <label htmlFor="endDate" className="text-sm text-gray-600 dark:text-gray-400">
            To
          </label>
          <input
            id="endDate"
            type="text"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            onBlur={handleEndBlur}
            placeholder="12-2026"
            className="w-24 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600"
          />
        </div>

        {/* Clear Button */}
        {hasActiveFilter && (
          <button
            onClick={() => {
              onClear();
              setError(''); // Clear error when clearing filter
            }}
            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
          >
            Clear
          </button>
        )}

        {/* Help Text */}
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Format: MM-YYYY
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-red-600 dark:text-red-400 font-medium">
            {error}
          </span>
        </div>
      )}
    </div>
  );
}

// Helper function to validate MM-YYYY format
function isValidFormat(date: string): boolean {
  if (!date) return false;
  const regex = /^(0[1-9]|1[0-2])-\d{4}$/;
  return regex.test(date);
}

// Helper function to validate date range
function validateDateRange(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) return true;

  // Convert MM-YYYY to comparable format YYYY-MM
  const [startMonth, startYear] = startDate.split('-');
  const [endMonth, endYear] = endDate.split('-');

  const start = new Date(parseInt(startYear), parseInt(startMonth) - 1);
  const end = new Date(parseInt(endYear), parseInt(endMonth) - 1);

  return start <= end;
}
