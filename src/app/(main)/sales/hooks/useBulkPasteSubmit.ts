"use client";

import { useMemo } from "react";
import type { ParsedSaleRow } from "./useBulkPastePreview";
import type { PendingSaleItem } from "@/lib/data/records";
import { BookListItem } from "@/lib/data/books";

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
   */
  function submitFromRows(
    rows: ParsedSaleRow[], 
    selectedDate: { year: string; month: string },
    fileName: string = "uploaded_file.csv"
  ) {
    const importTimestamp = new Date().toLocaleString();

    rows.forEach((row) => {
      const book = isbnLookup.get(row.isbn);
      if (!book) return;

      // 1. Use the date from the Step 1 selector (DD-MM-YYYY format or as required by your DB)
      // Standardizing to MM-YYYY for the PendingSaleItem 'date' field
      const date = `${selectedDate.month}-${selectedDate.year}`;
      
      const source = row.source;

      // 2. Publisher Revenue Logic
      let publisherRevenue = row.netCompensation;
      if (source === "HAND_SOLD" && book.coverPrice != null && book.printCost != null) {
        publisherRevenue = (book.coverPrice - book.printCost) * row.grossQuantity;
      }

      // 3. Royalty Calculation
      const rate = source === "HAND_SOLD" ? book.handSoldRoyaltyRate : book.distRoyaltyRate;
      const authorRoyalty = (publisherRevenue * rate) / 100;

      // 4. Requirement 3.5: Build the specific Ingram comment
      const comment = `Ingram: Format='${row.format}' Market='${row.salesMarket}' File='${fileName}' (${importTimestamp})`;

      const record: PendingSaleItem = {
        bookId: book.id,
        title: book.title,
        author: book.author,
        date,
        quantity: row.netQuantity, // Per req: Use "Net Qty"
        publisherRevenue,
        authorRoyalty,
        royaltyOverridden: false,
        paid: false,
        source,
        comment,
      };

      onAddRecord(record);
    });
  }

  return { submitFromRows };
}