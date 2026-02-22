"use client";

import { useMemo } from "react";
import type { ParsedSaleRow } from "./useBulkPastePreview";
import type { PendingSaleItem } from "@/lib/data/records";
import { BookListItem } from "@/lib/data/books";
import { validateDatePeriod, validatePositiveNumber } from "@/lib/validation";

export function useBulkPasteSubmit(
  booksData: BookListItem[],
  onAddRecord: (record: PendingSaleItem) => void,
) {
  const isbnLookup = useMemo(() => {
    const map = new Map<string, BookListItem>();
    const normalize = (isbn?: string | null) =>
      isbn ? isbn.replace(/\D/g, "") : null;

    for (const book of booksData) {
      const isbn13 = normalize(book.isbn13);
      const isbn10 = normalize(book.isbn10);
      if (isbn13) map.set(isbn13, book);
      if (isbn10) map.set(isbn10, book);
    }
    return map;
  }, [booksData]);

  /**
   * @param rows - The validated rows from the CSV
   * @param selectedDate - The {year, month} object from the panel state
   * @param fileName - Optional, used to build the Ingram comment
   * @returns An array of error objects, one for each failed row
   */
  function submitFromRows(
    rows: ParsedSaleRow[], 
    selectedDate: { year: string; month: string },
    fileName: string = "uploaded_file.csv"
  ) {
    const importTimestamp = new Date().toLocaleString();
    const submissionErrors: Array<{ line: number; errors: Record<string, string> }> = [];

    rows.forEach((row) => {
      const book = isbnLookup.get(row.isbn);
      if (!book) {
        submissionErrors.push({ line: row.line, errors: { book: "Book not found in database." } });
        return;
      }

      // Set fields
      const source = row.source;
      const quantity = row.netQuantity; // Quantity set to net quantity per Req 3.5.3.4
      const publisherRevenue = row.netCompensation; // Publisher revenue set to net compensation per Req 3.5.3.5
      const rate = source === "HAND_SOLD" ? book.handSoldRoyaltyRate : book.distRoyaltyRate;
      const authorRoyalty = (publisherRevenue * rate) / 100;

      // Validation 
      const dateCheck = validateDatePeriod(selectedDate.year, selectedDate.month);
      const revenueCheck = validatePositiveNumber(publisherRevenue, "Publisher Revenue");
      const royaltyCheck = validatePositiveNumber(authorRoyalty, "Author Royalty");
      const qtyCheck = validatePositiveNumber(quantity, "Quantity");
      
      // Check for errors; stop submission if errors are found
      if (!revenueCheck.success || !royaltyCheck.success || !qtyCheck.success || !dateCheck.success) {
        const rowErrors: Record<string, string> = {};
        if (!revenueCheck.success) rowErrors.publisherRevenue = revenueCheck.error;
        if (!royaltyCheck.success) rowErrors.authorRoyalty = royaltyCheck.error;
        if (!qtyCheck.success) rowErrors.quantity = qtyCheck.error;
        if (!dateCheck.success) rowErrors.date = dateCheck.error;
        
        submissionErrors.push({ line: row.line, errors: rowErrors });
        return; 
      }

      // Build the specific Ingram comment
      const comment = `Ingram: Format='${row.format}' Market='${row.salesMarket}' File='${fileName}' (${importTimestamp})`;

      const record: PendingSaleItem = {
        bookId: book.id,
        title: book.title,
        author: book.author,
        date: dateCheck.data,
        quantity: qtyCheck.data, // Per req: Use "Net Qty"
        publisherRevenue: revenueCheck.data,
        authorRoyalty: royaltyCheck.data,
        royaltyOverridden: false,
        paid: false,
        source: source,
        comment: comment,
      };

      onAddRecord(record);
    });

    return submissionErrors;
  }

  return { submitFromRows };
}