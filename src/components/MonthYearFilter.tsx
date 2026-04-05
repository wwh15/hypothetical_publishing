"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import MonthYearSelector from "./MonthYearSelector";

interface MonthYearFilterProps {
  startDate: string; // Format: YYYY-MM
  endDate: string;   // Format: YYYY-MM
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClear: () => void;
  hasActiveFilter: boolean;
}

type MonthYear = string | null; // "YYYY-MM" or null

export function MonthYearFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
  hasActiveFilter,
}: MonthYearFilterProps) {

  // Validation: With YYYY-MM, we can use simple string comparison!
  const isInvalidRange = startDate && endDate && startDate > endDate;

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-1">
      <div className="flex min-h-10 min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-2 sm:h-10 sm:flex-nowrap">
        <MonthYearSelector
          placeholder="From"
          value={startDate ?? null}
          onChange={(v: MonthYear) => onStartDateChange(v ?? "")}
          className="h-10 min-h-10 rounded-lg border-gray-300 bg-white py-0 dark:border-gray-700 dark:bg-gray-800"
        />

        <span className="shrink-0 text-muted-foreground text-sm leading-none">
          to
        </span>

        <MonthYearSelector
          placeholder="To"
          value={endDate ?? null}
          onChange={(v: MonthYear) => onEndDateChange(v ?? "")}
          className="h-10 min-h-10 rounded-lg border-gray-300 bg-white py-0 dark:border-gray-700 dark:bg-gray-800"
        />

        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-10 shrink-0 px-2 text-muted-foreground hover:text-destructive"
          >
            Reset
          </Button>
        )}
      </div>

      {isInvalidRange && (
        <div className="flex items-center gap-2 text-destructive text-xs font-semibold px-2">
          <AlertCircle className="h-3 w-3" />
          End date cannot be before start date
        </div>
      )}
    </div>
  );
}