"use client";

import { useMemo } from "react";
import type { ParsedSaleRow } from "./useBulkPastePreview";
import type { PendingSaleItem } from "@/lib/data/records";
import { BookListItem } from "@/lib/data/books";


export function useBulkPasteSubmit(
  booksData: BookListItem[],
  onAddRecord: (record: PendingSaleItem) => void,
) {
  // Optional: build an ISBN -> Book lookup exactly once
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

  function submitFromRows(rows: ParsedSaleRow[]) {
    const missingBooks: string[] = [];

    rows.forEach((row) => {
      const book = isbnLookup.get(row.isbn);
      if (!book) {
        missingBooks.push(`ISBN ${row.isbn} (Line ${row.line})`);
        return;
      }

      const date = `${row.month}-${row.year}`;
      const publisherRevenue = row.revenue;
      
      // Compute expected royalty from book rate
      const computedRoyalty = publisherRevenue * book.defaultRoyaltyRate / 100;
      
      // Use provided royalty if it exists, otherwise use computed
      const authorRoyalty = row.authorRoyalty ?? computedRoyalty;
      
      // Check if overridden: provided royalty exists and differs from computed
      const royaltyOverridden =
        row.authorRoyalty !== undefined &&
        Math.abs(row.authorRoyalty - computedRoyalty) > 0.01; // Small tolerance for floating point

      const record: PendingSaleItem = {
        bookId: book.id,
        title: book.title,
        author: book.author,
        date,
        quantity: row.quantity,
        publisherRevenue,
        authorRoyalty,
        royaltyOverridden,
        paid: false,
      };

      onAddRecord(record);
    });

    if (missingBooks.length > 0) {
      console.warn("Missing books:", missingBooks);
      // Alert is handled in the component, but log here for debugging
    }
  }

  return { submitFromRows };
}
