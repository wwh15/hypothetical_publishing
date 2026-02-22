"use client";

import { useState } from "react";

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

const ISBN_RE = /^\d{10}(\d{3})?$/;

function parseLine(line: string, lineNumber: number): { valid?: ParsedSaleRow; invalid?: InvalidSaleRow } {
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

  return extractFields(parts, line, lineNumber);
}

function extractFields(parts: string[], line: string, lineNumber: number): { valid?: ParsedSaleRow; invalid?: InvalidSaleRow } {
  const [
    isbnRaw, 
    title, 
    author, 
    formatRaw, 
    grossRaw, 
    returnedRaw, 
    netRaw, 
    compensationRaw, 
    salesMarket
  ] = parts;

  // 2. ISBN Validation
  const isbnDigits = isbnRaw.replace(/\D/g, "");
  if (!ISBN_RE.test(isbnDigits)) {
    return { invalid: { line: lineNumber, raw: line, reason: "ISBN must be 10 or 13 digits" } };
  }

  // 3. Format Validation
  if (formatRaw !== "Paperback" && formatRaw !== "Hardcover") {
    return { invalid: { line: lineNumber, raw: line, reason: "Format must be 'Paperback' or 'Hardcover'" } };
  }

  // 4. Quantity & Return Validation (Zero Returns Rule)
  const grossQuantity = Number(grossRaw);
  const returnedQuantity = Number(returnedRaw);
  const netQuantity = Number(netRaw);
  const netCompensation = Number(compensationRaw);

  if (isNaN(grossQuantity) || isNaN(returnedQuantity) || isNaN(netQuantity) || isNaN(netCompensation)) {
    return { invalid: { line: lineNumber, raw: line, reason: "Quantities and Compensation must be numbers" } };
  }

  if (returnedQuantity !== 0) {
    return { invalid: { line: lineNumber, raw: line, reason: "Returned Qty must be zero" } };
  }

  if (netQuantity !== grossQuantity) {
    return { invalid: { line: lineNumber, raw: line, reason: "Net Qty must equal Gross Qty" } };
  }

  // 5. Construct Valid Object (Matches ParsedSaleRow type)
  return {
    valid: {
      line: lineNumber,
      isbn: isbnDigits,
      title,
      author,
      format: formatRaw as "Paperback" | "Hardcover",
      grossQuantity,
      netQuantity,
      netCompensation,
      salesMarket,
      source: "DISTRIBUTOR", // Ingram Spark imports are always Distributor
      raw: line,
    } satisfies ParsedSaleRow,
  };
}

export function useBulkPastePreview() {
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

      const result = parseLine(trimmed, lineNumber);
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