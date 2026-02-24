"use client";

import Papa from "papaparse";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBulkPastePreview } from "../hooks/useBulkPastePreview";
import { useBulkPasteSubmit } from "../hooks/useBulkPasteSubmit";
import { PendingSaleItem } from "@/lib/data/records";
import { BookListItem } from "@/lib/data/books";
import AddBookModal from "./AddBookModal";
import { AlertCircle, UploadCloud, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import MonthYearSelector from "@/components/MonthYearSelector";

// Examples: 01-2026,9781234567890,120,4125.50 | 01-2026,9780987654321,80,2600

interface BulkPasteSalesPanelProps {
  onAddRecord: (record: PendingSaleItem) => void;
  booksData: BookListItem[];
}

// Create a map that maps isbn10/isbn13 to BookListItem objects
function buildIsbnLookup(
  booksData: BookListItem[],
  extraBooks: BookListItem[]
): Map<string, BookListItem> {
  const map = new Map<string, BookListItem>();

  // Removes all characters that are NOT digits from ISBN
  const normalize = (isbn?: string | null) =>
    isbn ? isbn.replace(/\D/g, "") : null;

  for (const book of [...booksData, ...extraBooks]) {
    const isbn13 = normalize(book.isbn13);
    const isbn10 = normalize(book.isbn10);
    if (isbn13) map.set(isbn13, book);
    if (isbn10) map.set(isbn10, book);
  }
  return map;
}

/**
 * Normalizes an author name to a canonical string for comparison.
 * - Lowercases everything
 * - Removes common titles/suffixes (PhD, Dr, etc.)
 * - Removes all punctuation
 * - Sorts name parts alphabetically (handles "Last, First" vs "First Last")
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return "";

  return (
    name
      .toLowerCase()
      .replace(/\b(phd|dr|md|jr|sr|iii|ii|mfa|prof|mr|ms|mrs)\b\.?/g, "") // 1. Remove common titles and academic suffixes (including those with dots)
      .replace(/[^a-z0-9\s]/g, "")  // 2. Remove all non-alphanumeric characters except spaces
      .split(/\s+/) // 3. Split into individual words
      .filter((word) => word.length > 0) // 4. Remove empty strings (caused by double spaces or trailing punctuation)
      .sort() // 5. Sort alphabetically so word order doesn't matter
      .join(" ") // 6. Join back into a single string
  );
}

export default function BulkPasteSalesPanel({
  onAddRecord,
  booksData,
}: BulkPasteSalesPanelProps) {
  // Local useState
  const [text, setText] = useState("");
  const [extraBooks, setExtraBooks] = useState<BookListItem[]>([]);
  const [submissionErrors, setSubmissionErrors] = useState<Array<{ line: number; errors: Record<string, string> }>>([]);
  const [selectedDate, setSelectedDate] = useState({ year: "", month: "" });
  const [dateError, setDateError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Hook
  const { previewRows, invalidRows, handlePreview, clearPreview } =
    useBulkPastePreview();

  // Memoization; all recomputes arrays if data changes
  const allBooks = useMemo(
    () => [...booksData, ...extraBooks],
    [booksData, extraBooks]
  );

  // Hook
  const { submitFromRows } = useBulkPasteSubmit(allBooks, onAddRecord);

  // Callback function that passes through AddModal.tsx into BookForm.tsx
  const handleBookCreated = useCallback((book: BookListItem) => {
    setExtraBooks((prev) => [...prev, book]);
  }, []);

  // Memoization
  const isbnLookup = useMemo(
    () => buildIsbnLookup(booksData, extraBooks),
    [booksData, extraBooks]
  );

  // Add final royalty and book to preview rows
  const rowsWithRoyalty = useMemo(() => {
    return previewRows.map((row) => {
      const book = isbnLookup.get(row.isbn);
      const rate = book
        ? row.source === "HAND_SOLD"
          ? book.handSoldRoyaltyRate
          : book.distRoyaltyRate
        : 0;
      const finalRoyalty = book
        ? (row.netCompensation * rate) / 100
        : undefined;

      return {
        ...row,
        book,
        finalRoyalty,
      };
    });
  }, [previewRows, isbnLookup]);

  const missingBookRows = useMemo(
    () => rowsWithRoyalty.filter((row) => !row.book),
    [rowsWithRoyalty]
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    // 1. File Type Check
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a CSV file.");
      return;
    }
  
    const reader = new FileReader();
    reader.onload = () => {
      let content = reader.result as string;

      // REMOVE THE BOM: This regex identifies the hidden BOM character 
      // at the very beginning of the string and removes it.
      content = content.replace(/^\uFEFF/, "");
      
      // Use PapaParse to split rows correctly (handles commas inside quotes)
      const parseResult = Papa.parse(content, {
        skipEmptyLines: true, // Replaces your .filter check
      });
  
      const dataRows = parseResult.data as string[][];
      if (dataRows.length === 0) return;
  
      const headers = dataRows[0].map((h) => h.trim());
  
      // 2. Validate Headers
      const expectedHeaders = ["ISBN", "Title", "Author", "Format", "Gross Qty", "Returned Qty", "Net Qty", "Net Compensation", "Sales Market"];
      const hasValidHeaders = expectedHeaders.every((h, i) => headers[i] === h);
  
      if (!hasValidHeaders) {
        alert("CSV Error: Invalid headers or incorrect column order. Required format is: ISBN,Title,Author,Format,Gross Qty,Returned Qty,Net Qty,Net Compensation,Sales Market");
        return;
      }
  
      // Process Data Rows (starting from index 1)
      for (let i = 1; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 1;
  
        // Now "author" will correctly contain "Alice Johnson, Bob Smith" as one piece!
        const [isbn, title, author, format, grossStr, returnedStr, netStr, netCompStr, market] = row;
  
        // 3. Type Validation (Number conversion)
        const gross = Number(grossStr);
        const returned = Number(returnedStr);
        const net = Number(netStr);
        const netComp = Number(netCompStr);
  
        if (isNaN(gross)) {
          alert(`Error Row ${rowNum}: Gross Qty must be a number. Found: "${grossStr}"`);
          return;
        }
  
        if (isNaN(returned)) {
          alert(`Error Row ${rowNum}: Returned Qty must be a number. Found: "${returnedStr}"`);
          return;
        }
  
        if (isNaN(net)) {
          alert(`Error Row ${rowNum}: Net Qty must be a number. Found: "${netStr}"`);
          return;
        }
  
        if (isNaN(netComp)) {
          alert(`Error Row ${rowNum}: Net Compensation must be a number. Found: "${netCompStr}"`);
          return;
        }
  
        // 5. Validate value is non-negative
        if (gross <= 0) {
          alert(`Error Row ${rowNum}: Gross Qty must be greater than 0.`);
          return;
        }
  
        if (net <= 0) {
          alert(`Error Row ${rowNum}: Net Qty must be greater than  0.`);
          return;
        }
  
        if (netComp <= 0) {
          alert(`Error Row ${rowNum}: Net Compensation must be greater than 0.`);
          return;
        }
  
        // Validate that Net Qty is a whole number
        if (!Number.isInteger(net)) {
          alert(`Row ${rowNum}: Net Qty must be a whole number (no decimals).`);
          return;
        }
  
        // 6. Validate Returned Qty is 0
        if (returned !== 0) {
          alert(`Error Row ${rowNum}: Returned Qty must be 0.`);
          return;
        }
  
        // 7. Validate Net Qty must equal Gross Qty
        if (net !== gross) {
          alert(`Error Row ${rowNum}: Net Qty (${net}) must equal Gross Qty (${gross}).`);
          return;
        }
  
        // 8. ISBN Validation
        const cleanISBN = isbn?.trim().replace(/[-\s]/g, "");
        if (!cleanISBN) {
          alert(`Error Row ${rowNum}: Missing ISBN.`);
          return;
        }
  
        if (cleanISBN.length !== 10 && cleanISBN.length !== 13) {
          alert(`Error Row ${rowNum}: Invalid ISBN format. ISBN must be 10 digits or 13 digits.`);
          return;
        }
  
        // 9. Type Validate (Strings and Enums)
        const cleanFormat = format?.trim();
        if (cleanFormat !== "Paperback" && cleanFormat !== "Hardcover") {
          alert(`Error Row ${rowNum}: Format must be 'Paperback' or 'Hardcover'. Found: '${cleanFormat}'`);
          return;
        }
  
        if (!title || title.trim() === "") {
          alert(`Error Row ${rowNum}: Title is required.`);
          return;
        }
  
        if (!author || author.trim() === "") {
          alert(`Error Row ${rowNum}: Author is required.`);
          return;
        }
  
        if (!market || market.trim() === "") {
          alert(`Error Row ${rowNum}: Sales Market is required.`);
          return;
        }
      }
  
      // Success!
      setText(content);
      setFileName(file.name);
    };
  
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClear = useCallback(() => {
    setExtraBooks([]);
    setText("");
    clearPreview();
  }, [clearPreview]);

  const handleAddValidRows = useCallback(() => {
    // 1. Check for missing books
    if (missingBookRows.length > 0) {
      alert(
        `Cannot add records: ${missingBookRows.length} book(s) not found. Please add the missing books to the database first.`
      );
      return;
    }

    // 2. Check that a date is selected
    if (!selectedDate.year || !selectedDate.month) {
      alert("Please select a sales month and year before attempting to add records.");
      return;
    }

    // 3. Pass previewRows and capture errors if any
    const errors = submitFromRows(previewRows, selectedDate, fileName ?? undefined);

    if (errors.length > 0) {
      setSubmissionErrors(errors);
      return;
    }

    // 4. Reset UI state
    clearPreview();
    setText("");
  }, [
    missingBookRows.length,
    previewRows,
    selectedDate,
    fileName,
    submitFromRows,
    clearPreview,
    setText,
  ]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Bulk Import Sales Records</CardTitle>
        <CardDescription className="border-b pb-2">
          Upload a CSV or paste raw data. Review the preview below before adding
          items to the <strong>Pending Records</strong> table.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Step 1: Date Selection - MOVED UP for visibility */}
        <div className="space-y-3 mb-6 border-b pb-2">
          <Label className="text-base font-bold text-blue-700 dark:text-blue-400">
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
              <p className="mt-2 text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {dateError}
              </p>
            )}
          </div>
        </div>

        {/* Step 2: Data Input */}
        <div className="space-y-2">
          <Label className="text-base font-bold">
            Step 2: Provide Ingram Data
          </Label>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm mb-6 pb-2">
          <div className="font-medium mb-2">Required CSV Format/Headers</div>
          <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
            ISBN,Title,Author,Format,Gross Qty,Returned Qty,Net Qty,Net Compensation,Sales Market
          </pre>
        </div>

        <div className="flex items-center gap-2">
          <Label
            htmlFor="csv-upload"
            className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <UploadCloud className="h-4 w-4 " />
            Upload Ingram CSV
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </Label>
        </div>

        <div className="space-y-2 mb-6 border-b pb-2">
          <Textarea
            id="bulk-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Uploaded data will appear here`}
            className="font-mono"
          />
        </div>

        {/* Step 3: Preview */}
        <div className="space-y-2">
          <Label className="text-base font-bold">
            Step 3: Preview & Validate
          </Label>{" "}
        </div>

        <div className="rounded-md border border-dashed bg-muted/20 px-3 py-3 text-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>
              {previewRows.length} valid{" "}
              {previewRows.length === 1 ? "row" : "rows"}
            </span>
            <span className={invalidRows.length ? "text-destructive" : ""}>
              {invalidRows.length} invalid
            </span>
          </div>
          
          {/* Preview Rows */}
          {previewRows.length > 0 ? (
            <div className="space-y-2 font-mono">
              {rowsWithRoyalty.map((row) => {
                const isMissingBook = !row.book;

                return (
                  <div
                    key={`${row.line}-${row.isbn}-${row.grossQuantity}`}
                    className={cn(
                      "rounded border px-4 py-3 text-xs flex flex-col gap-2 transition-colors",
                      isMissingBook
                        ? "bg-destructive/5 border-destructive/40"
                        : "bg-background border-border"
                    )}
                  >
                    {isMissingBook ? (
                      /* ERROR STATE: Guide the user to the Books page */
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-destructive">
                            <span className="font-bold text-sm">
                              ⚠️ ISBN NOT FOUND
                            </span>
                            <span className="bg-destructive/10 px-2 py-0.5 rounded font-mono select-all">
                              {row.isbn}
                            </span>
                          </div>
                          {/* Visual nudge: Give them a link to open in a new tab */}
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-blue-600 underline"
                            onClick={() => window.open("/books/add", "_blank")}
                          >
                            Go to Books Page
                          </Button>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          Line {row.line}: This ISBN is missing from your
                          records. <strong>Copy the ISBN</strong> above, add the
                          book to your inventory, then re-run this preview.
                        </p>
                      </div>
                    ) : (
                      /* SUCCESS STATE: Transformed Data (Same as before) */
                      <>
                        <div className="flex flex-col gap-1">

                          {/* Only show warning if the normalized values are actually different */}
                          {normalizeName(row.book?.author ?? "") !==
                              normalizeName(row.author) && (
                              <span className="text-[10px] text-muted-foreground italic">
                                ⚠️ (Database detected existing author for ISBN: Database author &quot;{row.book?.author}&quot; overrides CSV
                                  &quot;{row.author}&quot;)
                              </span>
                            )}

                          {/* If titles are totally different, that's a bigger red flag */}
                          {row.book?.title.toLowerCase() !==
                            row.title.toLowerCase() && (
                            <span className="text-[10px] text-muted-foreground italic">
                              ⚠️ (Database detected existing title for ISBN: Database title &quot;{row.book?.title}&quot; overrides CSV
                                &quot;{row.title}&quot;)
                            </span>
                          )}
                          
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-semibold text-sm">
                              Book: {row.book?.title} |
                            </span>
                            <span className="font-semibold text-sm">
                              Author: {row.book?.author}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 font-mono">
                          <span className="">Qty: {row.grossQuantity} |</span>
                          <span className="text-xs">
                            Source:{" "}
                            {row.source === "HAND_SOLD"
                              ? "Hand Sold"
                              : "Distributor"}{" "}
                            |
                          </span>
                          <span>
                            Publisher Revenue ($):{" "}
                            {row.netCompensation.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            |
                          </span>
                          <span className="text-xs">Author Paid: No |</span>
                          {row.finalRoyalty !== undefined && (
                            <span>
                              Author Royalty ($):{" "}
                              {row.finalRoyalty.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          )}
                          {!row.book && (
                            <div className="flex items-center gap-2">
                              <span className="text-destructive font-semibold">
                                ⚠️ Book not found.
                              </span>
                              <AddBookModal
                                initialIsbn={row.isbn}
                                inPreview
                                onBookCreated={handleBookCreated}
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-3 text-muted-foreground">
              <p>
                Click the <strong>Preview</strong> button below to validate and
                transform your data into the format below:
              </p>
              <p>
                Source, Date, Book Title, Qty, Revenue, Royalty, Paid (Y/N),
                Comment
              </p>
            </div>
          )}

          {/* Final Submission Errors */}
          {submissionErrors.length > 0 && (
            <div className="mt-4 p-4 rounded-md border-2 border-destructive bg-destructive/5 space-y-2">
              <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                <XCircle className="h-4 w-4" />
                Validation failed for {submissionErrors.length} row(s)
              </div>
              <ul className="space-y-1 list-disc list-inside">
                {submissionErrors.map((err, idx) => (
                  <li key={idx} className="text-xs text-destructive">
                    <strong>Line {err.line}:</strong> {Object.values(err.errors).join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Invalid Row Errors Display */}
          {invalidRows.length > 0 && (
            <div className="mt-3 space-y-1 rounded border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive text-xs">
              {invalidRows.map((err) => (
                <div key={err.line}>
                  Line {err.line}: {err.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          variant="destructive"
          onClick={handleClear}
          disabled={!text.trim()}
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!text.trim()}
          onClick={() => handlePreview(text)}
        >
          Preview
        </Button>
        <Button
          type="button"
          onClick={handleAddValidRows}
          disabled={previewRows.length === 0 || missingBookRows.length > 0}
        >
          Add valid rows
        </Button>
        <AddBookModal />
      </CardFooter>
    </Card>
  );
}
