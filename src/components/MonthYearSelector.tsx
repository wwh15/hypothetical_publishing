"use client";

import React, { useState } from "react";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ChevronsLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type MonthYear = string | null; // "YYYY-MM" or null

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface MonthYearSelectorProps {
  value?: MonthYear; // controlled value
  onChange: (value: MonthYear) => void;
  placeholder?: string; // e.g. "From" or "To"
  ariaLabel?: string;
  min?: MonthYear; // optional bounds, format YYYY-MM
  max?: MonthYear;
  className?: string;
}

export default function MonthYearSelector({
  value = null,
  onChange,
  placeholder = "Select",
  ariaLabel,
  min = null, // lower bound: if null, we use 1000-01 as min
  max = null, // upper bound: if null, we use today's month as max
  className,
}: MonthYearSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());

  // derive selected values
  const parseYear = (v: MonthYear) => {
    if (!v) return null;
    const y = parseInt(v.split("-")[0], 10);
    return Number.isFinite(y) ? y : null;
  };
  const parseMonth = (v: MonthYear) => {
    if (!v) return null;
    const m = parseInt(v.split("-")[1], 10);
    return Number.isFinite(m) ? m : null;
  };

  const selectedYear = parseYear(value);
  const selectedMonth = parseMonth(value);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // if value exists, show its year; otherwise keep current year
      const yearFromValue = selectedYear ?? new Date().getFullYear();
      setViewYear(yearFromValue);
    }
  };

  const format = (year: number, monthIdx: number) =>
    `${year}-${String(monthIdx + 1).padStart(2, "0")}`;

  // Today's YYYY-MM (used as default max)
  const today = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1; // getMonth is 0-based
    return `${y}-${String(m).padStart(2, "0")}`;
  })();

  // Normalize effective max/min (use provided prop if present; otherwise fallback)
  const effectiveMax = max ?? today;
  const effectiveMin = min ?? "1000-01";

  // min/max checking using YYYY-MM lexicographic comparison
  const isDisabledCandidate = (candidate: string) => {
    // If there's an explicit min and candidate is less than min -> disabled
    if (effectiveMin && candidate < effectiveMin) return true;
    // If there's an explicit max (or defaulted to today) and candidate > max -> disabled
    if (effectiveMax && candidate > effectiveMax) return true;
    return false;
  };

  const handleSelect = (monthIdx: number, year: number) => {
    const formatted = format(year, monthIdx);
    // if formatted is out of bounds, do nothing
    if (isDisabledCandidate(formatted)) return;
    onChange(formatted);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={"default"}
          // Change w-[125px] to w-fit or w-auto
          className={cn(
            "w-fit min-w-[120px] justify-start px-3",
            !value && "text-muted-foreground",
            className
          )}
          aria-label={ariaLabel || placeholder}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{value || placeholder}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-3" align="start">
        {/* Navigation Header (Decade/Year buttons) */}
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <div className="flex gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewYear((v) => v - 10)}
            >
              <ChevronsLeft className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewYear((v) => v - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <span className="font-bold text-sm tabular-nums">{viewYear}</span>

          <div className="flex gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewYear((v) => v + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewYear((v) => v + 10)}
            >
              <ChevronsRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Month Grid */}
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((m, i) => {
            const candidate = format(viewYear, i);
            const disabled = isDisabledCandidate(candidate);
            const isSelected =
              selectedMonth === i + 1 && selectedYear === viewYear;

            return (
              <Button
                key={`${viewYear}-${i}`}
                variant={isSelected ? "default" : "ghost"}
                className={cn(
                  "h-9 text-xs",
                  disabled && "opacity-50 pointer-events-none"
                )}
                onClick={() => handleSelect(i, viewYear)}
                aria-pressed={isSelected}
                aria-disabled={disabled}
              >
                {m}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
