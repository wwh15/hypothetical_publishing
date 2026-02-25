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
    
    // File Type Check
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a CSV file.");
      return;
    }
  
    const reader = new FileReader();
    reader.onload = () => {
      // Account for Byte Order Mark
      const content = (reader.result as string).replace(/^\uFEFF/, "");
      
      const parseResult = Papa.parse(content, { skipEmptyLines: true });
      const dataRows = parseResult.data as string[][];
      if (dataRows.length === 0) return;
  
      // 1. Validate Headers
      const headers = dataRows[0].map((h) => h.trim());
      const expectedHeaders = ["ISBN", "Title", "Author", "Format", "Gross Qty", "Returned Qty", "Net Qty", "Net Compensation", "Sales Market"];
      
      if (!expectedHeaders.every((h, i) => headers[i] === h)) {
        alert("CSV Error: Invalid headers or incorrect column order.");
        return;
      }
  
      // ERROR COLLECTION
      const errors: string[] = [];
      const validRowsForState: string[][] = [];
  
      for (let i = 1; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 1;
  
        // 2. IGNORE BLANK & TOTAL ROWS (Per Requirement 3.5.3.6)
        const isBlank = row.every(cell => !cell || cell.trim() === "");
        const isTotalRow = !row[0] || row[0].trim() === ""; 
        if (isBlank || isTotalRow) continue;
  
        const [isbn, title, author, format, gross, returned, net, comp, market] = row;
  
        // 3. RUN VALIDATIONS
        const vISBN = validateISBN(isbn);
        const vTitle = validateRequiredString(title, "Title");
        const vAuthor = validateRequiredString(author, "Author");
        const vFormat = validateSaleFormat(format);
        const vGross = validateQuantity(gross);
        const vReturned = validateReturnedQuantity(returned);
        const vNet = validateQuantity(net);
        const vComp = validateCurrency(comp);
        const vMarket = validateRequiredString(market, "Market");
  
        // 4. COLLECT ERRORS (Instead of Alerting)
        const rowErrors: string[] = [];
        if (!vISBN.success) rowErrors.push(vISBN.error);
        if (!vTitle.success) rowErrors.push(vTitle.error);
        if (!vAuthor.success) rowErrors.push(vAuthor.error);
        if (!vFormat.success) rowErrors.push(vFormat.error);
        if (!vGross.success) rowErrors.push(`(Gross Qty) ${vGross.error}`);
        if (!vReturned.success) rowErrors.push(vReturned.error);
        if (!vNet.success) rowErrors.push(`(Net Qty) ${vNet.error}`);
        if (!vComp.success) rowErrors.push(`(Net Compensation) ${vComp.error}`);
        if (!vMarket.success) rowErrors.push(vMarket.error);
  
        // Math Logic Checks (Only if quantities parsed correctly)
        if (vGross.success && vNet.success) {
          if (!validateEquals(vNet.data, vGross.data)) rowErrors.push(`Net Qty (${vNet.data}) must equal Gross Qty (${vGross.data})`);
        }
  
        if (rowErrors.length > 0) {
          errors.push(`Line ${rowNum}: ${rowErrors.join(", ")}`);
        } else {
          validRowsForState.push(row);
        }
      }
  
      // 5. FINAL REPORTING
      if (errors.length > 0) {
        // You can either alert this join, or better yet, set it to a state variable 
        // called 'importErrors' and display it in a Red Box in your UI.
        alert(`Import Failed! Please fix the following errors:\n\n${errors.slice(0, 10).join("\n")}${errors.length > 10 ? `\n...and ${errors.length - 10} more` : ""}`);
      } else {
        // SUCCESS!
        setText(content);
        setFileName(file.name);
      }
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
