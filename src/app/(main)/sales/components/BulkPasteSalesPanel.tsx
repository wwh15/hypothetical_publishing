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
      const computedRoyalty = book
        ? (row.revenue * book.defaultRoyaltyRate) / 100
        : undefined;
      const providedRoyalty = row.authorRoyalty;
      const finalRoyalty = providedRoyalty ?? computedRoyalty;
      const isOverridden =
        providedRoyalty !== undefined &&
        computedRoyalty !== undefined &&
        Math.abs(providedRoyalty - computedRoyalty) > 0.01;

      return {
        ...row,
        book,
        computedRoyalty,
        finalRoyalty,
        isOverridden,
      };
    });
  }, [previewRows, isbnLookup]);

  const missingBookRows = useMemo(
    () => rowsWithRoyalty.filter((row) => !row.book),
    [rowsWithRoyalty]
  );

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
        <CardTitle>Bulk paste sales records</CardTitle>
        <CardDescription>
          Paste multiple records at once (one per line). We’ll parse and
          validate these before adding them to Pending Records.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="font-medium mb-2">Expected format</div>
          <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
            MM-YYYY,ISBN,Quantity,PublisherRevenue,AuthorRoyalty (optional)
          </pre>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bulk-text">Paste records</Label>
          <Textarea
            id="bulk-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`01-2026,9781234567890,120,4125.50\n01-2026,9780987654321,80,2600`}
            className="font-mono"
          />
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
            <div className="space-y-1">
              {rowsWithRoyalty.map((row) => (
                <div
                  key={`${row.line}-${row.isbn}-${row.quantity}`}
                  className={`rounded border px-3 py-2 text-xs flex flex-col gap-1 ${
                    !row.book
                      ? "bg-destructive/5 border-destructive/30"
                      : "bg-background"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold">
                      {row.book ? row.book.title : "Unknown title"}
                    </span>
                    <span className="text-muted-foreground">
                      {row.book ? row.book.authors : "Unknown author(s)"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <span className="font-mono text-muted-foreground">
                      ISBN: {row.isbn}
                    </span>
                    <span>
                      Date: {row.month}-{row.year}
                    </span>
                    <span>Qty: {row.quantity}</span>
                    <span className="font-mono">
                      Rev:{" "}
                      {row.revenue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    {row.finalRoyalty !== undefined && (
                      <span className="font-mono">
                        Royalty:{" "}
                        {row.finalRoyalty.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        {row.isOverridden && (
                          <span className="ml-1 text-orange-600 font-semibold">
                            (Overridden)
                          </span>
                        )}
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
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">
              Preview will appear here after you parse the pasted text.
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