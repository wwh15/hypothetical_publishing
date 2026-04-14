"use client";

import Papa from "papaparse";
import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ParsedSaleRow } from "../hooks/useBulkSubmit";
import { useBulkPasteSubmit } from "../hooks/useBulkSubmit";
import { PendingSaleItem } from "@/lib/data/records";
import { BookListItem } from "@/lib/data/books";
import { AlertCircle, CheckCircle2, Import } from "lucide-react";
import MonthYearSelector from "@/components/MonthYearSelector";
import {
  normalizeISBN,
  normalizeASIN,
  validateCurrency,
  validateISBN,
  validateQuantity,
  validateRequiredString,
  validateReturnedQuantity,
  validateSaleFormat,
  ValidationResult,
} from "@/lib/validation";

// Examples: 01-2026,9781234567890,120,4125.50 | 01-2026,9780987654321,80,2600

interface IngramSparkImportProps {
  onAddRecord: (record: PendingSaleItem) => void;
  booksData: BookListItem[];
  onViewPendingRecords?: () => void;
}

// Create a map that maps isbn10/isbn13 to BookListItem objects
function buildIsbnLookup(booksData: BookListItem[]): Map<string, BookListItem> {
  const map = new Map<string, BookListItem>();

  for (const book of [...booksData]) {
    const isbn13 = normalizeISBN(book.isbn13 ?? null);
    const isbn10 = normalizeISBN(book.isbn10 ?? null);
    const asin = normalizeASIN(book.asin ?? null);
    if (isbn13) map.set(isbn13, book);
    if (isbn10) map.set(isbn10, book);
    if (asin) map.set(asin, book);
  }
  return map;
}

