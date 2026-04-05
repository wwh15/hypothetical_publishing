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
    <div className="flex flex-col gap-1">
      <div className="flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-2 w-fit">
        <span className="shrink-0 text-sm font-medium leading-none">Range:</span>

        <MonthYearSelector
          placeholder="From"
          value={startDate ?? null}
          onChange={(v: MonthYear) => onStartDateChange(v ?? "")}
          className="h-10 min-h-10 py-0"
        />

        <span className="shrink-0 text-muted-foreground text-sm leading-none">
          to
        </span>

        <MonthYearSelector
          placeholder="To"
          value={endDate ?? null}
          onChange={(v: MonthYear) => onEndDateChange(v ?? "")}
          className="h-10 min-h-10 py-0"
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