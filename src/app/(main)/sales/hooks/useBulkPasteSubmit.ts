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
      const source = row.source;

      // Auto-calculate revenue for hand-sold when book has pricing
      let publisherRevenue = row.revenue;
      if (source === "HAND_SOLD" && book.coverPrice != null && book.printCost != null) {
        publisherRevenue = (book.coverPrice - book.printCost) * row.quantity;
      }

      // Select rate based on source
      const rate = source === "HAND_SOLD" ? book.handSoldRoyaltyRate : book.distRoyaltyRate;
      const computedRoyalty = publisherRevenue * rate / 100;

      // Use provided royalty if it exists, otherwise use computed
      const authorRoyalty = row.authorRoyalty ?? computedRoyalty;

      // Check if overridden: provided royalty exists and differs from computed
      const royaltyOverridden =
        row.authorRoyalty !== undefined &&
        Math.abs(row.authorRoyalty - computedRoyalty) > 0.01;

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
        source,
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
