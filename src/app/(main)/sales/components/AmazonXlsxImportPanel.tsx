"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PendingSaleItem } from "@/lib/data/records";
import { BookListItem } from "@/lib/data/books";
import { normalizeISBN } from "@/lib/validation";
import {
  normalizeAmazonAsin,
  parseAmazonXlsx,
  type AmazonImportBook,
  type AmazonParseError,
} from "@/lib/amazon-xlsx";
import { AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";

interface AmazonXlsxImportPanelProps {
  onAddRecord: (record: PendingSaleItem) => void;
  booksData: BookListItem[];
}

function buildAmazonBookMaps(booksData: BookListItem[]): {
  booksByIsbn: Map<string, AmazonImportBook>;
  booksByAsin: Map<string, AmazonImportBook>;
} {
  const booksByIsbn = new Map<string, AmazonImportBook>();
  const booksByAsin = new Map<string, AmazonImportBook>();

  for (const book of booksData) {
    const b: AmazonImportBook = {
      id: book.id,
      title: book.title,
      author: book.author,
      distRoyaltyRate: book.distRoyaltyRate,
    };
    const isbn13 = normalizeISBN(book.isbn13 ?? null);
    const isbn10 = normalizeISBN(book.isbn10 ?? null);
    if (isbn13) booksByIsbn.set(isbn13, b);
    if (isbn10) booksByIsbn.set(isbn10, b);
    const asin = normalizeAmazonAsin(book.asin);
    if (asin) booksByAsin.set(asin, b);
  }

  return { booksByIsbn, booksByAsin };
}

export default function AmazonXlsxImportPanel({
  onAddRecord,
  booksData,
}: AmazonXlsxImportPanelProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<AmazonParseError[]>([]);
  const [nonBlockingWarnings, setNonBlockingWarnings] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [warningDialog, setWarningDialog] = useState<{
    records: PendingSaleItem[];
    warnings: string[];
    label: string;
  } | null>(null);

  const { booksByIsbn, booksByAsin } = useMemo(
    () => buildAmazonBookMaps(booksData),
    [booksData],
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setShowSuccess(false);
    setErrors([]);
    setNonBlockingWarnings([]);
    setFileName(null);

    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      setErrors([
        {
          sheet: "(file)",
          row: 0,
          message: "Please choose an Excel workbook (.xlsx or .xls).",
        },
      ]);
      setFileName(file.name);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result;
      if (!(buf instanceof ArrayBuffer)) return;

      const result = parseAmazonXlsx(buf, {
        filename: file.name,
        booksByIsbn,
        booksByAsin,
      });

      if (!result.ok) {
        setFileName(file.name);
        setErrors(result.errors);
        setNonBlockingWarnings(result.warnings);
        return;
      }

      if (result.warnings.length > 0) {
        setWarningDialog({
          records: result.records,
          warnings: result.warnings,
          label: file.name,
        });
        return;
      }

      setFileName(file.name);
      for (const r of result.records) {
        onAddRecord(r);
      }
      setShowSuccess(true);
    };

    reader.readAsArrayBuffer(file);
  };

  const confirmWarningsImport = () => {
    if (!warningDialog) return;
    for (const r of warningDialog.records) {
      onAddRecord(r);
    }
    setFileName(warningDialog.label);
    setShowSuccess(true);
    setWarningDialog(null);
  };

  const hasErrorState = fileName && errors.length > 0;

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Amazon royalty import</CardTitle>
          <CardDescription className="border-b pb-2">
            Import a KDP royalty <strong>.xlsx</strong> workbook to add rows to
            the <strong>Pending Records</strong> table. Sales period and
            per-sheet columns are read from the file.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b pb-4">
            <Label
              htmlFor="amazon-xlsx-import"
              className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Import Amazon XLSX
              <input
                id="amazon-xlsx-import"
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={handleFile}
              />
            </Label>
          </div>

          {fileName && (
            <div className="space-y-3">
              {hasErrorState && (
                <div className="rounded-md border-2 border-destructive bg-destructive/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-destructive text-sm font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Import failed for &quot;{fileName}&quot;
                  </div>
                  <ul className="list-none space-y-2 text-xs text-destructive">
                    {errors.map((err, idx) => (
                      <li
                        key={idx}
                        className="rounded border border-destructive/20 bg-destructive/10 px-2 py-1.5"
                      >
                        <span className="font-medium">
                          {err.sheet} (row {err.row}):
                        </span>{" "}
                        {err.message}
                      </li>
                    ))}
                  </ul>
                  {nonBlockingWarnings.length > 0 && (
                    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-950 dark:text-amber-100 text-xs space-y-1">
                      <p className="font-semibold">Notes</p>
                      <ul className="list-disc list-inside space-y-1">
                        {nonBlockingWarnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {showSuccess && !hasErrorState && (
                <div className="rounded-md border-2 border-green-500 bg-green-50 dark:bg-green-950/30 p-4 space-y-2 animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    &quot;{fileName}&quot; imported successfully
                  </div>
                  <p className="text-sm text-green-800 dark:text-green-300/90">
                    Review the rows in the <strong>Pending Records</strong>{" "}
                    table below.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={warningDialog !== null}
        onOpenChange={(open) => {
          if (!open) setWarningDialog(null);
        }}
      >
        <AlertDialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Import warnings</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-left space-y-3 text-foreground">
                <p>
                  The file parsed, but the following should be reviewed before
                  you save. You can still add these rows to pending records.
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-sm border rounded-md p-3 bg-muted/50">
                  {warningDialog?.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction type="button" onClick={confirmWarningsImport}>
              Add to pending records
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
