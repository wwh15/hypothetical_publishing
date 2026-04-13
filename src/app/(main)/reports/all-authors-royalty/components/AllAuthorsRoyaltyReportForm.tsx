"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getReportYears, QUARTERS } from "../../author-royalty/lib/quarters";

interface AllAuthorsRoyaltyReportFormProps {
  initialStartQuarter: number;
  initialStartYear: number;
  initialEndQuarter: number;
  initialEndYear: number;
}

export function AllAuthorsRoyaltyReportForm({
  initialStartQuarter,
  initialStartYear,
  initialEndQuarter,
  initialEndYear,
}: AllAuthorsRoyaltyReportFormProps) {
  const [startQuarter, setStartQuarter] = useState(initialStartQuarter);
  const [startYear, setStartYear] = useState(initialStartYear);
  const [endQuarter, setEndQuarter] = useState(initialEndQuarter);
  const [endYear, setEndYear] = useState(initialEndYear);

  const years = useMemo(() => getReportYears(), []);

  function handleGenerate() {
    const params = new URLSearchParams({
      startQ: String(startQuarter),
      startY: String(startYear),
      endQ: String(endQuarter),
      endY: String(endYear),
    });
    window.open(
      `/api/reports/all-authors-royalty?${params.toString()}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="all-authors-start-quarter">Start</Label>
          <div className="flex gap-2">
            <select
              id="all-authors-start-quarter"
              value={startQuarter}
              onChange={(e) => setStartQuarter(Number(e.target.value))}
              className="h-9 w-20 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {QUARTERS.map((q) => (
                <option key={q} value={q}>
                  Q{q}
                </option>
              ))}
            </select>
            <select
              id="all-authors-start-year"
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              className="h-9 min-w-[80px] rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="all-authors-end-quarter">End</Label>
          <div className="flex gap-2">
            <select
              id="all-authors-end-quarter"
              value={endQuarter}
              onChange={(e) => setEndQuarter(Number(e.target.value))}
              className="h-9 w-20 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {QUARTERS.map((q) => (
                <option key={q} value={q}>
                  Q{q}
                </option>
              ))}
            </select>
            <select
              id="all-authors-end-year"
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
              className="h-9 min-w-[80px] rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <Button type="button" onClick={handleGenerate}>
        Generate report
      </Button>
    </div>
  );
}
