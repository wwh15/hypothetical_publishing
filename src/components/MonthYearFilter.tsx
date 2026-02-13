"use client";

import React, { useEffect, useState } from "react";
import { CalendarIcon, ChevronLeft, ChevronRight, AlertCircle, ChevronsRight, ChevronsLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MonthYearFilterProps {
  startDate: string; // Format: YYYY-MM
  endDate: string;   // Format: YYYY-MM
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClear: () => void;
  hasActiveFilter: boolean;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

  const handleSelect = (monthIdx: number, year: number, type: "start" | "end") => {
    // Format to YYYY-MM
    const formatted = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
    if (type === "start") onStartDateChange(formatted);
    else onEndDateChange(formatted);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 p-2 bg-background border rounded-lg w-fit">
        <span className="text-sm font-medium px-2">Range:</span>

        <MonthYearPopover 
          label="From" 
          value={startDate} 
          onSelect={(m, y) => handleSelect(m, y, "start")} 
        />
        
        <span className="text-muted-foreground text-sm">to</span>

        <MonthYearPopover 
          label="To" 
          value={endDate} 
          onSelect={(m, y) => handleSelect(m, y, "end")} 
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

function MonthYearPopover({ label, value, onSelect }: { 
  label: string, 
  value: string, 
  onSelect: (m: number, y: number) => void 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  // Derive selected values for highlighting
  const selectedYear = value ? parseInt(value.split("-")[0]) : null;
  const selectedMonth = value ? parseInt(value.split("-")[1]) : null;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      const yearFromValue = value ? parseInt(value.split("-")[0]) : new Date().getFullYear();
      setViewYear(yearFromValue);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("w-[125px] justify-start", !value && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
          {value || label}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-64 p-3" align="start">
        {/* Navigation Header (Decade/Year buttons) */}
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewYear(v => v - 10)}>
              <ChevronsLeft className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewYear(v => v - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <span className="font-bold text-sm tabular-nums">{viewYear}</span>

          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewYear(v => v + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewYear(v => v + 10)}>
              <ChevronsRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Month Grid */}
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((m, i) => (
            <Button
              key={m}
              variant={selectedMonth === i + 1 && selectedYear === viewYear ? "default" : "ghost"}
              className="h-9 text-xs"
              onClick={() => {
                onSelect(i, viewYear);
                setIsOpen(false);
              }}
            >
              {m}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}