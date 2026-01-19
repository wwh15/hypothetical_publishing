import React from 'react';

interface TableInfoProps {
  startRecord: number;
  endRecord: number;
  totalRecords: number;
  showAll: boolean;
  itemsPerPage: number;
  onToggleShowAll: () => void;
}

export function TableInfo({
  startRecord,
  endRecord,
  totalRecords,
  showAll,
  itemsPerPage,
  onToggleShowAll,
}: TableInfoProps) {
  if (totalRecords === 0) return null;

  return (
    <div className="flex justify-between items-center">
      <p className="text-sm text-muted-foreground">
        {showAll
          ? `Showing all ${totalRecords} records`
          : `Showing ${startRecord}-${endRecord} of ${totalRecords} records`
        }
      </p>

      {totalRecords > itemsPerPage && (
        <button
          onClick={onToggleShowAll}
          className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
        >
          {showAll ? 'Show Paginated' : 'Show All'}
        </button>
      )}
    </div>
  );
}
