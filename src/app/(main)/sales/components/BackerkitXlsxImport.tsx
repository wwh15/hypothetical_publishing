"use client";

import * as XLSX from "xlsx";
import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  InfoIcon,
} from "lucide-react";
import {
  authorRoyaltyRatePercentForSaleSource,
  type BookListItem,
} from "@/lib/data/books";
import { PendingSaleItem } from "@/lib/data/records";
import {
  normalizeCurrency,
  validateDatePeriod,
  validateNonNegativeNumber,
} from "@/lib/validation";

interface BackerkitXlsxImportProps {
  onAddRecords: (records: PendingSaleItem[]) => void;
  booksData: BookListItem[];
  /** Shown after a successful import; scrolls to the pending records table on the page. */
  onViewPendingRecords?: () => void;
}

const parseMmDdYyToSaleMonth = (value: string): Date | null => {
  // Spec: MM/DD/YY, with YY interpreted as 20YY.
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (!m) return null;

  const monthStr = m[1];
  const day = Number(m[2]); // only used to reject impossible dates like 02/30/25
  const yy = Number(m[3]);
  if (!Number.isFinite(day) || !Number.isFinite(yy)) return null;

  const year = 2000 + yy;
  const month = Number(monthStr);
  const dayCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    dayCheck.getUTCFullYear() !== year ||
    dayCheck.getUTCMonth() !== month - 1 ||
    dayCheck.getUTCDate() !== day
  ) {
    return null;
  }

  const saleMonth = validateDatePeriod(String(year), monthStr);
  return saleMonth.success ? saleMonth.data : null;
};

const OPTIONAL_HEADER_RE = /^(item|qty|price)\d+$/;

/**
 * Strict: exact BackerKit column names. Required: Pledge Status, Order Placed.
 * Other non-empty headers must be itemN, qtyN, or priceN only.
 */
function validateBackerkitHeaders(
  headerRow: unknown[],
  errors: string[]
): void {
  const seen = new Set<string>();
  let hasPledgeStatus = false;
  let hasOrderPlaced = false;

  for (const raw of headerRow) {
    const h = String(raw ?? "").trim();
    if (!h) continue;

    if (seen.has(h)) {
      errors.push(`Duplicate header column: "${h}"`);
      continue;
    }
    seen.add(h);

    if (h === "Pledge Status") {
      hasPledgeStatus = true;
      continue;
    }
    if (h === "Order Placed") {
      hasOrderPlaced = true;
      continue;
    }

    if (!OPTIONAL_HEADER_RE.test(h)) {
      errors.push(
        `Unsupported column header: "${h}". Expected itemN, qtyN, or priceN (e.g. item1, qty2, price3).`
      );
    }
  }

  if (!hasPledgeStatus) {
    errors.push(`Missing required column: "Pledge Status"`);
  }
  if (!hasOrderPlaced) {
    errors.push(`Missing required column: "Order Placed"`);
  }
}

function dataRowIsEmpty(row: Record<string, unknown>): boolean {
  for (const v of Object.values(row)) {
    if (v === null || v === undefined) continue;
    if (v instanceof Date) return false;
    if (typeof v === "number" && !Number.isNaN(v)) return false;
    if (String(v).trim() !== "") return false;
  }
  return true;
}

