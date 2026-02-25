"use client";

import { BookListItem } from "@/lib/data/books";
import { validateCurrency, validateEquals, validateISBN, validateQuantity, validateRequiredString, validateReturnedQuantity, validateSaleFormat } from "@/lib/validation";
import { useMemo, useState } from "react";

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

export type InvalidSaleRow = {
  line: number;
  raw: string;
  reason: string;
};

function parseLine(line: string, lineNumber: number, isbnLookup: Map<string, BookListItem>): { valid?: ParsedSaleRow; invalid?: InvalidSaleRow } {
  // This regex splits on commas only if they are NOT followed by an odd number of quotes
  // (which would mean the comma is inside a quoted string).
  const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(p => {
    let trimmed = p.trim();
    // Remove leading/trailing double quotes if they exist
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      trimmed = trimmed.substring(1, trimmed.length - 1);
    }
    return trimmed;
  }) || [];

  // 1. Check field count (9 fields per requirements)
  if (parts.length !== 9) {
    return {
      invalid: {
        line: lineNumber,
        raw: line,
        reason: `Expected 9 fields, found ${parts.length}.`,
      },
    };
  }

  return extractFields(parts, line, lineNumber, isbnLookup);
}

function extractFields(parts: string[], line: string, lineNumber: number, isbnLookup: Map<string, BookListItem>): { valid?: ParsedSaleRow; invalid?: InvalidSaleRow } {
  const [
    isbnRaw, titleRaw, authorRaw, formatRaw, 
    grossRaw, returnedRaw, netRaw, compensationRaw, salesMarketRaw
  ] = parts;

  // 1. Run all validations
  const isbnRes = validateISBN(isbnRaw); // ISBN
  const titleRes = validateRequiredString(titleRaw, "Book Title"); // Book Title
  const authorRes = validateRequiredString(authorRaw, "Author Name"); // Author Name
  const formatRes = validateSaleFormat(formatRaw); // Sales Format
  const grossRes = validateQuantity(grossRaw); // Gross Quantity
  const returnedRes = validateReturnedQuantity(returnedRaw); // Returned Quantity
  const netRes = validateQuantity(netRaw); // Net Quantity
  const compRes = validateCurrency(compensationRaw); // Net Compensation
  const marketRes = validateRequiredString(salesMarketRaw, "Sales Market"); // Market

  // 2. Check for errors

  // ISBN Validation
  if (!isbnRes.success) return { invalid: { line: lineNumber, raw: line, reason: `(ISBN) ${isbnRes.error}` } };

  // Requirement 3.5.3.3: ISBN must match a book in the system
  if (!isbnLookup.has(isbnRes.data)) {
    return { invalid: { line: lineNumber, raw: line, reason: `(ISBN) Book not found in library: ${isbnRes.data}` } };
  }

  // Required Strings Validation
  if (!titleRes.success) return { invalid: { line: lineNumber, raw: line, reason: `(Title) ${titleRes.error}` } };
  if (!authorRes.success) return { invalid: { line: lineNumber, raw: line, reason: `(Author) ${authorRes.error}` } };
  if (!formatRes.success) return { invalid: { line: lineNumber, raw: line, reason: `(Format) ${formatRes.error}` } };
  if (!grossRes.success) return { invalid: { line: lineNumber, raw: line, reason: `(Gross Qty) ${grossRes.error}` } };

  // Quantity Validation
  if (!returnedRes.success) return { invalid: { line: lineNumber, raw: line, reason: `(Returned Qty) ${returnedRes.error}` } };
  if (!netRes.success) return { invalid: { line: lineNumber, raw: line, reason: `(Net Qty) ${netRes.error}` } };
  if (!marketRes.success) return { invalid: { line: lineNumber, raw: line, reason: `(Market) ${marketRes.error}` } };

  // Currency Validation
  if (!compRes.success) return { invalid: { line: lineNumber, raw: line, reason: compRes.error } };
  
  // Check Net Quantity equals Gross Quantity
  if (!validateEquals(netRes.data, grossRes.data)) {
    return { 
      invalid: { 
        line: lineNumber, 
        raw: line, 
        reason: `Net Qty (${netRes.data}) must equal Gross Qty (${grossRes.data})` 
      } 
    };
  }

  // Check if ISBN exists in databse


  // 4. Construct Valid Object
  // All .data access here is now perfectly type-safe.
  return {
    valid: {
      line: lineNumber,
      isbn: isbnRes.data,
      title: titleRes.data,
      author: authorRes.data,
      format: formatRes.data as "Paperback" | "Hardcover",
      grossQuantity: grossRes.data,
      netQuantity: netRes.data,
      netCompensation: compRes.data,
      salesMarket: marketRes.data,
      source: "DISTRIBUTOR",
      raw: line,
    }
  };
}

export function useBulkPastePreview(isbnLookup: Map<string, BookListItem>) {
  const [previewRows, setPreviewRows] = useState<ParsedSaleRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<InvalidSaleRow[]>([]);

  function handlePreview(input: string) {
    const lines = input.split(/\r?\n/);
    const valids: ParsedSaleRow[] = [];
    const invalids: InvalidSaleRow[] = [];

    lines.forEach((rawLine, idx) => {
      const lineNumber = idx + 1;
      const trimmed = rawLine.trim();
      
      if (!trimmed) return;

      // Skip header row if it starts with "ISBN"
      if (idx === 0 && trimmed.toUpperCase().startsWith("ISBN")) return;

      const result = parseLine(trimmed, lineNumber, isbnLookup);
      if (result.valid) valids.push(result.valid);
      else if (result.invalid) invalids.push(result.invalid);
    });

    setPreviewRows(valids);
    setInvalidRows(invalids);
  }

  function clearPreview() {
    setPreviewRows([]);
    setInvalidRows([]);
  }

  return { previewRows, invalidRows, handlePreview, clearPreview };
}