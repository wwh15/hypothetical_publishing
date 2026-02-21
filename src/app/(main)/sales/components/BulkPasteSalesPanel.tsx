"use client";

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
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function BulkPasteSalesPanel({
  onAddRecord,
  booksData,
}: BulkPasteSalesPanelProps) {
  // Local useState
  const [text, setText] = useState("");
  const [extraBooks, setExtraBooks] = useState<BookListItem[]>([]);

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

    // Basic validation
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a CSV file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setText(content); // This fills your Textarea automatically!
    };
    reader.readAsText(file);

    // Reset the input value so the same file can be uploaded twice if needed
    e.target.value = "";
  };

  const handleClear = useCallback(() => {
    setExtraBooks([]);
    setText("");
    clearPreview();
  }, [clearPreview]);

  const handleAddValidRows = useCallback(() => {
    if (missingBookRows.length > 0) {
      alert(
        `Cannot submit: ${missingBookRows.length} book(s) not found. Please add the missing books to the database first.`
      );
      return;
    }
    submitFromRows(previewRows);
    clearPreview();
    setText("");
  }, [missingBookRows.length, previewRows, submitFromRows, clearPreview]);

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
        <div className="space-y-2">
          <Label htmlFor="bulk-text">Step 1: Provide Data</Label>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm mb-6 pb-2">
          <div className="font-medium mb-2">Required CSV Format/Headers</div>
          <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
            ISBN,Title,Author,Format,Gross Qty,Returned Qty,Net Qty,Net
            Compensation,Sales Market
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
          <Label htmlFor="bulk-text">
            Parsed data will appear here. Feel free to edit or add any new data.
          </Label>
          <Textarea
            id="bulk-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`ISBN,Title,Author,Format,Gross Qty,Returned Qty,Net Qty,Net Compensation,Sales Market`}
            className="font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bulk-text">Step 2: Preview Data</Label>
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
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-semibold">
                            Book: {row.title} | Author: {row.author}
                          </span>
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
