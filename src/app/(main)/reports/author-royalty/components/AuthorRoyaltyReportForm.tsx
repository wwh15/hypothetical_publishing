"use client";

import { useMemo, useState } from "react";
import { AuthorSelectBox } from "@/app/(main)/authors/components/AuthorSelectBox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getReportYears,
  QUARTERS,
} from "../lib/quarters";
import { Author } from "@prisma/client";

interface AuthorRoyaltyReportFormProps {
  authors?: Author[];
  initialAuthorId: number | null;
  initialStartQuarter: number;
  initialStartYear: number;
  initialEndQuarter: number;
  initialEndYear: number;
  hideAuthorSelect?: boolean;
}

export function AuthorRoyaltyReportForm({
  authors = [],
  initialAuthorId,
  initialStartQuarter,
  initialStartYear,
  initialEndQuarter,
  initialEndYear,
  hideAuthorSelect=false
}: AuthorRoyaltyReportFormProps) {
  const [authorId, setAuthorId] = useState<number | null>(initialAuthorId);
  const [startQuarter, setStartQuarter] = useState(initialStartQuarter);
  const [startYear, setStartYear] = useState(initialStartYear);
  const [endQuarter, setEndQuarter] = useState(initialEndQuarter);
  const [endYear, setEndYear] = useState(initialEndYear);

  const years = useMemo(() => getReportYears(), []);
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    if (authorId == null) {
      setError("Please select an author.");
      return;
    }
    const params = new URLSearchParams({
      authorId: String(authorId),
      startQ: String(startQuarter),
      startY: String(startYear),
      endQ: String(endQuarter),
      endY: String(endYear),
    });
    window.open(`/api/reports/author-royalty?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6 max-w-xl">
      {!hideAuthorSelect && (
      <div className="space-y-2">
        <Label htmlFor="author-select">Author</Label>
        <AuthorSelectBox
          authors={authors || []}
          selectedAuthorId={authorId}
          onSelect={setAuthorId}
        />
      </div>
    )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-quarter">Start</Label>
          <div className="flex gap-2">
            <select
              id="start-quarter"
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
              id="start-year"
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
          <Label htmlFor="end-quarter">End</Label>
          <div className="flex gap-2">
            <select
              id="end-quarter"
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
              id="end-year"
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

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="button" onClick={handleGenerate}>
        Generate report
      </Button>
    </div>
  );
}
