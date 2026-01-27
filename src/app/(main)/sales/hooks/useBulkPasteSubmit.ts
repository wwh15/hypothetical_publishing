"use client";

import { useMemo, useState } from "react";
import type { ParsedSaleRow } from "./useBulkPastePreview";
import type { PendingSaleItem } from "@/lib/data/records";

type Book = {
  id: number;
  title: string;
  author: { name: string };
  authorRoyaltyRate: number;
  isbn13?: string | null;
  isbn10?: string | null;
};

export function useBulkPasteSubmit(
  books: Book[],
  onAddRecord: (record: PendingSaleItem) => void,
) {
  // Optional: build an ISBN -> Book lookup exactly once
  const isbnLookup = useMemo(() => {
    const map = new Map<string, Book>();
    const normalize = (isbn?: string | null) =>
      isbn ? isbn.replace(/\D/g, "") : null;

    for (const book of books) {
      const isbn13 = normalize(book.isbn13);
      const isbn10 = normalize(book.isbn10);
      if (isbn13) map.set(isbn13, book);
      if (isbn10) map.set(isbn10, book);
    }

    return map;
  }, [books]);

  function submitFromRows(rows: ParsedSaleRow[]) {
    rows.forEach((row) => {
      const book = isbnLookup.get(row.isbn);
      if (!book) {
        // Add logic to alert publisher and force them to create book/record
        // Or force full details always but handle adding new data to database
        return;
      }

      const date = `${row.month}-${row.year}`;
      const publisherRevenue = row.revenue;
      const authorRoyalty = publisherRevenue * book.authorRoyaltyRate;

      const record: PendingSaleItem = {
        bookId: book.id,
        title: book.title,
        author: book.author.name,
        date,
        quantity: row.quantity,
        publisherRevenue,
        authorRoyalty,
        royaltyOverridden: false,
        paid: false,
      };

      onAddRecord(record);
    });
  }

  return { submitFromRows };
}
