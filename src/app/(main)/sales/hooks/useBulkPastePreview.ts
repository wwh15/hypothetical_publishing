"use client";

import { useState } from "react";

export type ParsedSaleRow = {
  line: number;
  month: string;
  year: string;
  isbn: string;
  quantity: number;
  revenue: number;
  authorRoyalty?: number;
  raw: string;
};

export type InvalidSaleRow = {
  line: number;
  raw: string;
  reason: string;
};

const MONTH_RE = /^(0[1-9]|1[0-2])-(\d{4})$/;
const ISBN_RE = /^\d{10}(\d{3})?$/;

// Expected format for a given line is MM-YYYY,ISBN,Quantity,PublisherRevenue,AuthorRoyalty (optional)
// AuthorRoyalty is optional

function parseLine(line: string, lineNumber: number) {
  const parts = line.split(",").map((p) => p.trim());
  
  if (parts.length === 4) {
    return extractFields(parts, line, lineNumber);
  } else if (parts.length === 5) {
    return extractFields(parts, line, lineNumber);
  } else {
    return {
      invalid: {
        line: lineNumber,
        raw: line,
        reason: "Expected either 4 or 5 comma-separated fields. Please ensure all fields are specified.",
      } satisfies InvalidSaleRow,
    };
  }
}

function extractFields(parts: string[], line: string, lineNumber: number) {
  const [monthYear, isbnRaw, quantityRaw, revenueRaw, authorRoyaltyRaw] = parts;

  // Normalize ISBN: remove all non-digits (spaces, dashes, etc.)
  const isbnDigits = isbnRaw.replace(/\D/g, "");

  if (!MONTH_RE.test(monthYear)) {
    return {
      invalid: {
        line: lineNumber,
        raw: line,
        reason: "Month must match MM-YYYY (01-12 and 4-digit year)",
      } satisfies InvalidSaleRow,
    };
  }

  if (!ISBN_RE.test(isbnDigits)) {
    return {
      invalid: {
        line: lineNumber,
        raw: line,
        reason: "ISBN must have 10 or 13 digits",
      } satisfies InvalidSaleRow,
    };
  }

  const quantity = Number(quantityRaw);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return {
      invalid: {
        line: lineNumber,
        raw: line,
        reason: "Quantity must be a positive integer",
      } satisfies InvalidSaleRow,
    };
  }

  const revenue = Number.parseFloat(revenueRaw);
  if (Number.isNaN(revenue)) {
    return {
      invalid: {
        line: lineNumber,
        raw: line,
        reason: "PublisherRevenue must be a number",
      } satisfies InvalidSaleRow,
    };
  }

  // Handle optional author royalty field
  let authorRoyalty: number | undefined;
  if (authorRoyaltyRaw !== undefined && authorRoyaltyRaw.trim() !== "") {
    const parsedRoyalty = Number.parseFloat(authorRoyaltyRaw);
    if (Number.isNaN(parsedRoyalty)) {
      return {
        invalid: {
          line: lineNumber,
          raw: line,
          reason: "AuthorRoyalty must be a number",
        } satisfies InvalidSaleRow,
      };
    }
    
    if (parsedRoyalty >= revenue) {
      return {
        invalid: {
          line: lineNumber,
          raw: line,
          reason: "AuthorRoyalty must be less than PublisherRevenue",
        } satisfies InvalidSaleRow,
      };
    }
    
    authorRoyalty = parsedRoyalty;
  }

  const [month, yearStr] = monthYear.split("-");
  const year = parseInt(yearStr, 10);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return {
      invalid: {
        line: lineNumber,
        raw: line,
        reason: "Year must be between 2000 and 2100",
      } satisfies InvalidSaleRow,
    };
  }

  const result: ParsedSaleRow = {
    line: lineNumber,
    month,
    year: yearStr,
    isbn: isbnDigits,
    quantity,
    revenue,
    raw: line,
  };

  if (authorRoyalty !== undefined) {
    result.authorRoyalty = authorRoyalty;
  }

  return {
    valid: result,
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

      const result = parseLine(trimmed, lineNumber);
      if (result.valid) {
        valids.push(result.valid);
      } else if (result.invalid) {
        invalids.push(result.invalid);
      }
    });

    setPreviewRows(valids);
    setInvalidRows(invalids);
  }

  function clearPreview() {
    setPreviewRows([]);
    setInvalidRows([]);
  }

  return {
    previewRows,
    invalidRows,
    handlePreview,
    clearPreview,
  };
}