export default function BackerkitXlsxImport({
  onAddRecords,
  booksData,
  onViewPendingRecords,
}: BackerkitXlsxImportProps) {
  // --- State ---
  const [fileName, setFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [ignoredRows, setIgnoredRows] = useState<number[]>([]);
  const [unknownTags, setUnknownTags] = useState<string[]>([]);
  const [addedCount, setAddedCount] = useState<number>(0);

  // --- Lookups ---
  const eBookTagLookup = useMemo(() => {
    const map = new Map<string, BookListItem>();
    booksData.forEach((b) => {
      if (b.kickstarterEbookItemTag) map.set(b.kickstarterEbookItemTag, b);
    });
    return map;
  }, [booksData]);

  const printTagLookup = useMemo(() => {
    const map = new Map<string, BookListItem>();
    booksData.forEach((b) => {
      if (b.kickstarterPrintItemTag) map.set(b.kickstarterPrintItemTag, b);
    });
    return map;
  }, [booksData]);

  // --- Processing Logic ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    // Reset states
    setFileName(file.name);
    setErrors([]);
    setIgnoredRows([]);
    setUnknownTags([]);
    setAddedCount(0);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet) as Record<
          string,
          unknown
        >[];
        const matrix = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
        }) as unknown[][];

        const tempUnknownTags = new Set<string>();
        const tempIgnoredRows: number[] = [];
        const tempErrors: string[] = [];
        const salesMap = new Map<string, PendingSaleItem>();

        const timestamp = new Date()
          .toISOString()
          .replace("T", " ")
          .split(".")[0];
        const commentBase = `Kickstarter: File='${file.name}' (${timestamp})`;

        if (matrix.length === 0) {
          tempErrors.push("Sheet is empty.");
        } else {
          validateBackerkitHeaders(matrix[0] ?? [], tempErrors);
        }

        if (tempErrors.length === 0)
          rows.forEach((row, index) => {
            const rowNum = index + 2;

            if (dataRowIsEmpty(row)) return;

            // 1. Pledge Status — required on every non-empty row
            const pledgeVal = row["Pledge Status"];
            const pledgeStr = String(pledgeVal ?? "").trim();
            if (pledgeStr === "") {
              tempErrors.push(
                `Row ${rowNum}, "Pledge Status": value is required`
              );
              return;
            }

            const status = pledgeStr.toLowerCase();
            if (status !== "collected" && status !== "imported") {
              tempIgnoredRows.push(rowNum);
              return;
            }

            // 2. Order Placed — required for successful pledges
            const rawOrderPlaced = row["Order Placed"];
            if (
              rawOrderPlaced === null ||
              rawOrderPlaced === undefined ||
              String(rawOrderPlaced).trim() === ""
            ) {
              tempErrors.push(
                `Row ${rowNum}, "Order Placed": value is required`
              );
              return;
            }
            const saleMonth =
              rawOrderPlaced instanceof Date
                ? validateDatePeriod(
                    String(rawOrderPlaced.getUTCFullYear()),
                    String(rawOrderPlaced.getUTCMonth() + 1)
                  )
                : typeof rawOrderPlaced === "number"
                ? (() => {
                    const d = new Date(
                      Math.round((rawOrderPlaced - 25569) * 86400 * 1000)
                    );
                    return validateDatePeriod(
                      String(d.getUTCFullYear()),
                      String(d.getUTCMonth() + 1)
                    );
                  })()
                : typeof rawOrderPlaced === "string"
                ? (() => {
                    const d = parseMmDdYyToSaleMonth(rawOrderPlaced);
                    return d
                      ? { success: true as const, data: d }
                      : { success: false as const, error: "Invalid date" };
                  })()
                : (() => {
                    const d = parseMmDdYyToSaleMonth(
                      String(rawOrderPlaced ?? "")
                    );
                    return d
                      ? { success: true as const, data: d }
                      : { success: false as const, error: "Invalid date" };
                  })();

            if (!saleMonth.success) {
              tempErrors.push(
                `Row ${rowNum}, "Order Placed" Field: Invalid date`
              );
              return;
            }

            const monthKey = `${saleMonth.data.getUTCFullYear()}-${String(
              saleMonth.data.getUTCMonth() + 1
            ).padStart(2, "0")}`;

            // 3. Scan itemN / qtyN pairs (BackerKit uses item1, qty1, …)
            Object.keys(row).forEach((key) => {
              if (!key.startsWith("item")) return;
              const n = key.slice("item".length);
              if (!/^\d+$/.test(n)) return;

              const tagRaw = row[key];
              if (tagRaw === null || tagRaw === undefined) return;
              const tagStr = String(tagRaw).trim();
              if (!tagStr) return;

              const qtyRaw = row[`qty${n}`];
              const qtyCheck = validateNonNegativeNumber(
                typeof qtyRaw === "number" ? qtyRaw : String(qtyRaw ?? ""),
                `"qty${n}"`
              );

              if (!qtyCheck.success) {
                tempErrors.push(
                  `Row ${rowNum}, "qty${n}" Field: ${qtyCheck.error}`
                );
                return;
              }
              const qty = qtyCheck.data;
              // DB requires quantity > 0 for print/ebook; 0 in the sheet is valid — skip the line.
              if (qty === 0) return;

              // 1. Try to find the book in either lookup
              const eBookMatch = eBookTagLookup.get(tagStr);
              const printMatch = printTagLookup.get(tagStr);

              // 2. Identify the specific book and the format it represents
              const matchedBook = eBookMatch || printMatch;
              const matchedFormat: PendingSaleItem["format"] = eBookMatch
                ? "EBOOK"
                : "PRINT";

              if (matchedBook) {
                // 3. Tuple Key must include the format to ensure aggregation separation
                const tupleKey = `${monthKey}|${matchedBook.id}|${matchedFormat}`;

                if (!salesMap.has(tupleKey)) {
                  salesMap.set(tupleKey, {
                    id: crypto.randomUUID(),
                    bookId: matchedBook.id,
                    title: matchedBook.title,
                    author: matchedBook.author,
                    date: saleMonth.data,
                    quantity: 0,
                    kenp: null,
                    format: matchedFormat,
                    distributor: null,
                    publisherRevenueUSD: 0,
                    publisherRevenueOriginal: 0,
                    currency: "USD",
                    authorRoyalty: 0,
                    paid: false,
                    source: "KICKSTARTER",
                    comment: commentBase,
                  });
                }

                const existing = salesMap.get(tupleKey)!;
                existing.quantity = (existing.quantity ?? 0) + qty;
              } else {
                // If it matches neither, it's an unknown/swag item
                tempUnknownTags.add(tagStr);
              }
            });
          });

        // 4. Publisher revenue (and author royalty) — only after a clean scan
        if (tempErrors.length === 0 && salesMap.size > 0) {
          const bookById = new Map(booksData.map((b) => [b.id, b]));
          for (const rec of salesMap.values()) {
            const book = bookById.get(rec.bookId);
            if (!book) {
              tempErrors.push(`Missing book "${rec.title}" in catalog`);
              continue;
            }
            const qty = rec.quantity ?? 0;
            const printCostPerUnit =
              rec.format === "EBOOK" ? 0 : book.printCost;
            const rev = (book.coverPrice - printCostPerUnit) * qty;

            rec.publisherRevenueUSD = normalizeCurrency(rev);
            rec.publisherRevenueOriginal = normalizeCurrency(rev);
            const ratePct = authorRoyaltyRatePercentForSaleSource(
              book,
              "KICKSTARTER"
            );
            rec.authorRoyalty = normalizeCurrency(rev * (ratePct / 100));
          }
        }

        const parsedRecords =
          tempErrors.length === 0 ? Array.from(salesMap.values()) : [];

        if (tempErrors.length === 0 && parsedRecords.length > 0) {
          onAddRecords(parsedRecords);
        }

        // Update State
        setErrors(tempErrors);
        setIgnoredRows(tempIgnoredRows);
        setUnknownTags(Array.from(tempUnknownTags));
        setAddedCount(parsedRecords.length);
      } catch (err) {
        setErrors(["Critical Error: Failed to parse XLSX file."]);
        setAddedCount(0);
      } finally {
        // Allow re-selecting the same file (or importing again) — `change` only fires when value changes.
        input.value = "";
      }
    };
    reader.onerror = () => {
      setErrors(["Critical Error: Failed to read XLSX file."]);
      setAddedCount(0);
      input.value = "";
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Backerkit Import</CardTitle>
        <CardDescription className="border-b pb-2">
          Upload a Backerkit XLSX to generate aggregate sales records and add
          rows to the <strong>Pending Records</strong> table located at the
          bottom of the page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: File Input */}
        <div className="flex items-center gap-2">
          <Label
            htmlFor="bk-import"
            className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import Backerkit XLSX
            <input
              id="bk-import"
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={handleFileUpload}
            />
          </Label>
        </div>

        {/* Step 2: Feedback & Validation Display */}
        {fileName && (
          <div className="space-y-4">
            {/* Hard Errors (layout mirrors IngramSparkImport) */}
            {errors.length > 0 && (
              <div className="mt-4 p-4 rounded-md border-2 border-destructive bg-destructive/5 space-y-3">
                <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Validation failed for {errors.length} issue
                  {errors.length !== 1 ? "s" : ""}
                </div>
                <ul className="space-y-1 list-disc list-inside">
                  {errors.map((err, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-destructive list-none mb-3 last:mb-0"
                    >
                      <div className="flex flex-wrap gap-2">
                        {err.split(" | ").map((part, partIdx) => (
                          <span
                            key={partIdx}
                            className="bg-destructive/10 px-2 py-1 rounded border border-destructive/20"
                          >
                            {part}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rows skipped for unsuccessful Pledge Status (shown after errors too) */}
            {ignoredRows.length > 0 && (
              <div className="mt-2 rounded-md border border-muted-foreground/25 bg-muted/30 p-3 text-sm space-y-2">
                <p className="font-medium text-foreground">
                  Spreadsheet rows with unsuccessful{" "}
                  <strong className="font-semibold">Pledge Status</strong> (
                  {ignoredRows.length} row{ignoredRows.length !== 1 ? "s" : ""}
                  ):
                </p>
                <ul className="list-disc list-inside m-0 space-y-0.5 pl-1">
                  {[...ignoredRows]
                    .sort((a, b) => a - b)
                    .map((rowNum) => (
                      <li key={rowNum}>Row {rowNum}</li>
                    ))}
                </ul>
              </div>
            )}

            {/* Unknown tags from import (separate callout) */}
            {errors.length === 0 && unknownTags.length > 0 && (
              <div className="rounded-md border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
                <p className="m-0">
                  <Info className="mr-2 inline h-4 w-4 align-text-bottom" />
                  <strong>Unknown item tags (ignored):</strong>{" "}
                  {unknownTags.join(", ")}
                </p>
              </div>
            )}

            {/* Success (matches Ingram Spark / Amazon import panels) */}
            {errors.length === 0 &&
              (addedCount > 0 ? (
                <div className="space-y-3 rounded-md border-2 border-green-500 bg-green-50 p-4 animate-in fade-in zoom-in duration-300 dark:bg-green-950/30">
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    File &quot;{fileName}&quot; imported successfully
                  </div>
                  <p className="text-sm text-green-800 dark:text-green-300/90">
                    Review the imported data in the{" "}
                    <strong>Pending Records</strong> table below.
                  </p>
                  {addedCount > 0 && onViewPendingRecords && (
                    <Button
                      type="button"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => onViewPendingRecords()}
                    >
                      View Pending Records
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 rounded-md border-2 p-4 animate-in fade-in zoom-in duration-300 bg-secondary">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                  <InfoIcon />
                  No Sales Added. 
                  </div>
                  <p className="text-sm">
                    <strong>Possible Reasons:</strong> (1) None of the Kickstarter item tags are recognized, (2) Some columns are missing data.
                  </p>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
