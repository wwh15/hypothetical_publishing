"use client";

import { useMemo } from "react";
import type { PendingSaleItem } from "@/lib/data/records";
import { BookListItem } from "@/lib/data/books";
import { 
  normalizeCurrency, 
  normalizeQuantity, 
  normalizeISBN, // Import this!
  validateDatePeriod,
  validateCurrency,
  validateQuantity, 
} from "@/lib/validation";

export type ParsedSaleRow = {
  line: number;
  isbn: string;
  title: string;
  author: string;
  format: "Paperback" | "Hardcover";
  grossQuantity: number;
  netQuantity: number;
  netCompensation: number;
  salesMarket: string;
  source: "DISTRIBUTOR" | "HAND_SOLD";
  raw: string;
};

export function useBulkPasteSubmit(
  booksData: BookListItem[],
  onAddRecord: (record: PendingSaleItem) => void,
) {
  const isbnLookup = useMemo(() => {
    const map = new Map<string, BookListItem>();

    for (const book of booksData) {
      // Use the helper that preserves 'X'
      const isbn13 = normalizeISBN(book.isbn13);
      const isbn10 = normalizeISBN(book.isbn10);
      if (isbn13) map.set(isbn13, book);
      if (isbn10) map.set(isbn10, book);
    }
    return map;
  }, [booksData]);

  function submitFromRows(
    rows: ParsedSaleRow[], 
    selectedDate: { year: string; month: string },
    fileName: string = "uploaded_file.csv"
  ) {
    const importTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const submissionErrors: Array<{ line: number; errors: Record<string, string> }> = [];

    rows.forEach((row) => {
      const book = isbnLookup.get(row.isbn);
      if (!book) {
        submissionErrors.push({ 
          line: row.line, 
          errors: { book: `Book with ISBN ${row.isbn} not found in library.` } 
        });
        return;
      }

      // Calculate logic
      const source = row.source;
      const quantity = row.netQuantity; 
      const publisherRevenue = row.netCompensation; 
      
      const rate = source === "HAND_SOLD" ? book.handSoldRoyaltyRate : book.distRoyaltyRate;
      const authorRoyalty = (publisherRevenue * (rate ?? 0)) / 100;

      // Business Logic Validation
      const dateCheck = validateDatePeriod(selectedDate.year, selectedDate.month);
      const revenueCheck = validateCurrency(publisherRevenue);
      const royaltyCheck = validateCurrency(authorRoyalty);
      const qtyCheck = validateQuantity(quantity);
      
      if (!revenueCheck.success || !royaltyCheck.success || !qtyCheck.success || !dateCheck.success) {
        const rowErrors: Record<string, string> = {};
        if (!revenueCheck.success) rowErrors.publisherRevenue = revenueCheck.error;
        if (!royaltyCheck.success) rowErrors.authorRoyalty = royaltyCheck.error;
        if (!qtyCheck.success) rowErrors.quantity = qtyCheck.error;
        if (!dateCheck.success) rowErrors.date = dateCheck.error;
        
        submissionErrors.push({ line: row.line, errors: rowErrors });
        return; 
      }

      const comment = `Ingram Import: Format='${row.format}' Market='${row.salesMarket}' File='${fileName}' (${importTimestamp})`;

      // FINAL RECORD CONSTRUCTION
      const record: PendingSaleItem = {
        bookId: book.id,
        title: book.title,
        author: book.author,
        date: dateCheck.data,
        // Ensure final rounding to integers and cents
        quantity: normalizeQuantity(qtyCheck.data), 
        publisherRevenueUSD: normalizeCurrency(revenueCheck.data),
        publisherRevenueOriginal: normalizeCurrency(revenueCheck.data),
        currency: "USD",
        authorRoyalty: normalizeCurrency(royaltyCheck.data),
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