export default function IngramSparkImport({
  onAddRecord,
  booksData,
  onViewPendingRecords,
}: IngramSparkImportProps) {
  // Local useState
  const [submissionErrors, setSubmissionErrors] = useState<
    Array<{ line: number; errors: Record<string, string> }>
  >([]);
  const [selectedDate, setSelectedDate] = useState({ year: "", month: "" });
  const [dateError, setDateError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importedRowCount, setImportedRowCount] = useState(0);

  // Memoization; all recomputes arrays if data changes
  const allBooks = useMemo(() => [...booksData], [booksData]);

  const isbnLookup = useMemo(
    () => buildIsbnLookup(booksData),
    [booksData] // Only rebuild if books change
  );

  // Hook
  const { submitFromRows } = useBulkPasteSubmit(allBooks, onAddRecord);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear previous state immediately to avoid UI flickering
    setFileName(null);
    setSubmissionErrors([]);
    setImportedRowCount(0);

    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedDate.year) {
      setDateError("Please select a sales period before importing.");
      e.target.value = "";
      return;
    }

    if (!file.name.endsWith(".csv")) {
      alert("Please import a CSV file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = (reader.result as string).replace(/^\uFEFF/, "");
      const parseResult = Papa.parse(content, { skipEmptyLines: true });
      const dataRows = parseResult.data as string[][];

      if (dataRows.length === 0) return;

      // 1. Header Validation
      const headers = dataRows[0].map((h) => h.trim());
      const expectedHeaders = [
        "ISBN",
        "Title",
        "Author",
        "Format",
        "Gross Qty",
        "Returned Qty",
        "Net Qty",
        "Net Compensation",
        "Sales Market",
      ];

      if (!expectedHeaders.every((h, i) => headers[i] === h)) {
        setSubmissionErrors([
          {
            line: 1,
            errors: {
              base: "CSV Error: Invalid headers or incorrect column order.",
            },
          },
        ]);
        setFileName(file.name); // We set this so the error box actually shows up
        return;
      }

      const validRows: ParsedSaleRow[] = [];
      const errors: string[] = [];

      // 2. Data Validation Loop
      for (let i = 1; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 1;

        if (row.every((cell) => !cell || cell.trim() === "") || !row[0]?.trim())
          continue;

        const rowErrors: string[] = [];
        const schema: [
          number,
          keyof ParsedSaleRow,
          (val: string) => ValidationResult<number> | ValidationResult<string>,
          string?
        ][] = [
          [0, "isbn", validateISBN],
          [1, "title", (v) => validateRequiredString(v, "Title")],
          [2, "author", (v) => validateRequiredString(v, "Author")],
          [3, "format", validateSaleFormat],
          [4, "grossQuantity", validateQuantity, "Gross Qty"],
          [6, "netQuantity", validateQuantity, "Net Qty"],
          [7, "netCompensation", validateCurrency, "Net Compensation"],
          [8, "salesMarket", (v) => validateRequiredString(v, "Market")],
        ];

        const parsedSaleRow: ParsedSaleRow = {
          line: rowNum,
          isbn: "",
          title: "",
          author: "",
          format: "Paperback",
          grossQuantity: 0,
          netQuantity: 0,
          netCompensation: 0,
          salesMarket: "",
          source: "DISTRIBUTOR",
          raw: row.join(","),
        };

        // Check ISBN exists in database
        const rawIsbn = row[0] ?? "";
        const vISBN = validateISBN(rawIsbn); // Check syntax for valid ISBN format

        if (vISBN.success) {
          const normalizedIsbn = vISBN.data;
          parsedSaleRow.isbn = normalizedIsbn;

          // Format is perfect, but it's not in our database
          if (!isbnLookup.has(normalizedIsbn)) {
            rowErrors.push(
              `ISBN ${rawIsbn} not found in database. Please add this book in Books Page before importing sales.`
            );
          }
        }

        schema.forEach(([index, key, validate, label]) => {
          const result = validate(row[index] || "");
          if (!result.success) {
            rowErrors.push(
              label ? `Field [${label}] ${result.error}` : result.error
            );
          } else {
            (parsedSaleRow as Record<string, string | number>)[key] =
              result.data;
          }
        });

        const vReturned = validateReturnedQuantity(row[5] || "");
        if (!vReturned.success) rowErrors.push(vReturned.error);

        if (parsedSaleRow.grossQuantity !== parsedSaleRow.netQuantity) {
          rowErrors.push(
            `Net Qty (${parsedSaleRow.netQuantity}) must equal Gross Qty (${parsedSaleRow.grossQuantity})`
          );
        }

        if (rowErrors.length > 0) {
          errors.push(`Line ${rowNum}: ${rowErrors.join(" | ")}`);
        } else {
          validRows.push(parsedSaleRow);
        }
      }

      // 3. Final Reporting (The "Strict" Way)
      if (errors.length > 0) {
        setSubmissionErrors(
          errors.map((err) => ({
            line: parseInt(err.split(":")[0].replace("Line ", "")),
            errors: { base: err.split(": ")[1] },
          }))
        );
        setFileName(file.name); // Set this so the error report displays
      } else {
        // PURE SUCCESS
        submitFromRows(validRows, selectedDate, file.name);
        setSubmissionErrors([]);
        setImportedRowCount(validRows.length);
        setFileName(file.name);
      }
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Ingram Spark Import</CardTitle>
        <CardDescription className="border-b pb-2">
          Import a CSV to add sales records to the Pending Records table at the
          bottom of the page.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Step 1: Date Selection - MOVED UP for visibility */}
        <div className="space-y-3 mb-6 border-b pb-2">
          <Label className="text-base font-bold">
            Step 1: Select Sales Reporting Period
          </Label>
          <div className="max-w-xs">
            <MonthYearSelector
              value={
                selectedDate.year
                  ? `${selectedDate.year}-${selectedDate.month}`
                  : ""
              }
              onChange={(v) => {
                setDateError(null);
                if (!v) {
                  setSelectedDate({ year: "", month: "" });
                  return;
                }
                const [y, m] = v.split("-");
                setSelectedDate({ year: y, month: m });
              }}
              placeholder="Select month & year"
            />
            {dateError && (
              <p className="mt-2 text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <strong>{dateError}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Step 2: Data Input */}
        <div className="space-y-2">
          <Label className="text-base font-bold">
            Step 2: Provide Ingram Spark Data
          </Label>
        </div>

        <div className="my-6 border-l-2 border-slate-950 pl-4 py-1">
          <p className="text-sm font-semibold text-foreground mb-1">
            Required CSV Headers
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed italic">
            ISBN, Title, Author, Format, Gross Qty, Returned Qty, Net Qty, Net
            Compensation, Sales Market
          </p>
        </div>

        <div className="flex items-center gap-2 mb-6 border-b pb-2">
          <Label
            htmlFor="csv-import"
            className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <Import className="h-4 w-4 " />
            Import Ingram Spark CSV
            <input
              id="csv-import"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </Label>
        </div>

        {/* Final Status Report: Error or Success */}
        {fileName &&
          (submissionErrors.length > 0 || dateError ? (
            <div>
              <div className="space-y-2"></div>
              <div className="mt-4 p-4 rounded-md border-2 border-destructive bg-destructive/5 space-y-3">
                {/* Specific Date Error Block */}
                {dateError && (
                  <div className="flex items-start gap-2 text-destructive font-bold text-sm border-b border-destructive/20 pb-2">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <div>
                      <p>Missing Reporting Period</p>
                      <p className="text-xs font-normal opacity-90">
                        Please complete Step 1 to process this file.
                      </p>
                    </div>
                  </div>
                )}

                {/* CSV Row Errors Block */}
                {submissionErrors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-destructive text-sm font-semibold">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Import failed for &quot;{fileName}&quot;
                    </div>
                    <ul className="space-y-1 list-disc list-inside">
                      {submissionErrors.map((err, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-destructive list-none mb-3"
                        >
                          <div className="flex flex-col gap-2">
                            {/* 1. Show the Line Number */}
                            <span className="font-bold">Line {err.line}:</span>

                            {/* 2. Split the 'base' string and map through each individual error */}
                            <div className="flex flex-wrap gap-2">
                              {err.errors.base
                                .split(" | ")
                                .map((errorMessage, errorIdx) => (
                                  <span
                                    key={errorIdx}
                                    className="bg-destructive/10 px-2 py-1 rounded border border-destructive/20"
                                  >
                                    {errorMessage}
                                  </span>
                                ))}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3 rounded-md border-2 border-green-500 bg-green-50 p-4 animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                File &quot;{fileName}&quot; imported successfully
              </div>
              <p className="text-sm text-green-800 dark:text-green-300/90">
                Import complete. Review these rows before saving.
              </p>
              {importedRowCount > 0 && onViewPendingRecords && (
                <Button
                  type="button"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => onViewPendingRecords()}
                >
                  View Pending Records
                </Button>
              )}
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
