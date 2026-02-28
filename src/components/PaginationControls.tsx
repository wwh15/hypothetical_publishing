import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationControlsProps) {
  // Use local state to handle the "typing" experience independently of navigation
  const [inputValue, setInputValue] = useState(currentPage.toString());

  // Keep local input in sync if page changes via buttons
  useEffect(() => {
    setInputValue(currentPage.toString());
  }, [currentPage]);

  if (totalPages <= 1) return null;

  const handleJump = () => {
    const page = parseInt(inputValue);

    // RESTRICTION LOGIC:
    // 1. If not a number, reset to current
    if (isNaN(page)) {
      setInputValue(currentPage.toString());
      return;
    }

    // 2. Clamp the value between 1 and totalPages
    const validatedPage = Math.max(1, Math.min(page, totalPages));
    
    setInputValue(validatedPage.toString());
    onPageChange(validatedPage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleJump();
  };

  return (
    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-4">
      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-all',
            currentPage === 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95'
          )}
        >
          ← Previous
        </button>

        <div className="flex items-center gap-2 px-4 border-x border-gray-100 dark:border-gray-800">
           <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {currentPage}
          </span>
          <span className="text-sm text-muted-foreground italic">
            of {totalPages}
          </span>
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-all',
            currentPage === totalPages
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95'
          )}
        >
          Next →
        </button>
      </div>

      {/* Improved Page Jump Input */}
      <div className="flex items-center gap-3">
        <label htmlFor="page-jump" className="text-xs font-medium uppercase tracking-wider text-gray-500">
          Jump to
        </label>
        <div className="relative">
          <input
            id="page-jump"
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleJump} // Trigger on click-away
            onKeyDown={handleKeyDown} // Trigger on Enter
            className={cn(
              "w-16 px-3 py-1.5 text-sm font-medium border rounded-md transition-shadow",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "dark:bg-gray-900 dark:border-gray-700",
              "appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            )}
          />
        </div>
      </div>
    </div>
  );
}