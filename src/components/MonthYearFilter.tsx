"use client";

import React from "react";
import { CalendarIcon, ChevronLeft, ChevronRight, AlertCircle, ChevronsRight, ChevronsLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 p-2 bg-background border rounded-lg w-fit">
        <span className="text-sm font-medium px-2">Range:</span>

        <MonthYearSelector 
          placeholder="From" 
          value={startDate ?? null} 
          // MonthYearSelector returns MonthYear (string | null)
          // parent expects a string, so convert null -> ""
          onChange={(v: MonthYear) => onStartDateChange(v ?? "")} 
        />
        
        <span className="text-muted-foreground text-sm">to</span>

        <MonthYearSelector 
          placeholder="To" 
          value={endDate ?? null} 
          onChange={(v: MonthYear) => onEndDateChange(v ?? "")} 
        />

        {hasActiveFilter && (
          <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground hover:text-destructive">
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