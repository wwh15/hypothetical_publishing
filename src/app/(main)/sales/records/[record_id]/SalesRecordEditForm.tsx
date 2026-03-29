"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsdConversionRates, updateSale } from "@/app/(main)/sales/action";
import type { SaleDetailPayload } from "@/lib/data/records";
import { BookSelectBox } from "@/components/BookSelectBox";
import { BookListItem } from "@/lib/data/books";
import MonthYearSelector from "@/components/MonthYearSelector";
import { Decimal } from "decimal.js";
import {
  normalizeCurrency,
  validateDatePeriod,
  validateKenp,
  validateNonNegativeNumber,
  validateQuantity,
} from "@/lib/validation";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  convertCurrency,
  convertOriginalToUsd,
  CURRENCY_SYMBOLS,
  SUPPORTED_CURRENCIES,
} from "@/lib/currency-conversion";
import { getAllowedSaleFormats } from "@/lib/validation/sale";
import type { Distributor, SaleFormat } from "@prisma/client";

/** Get the royalty rate (as percentage) for a book based on sale source */
function getRateForSource(
  book: BookListItem,
  source: "DISTRIBUTOR" | "HAND_SOLD"
): number {
  return source === "HAND_SOLD"
    ? book.handSoldRoyaltyRate
    : book.distRoyaltyRate;
}

/** Auto-calculate revenue for hand-sold: (coverPrice - printCost) * quantity */
function calcHandSoldRevenue(
  book: BookListItem,
  quantity: number
): number | null {
  if (quantity > 0) {
    return (book.coverPrice - book.printCost) * quantity;
  }
  return null;
}

interface SalesRecordEditFormProps {
  books: BookListItem[];
  sale: SaleDetailPayload;
  onClose: () => void;
  usdRatesInitial?: Record<string, number> | null;
}

const SALES_YEAR_MIN = 1000;
const SALES_YEAR_MAX = new Date().getFullYear();

function initialDateMonth(date: Date): string {
  if (
    !date ||
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() < SALES_YEAR_MIN || // Use UTC here too
    date.getUTCFullYear() > SALES_YEAR_MAX
  ) {
    return "";
  }
  // getUTCMonth() ensures Nov 1st 00:00Z returns 10 (November)
  return String(date.getUTCMonth() + 1).padStart(2, "0");
}

function initialDateYear(date: Date): string {
  if (!date || !Number.isFinite(date.getTime())) {
    return "";
  }

  const year = date.getUTCFullYear(); // Use UTC

  if (year < SALES_YEAR_MIN || year > SALES_YEAR_MAX) {
    return "";
  }
  return String(year);
}

export default function SalesRecordEditForm({
  sale,
  books,
  onClose,
  usdRatesInitial,
}: SalesRecordEditFormProps) {
  const router = useRouter();
  const [usdRates, setUsdRates] = useState<Record<string, number> | null>(
    () => usdRatesInitial ?? null
  );

  useEffect(() => {
    if (usdRatesInitial != null) {
      setUsdRates(usdRatesInitial);
      return;
    }
    let cancelled = false;
    getUsdConversionRates()
      .then((r) => {
        if (!cancelled) setUsdRates(r);
      })
      .catch(() => {
        if (!cancelled) setUsdRates(null);
      });
    return () => {
      cancelled = true;
    };
  }, [usdRatesInitial]);

  const toUsd = useCallback(
    async (amount: number, code: string) => {
      const sync = convertOriginalToUsd(amount, code, usdRates);
      if (sync !== null) return sync;
      return convertCurrency(amount, code);
    },
    [usdRates]
  );
  const [formData, setFormData] = useState({
    bookId: sale.book.id,
    dateMonth: initialDateMonth(sale.date),
    dateYear: initialDateYear(sale.date),
    quantity: sale.quantity ?? null,
    kenp: sale.kenp ?? null,
    publisherRevenueOriginal: new Decimal(
      sale.publisherRevenueOriginal
    ).toNumber(),
    publisherRevenueUSD: new Decimal(sale.publisherRevenueUSD).toNumber(),
    currency: sale.currency.toUpperCase(),
    authorRoyalty: new Decimal(sale.authorRoyalty).toNumber(),
    comment: sale.comment ?? "",
    source: sale.source,
    distributor: sale.distributor,
    format: sale.format,
  });

  const [loading, setLoading] = useState(false);

  // Validation States
  const [dateError, setDateError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [displayRevenueOriginal, setDisplayRevenueOriginal] = useState(
    formData.publisherRevenueOriginal !== 0
      ? formData.publisherRevenueOriginal.toFixed(2)
      : ""
  );
  const [displayRevenueUSD, setDisplayRevenueUSD] = useState(
    formData.publisherRevenueUSD !== 0
      ? formData.publisherRevenueUSD.toFixed(2)
      : ""
  );
  const [displayRoyalty, setDisplayRoyalty] = useState(
    formData.authorRoyalty.toFixed(2)
  );
  const [displayQuantity, setDisplayQuantity] = useState(
    formData.quantity != null && formData.quantity > 0
      ? String(formData.quantity)
      : ""
  );
  const [displayKenp, setDisplayKenp] = useState(
    formData.kenp != null ? String(formData.kenp) : ""
  );

  const handleSave = async () => {
    setErrors({});
    setDateError(null);
    const newErrors: Record<string, string> = {};

    const dateCheck = validateDatePeriod(formData.dateYear, formData.dateMonth);
    const isKu = formData.format === "KINDLE_UNLIMITED";
    const qtyCheck = isKu ? null : validateQuantity(displayQuantity);
    const kenpCheck = isKu ? validateKenp(displayKenp) : null;
    const revenueOriginalCheck = validateNonNegativeNumber(
      displayRevenueOriginal,
      "Publisher revenue"
    );

    if (!dateCheck.success) {
      setDateError(dateCheck.error);
      newErrors.date = dateCheck.error;
    }
    if (!isKu && qtyCheck && !qtyCheck.success)
      newErrors.quantity = qtyCheck.error;
    if (isKu && kenpCheck && !kenpCheck.success) newErrors.kenp = kenpCheck.error;
    if (!revenueOriginalCheck.success)
      newErrors.publisherRevenue = revenueOriginalCheck.error;

    if (Object.keys(newErrors).length > 0) {
      setErrors({ ...newErrors, global: "Please fix the errors above." });
      return;
    }

    if (!dateCheck.success || !revenueOriginalCheck.success) return;

    let quantityToSave: number | null;
    let kenpToSave: number | null;
    if (isKu) {
      if (!kenpCheck?.success) return;
      quantityToSave = null;
      kenpToSave = kenpCheck.data;
    } else {
      if (!qtyCheck?.success) return;
      quantityToSave = qtyCheck.data;
      kenpToSave = null;
    }

    setLoading(true);
    try {
      const distributorForSave: Distributor | null =
        formData.source === "HAND_SOLD"
          ? null
          : (formData.distributor ?? "OTHER");
      const result = await updateSale(sale.id, {
        bookId: formData.bookId,
        date: dateCheck.data,
        quantity: quantityToSave,
        kenp: kenpToSave,
        publisherRevenueOriginal: revenueOriginalCheck.data,
        publisherRevenueUSD: normalizeCurrency(displayRevenueUSD),
        authorRoyalty: normalizeCurrency(displayRoyalty),
        source: formData.source,
        distributor: distributorForSave,
        format: formData.format,
        comment: formData.comment.trim() || null,
        currency: formData.currency.trim().toUpperCase(),
      });

      if (result.success) {
        onClose();
        router.refresh();
      } else {
        setErrors({ global: result.error ?? "Failed to update." });
      }
    } catch {
      setErrors({ global: "Network error occurred." });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      bookId: sale.book.id,
      dateMonth: initialDateMonth(sale.date),
      dateYear: initialDateYear(sale.date),
      quantity: sale.quantity ?? null,
      kenp: sale.kenp ?? null,
      publisherRevenueOriginal: new Decimal(
        sale.publisherRevenueOriginal
      ).toNumber(),
      publisherRevenueUSD: new Decimal(sale.publisherRevenueUSD).toNumber(),
      authorRoyalty: new Decimal(sale.authorRoyalty).toNumber(),
      comment: sale.comment ?? "",
      currency: sale.currency.toUpperCase(),
      source: sale.source,
      distributor: sale.distributor,
      format: sale.format,
    });

    setDisplayRevenueOriginal(
      new Decimal(sale.publisherRevenueOriginal).toFixed(2)
    );
    setDisplayRevenueUSD(new Decimal(sale.publisherRevenueUSD).toFixed(2));
    setDisplayRoyalty(new Decimal(sale.authorRoyalty).toFixed(2));
    setDisplayQuantity(
      sale.quantity != null && sale.quantity > 0 ? String(sale.quantity) : ""
    );
    setDisplayKenp(sale.kenp != null ? String(sale.kenp) : "");

    setErrors({});
    setDateError(null);
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const distForAllowed: Distributor | null =
    formData.source === "HAND_SOLD"
      ? null
      : (formData.distributor ?? "OTHER");
  const allowedFormats = getAllowedSaleFormats(formData.source, distForAllowed);

  const selectorValue =
    formData.dateYear && formData.dateMonth
      ? `${formData.dateYear}-${String(formData.dateMonth).padStart(2, "0")}`
      : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
      <h2 className="text-xl font-bold mb-4">Edit Sale Record</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Book Reference */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Book Reference
          </label>
          <BookSelectBox
            books={books}
            selectedBookId={String(formData.bookId)}
            onSelect={async (bookId) => {
              const book = books.find((b) => b.id === Number(bookId));
              if (!book) return;

              let revOriginal = formData.publisherRevenueOriginal;
              let revUSD = formData.publisherRevenueUSD;

              if (formData.source === "HAND_SOLD") {
                const qty =
                  formData.quantity ??
                  (parseInt(displayQuantity, 10) > 0
                    ? parseInt(displayQuantity, 10)
                    : 1);
                const autoRev = calcHandSoldRevenue(book, qty) ?? 0;
                revOriginal = autoRev;
                revUSD = autoRev;
                setDisplayRevenueOriginal(revOriginal.toFixed(2));
                setDisplayRevenueUSD(revUSD.toFixed(2));
              } else {
                revUSD = await toUsd(revOriginal, formData.currency);
                setDisplayRevenueUSD(revUSD.toFixed(2));
              }

              const rate = book
                ? getRateForSource(book, formData.source)
                : null;
              const newRoyalty =
                rate != null ? revUSD * (rate / 100) : formData.authorRoyalty;

              setDisplayRoyalty(newRoyalty.toFixed(2));

              setFormData((prev) => ({
                ...prev,
                bookId: Number(bookId),
                publisherRevenueOriginal: revOriginal,
                publisherRevenueUSD: revUSD,
                authorRoyalty: newRoyalty,
              }));

              if (errors.bookId) setErrors((prev) => ({ ...prev, bookId: "" }));
            }}
          />
        </div>

        {/* Date Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Sale Date</label>
          <MonthYearSelector
            value={selectorValue}
            onChange={(v) => {
              setDateError(null);
              setErrors((prev) => ({ ...prev, date: "" }));
              if (!v) {
                setFormData({ ...formData, dateYear: "", dateMonth: "" });
                return;
              }
              const [y, m] = v.split("-");
              setFormData({
                ...formData,
                dateYear: y,
                dateMonth: m ? String(parseInt(m, 10)).padStart(2, "0") : "",
              });
            }}
            placeholder="Select month & year"
          />
          {dateError && (
            <p className="mt-2 text-sm text-red-600 font-medium">{dateError}</p>
          )}
        </div>

        {/* Sale source */}
        <div>
          <label className="block text-sm font-medium mb-2">Sale source</label>
          <select
            value={formData.source}
            onChange={async (e) => {
              const src = e.target.value as "HAND_SOLD" | "DISTRIBUTOR";
              const book = books.find((b) => b.id === formData.bookId);
              if (src === "HAND_SOLD") {
                const qty =
                  formData.quantity ??
                  (parseInt(displayQuantity, 10) > 0
                    ? parseInt(displayQuantity, 10)
                    : 1);
                const rev =
                  book != null ? calcHandSoldRevenue(book, qty) ?? 0 : 0;
                const rate = book != null ? getRateForSource(book, "HAND_SOLD") : 0;
                const roy = rev * (rate / 100);
                setDisplayQuantity(String(qty));
                setDisplayKenp("");
                setDisplayRevenueOriginal(rev.toFixed(2));
                setDisplayRevenueUSD(rev.toFixed(2));
                setDisplayRoyalty(roy.toFixed(2));
                setFormData((prev) => ({
                  ...prev,
                  source: src,
                  distributor: null,
                  format: "PRINT",
                  currency: "USD",
                  quantity: qty,
                  kenp: null,
                  publisherRevenueOriginal: rev,
                  publisherRevenueUSD: rev,
                  authorRoyalty: roy,
                }));
                return;
              }
              const dist = (formData.distributor ?? "OTHER") as Distributor;
              const nextAllowed = getAllowedSaleFormats("DISTRIBUTOR", dist);
              let fmt = formData.format;
              if (!nextAllowed.includes(fmt)) fmt = nextAllowed[0];
              const orig = formData.publisherRevenueOriginal;
              const usd = await toUsd(orig, formData.currency);
              const rate = book != null ? getRateForSource(book, "DISTRIBUTOR") : 0;
              const roy = usd * (rate / 100);
              setDisplayRevenueUSD(usd.toFixed(2));
              setDisplayRoyalty(roy.toFixed(2));
              setFormData((prev) => ({
                ...prev,
                source: src,
                distributor: dist,
                format: fmt,
                publisherRevenueUSD: usd,
                authorRoyalty: roy,
              }));
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
          >
            <option value="DISTRIBUTOR">Distributor</option>
            <option value="HAND_SOLD">Hand sold</option>
          </select>
        </div>

        {/* Distributor (distributor sales only) */}
        <div>
          <label className="block text-sm font-medium mb-2">Distributor</label>
          {formData.source === "HAND_SOLD" ? (
            <p className="text-sm text-muted-foreground py-2">—</p>
          ) : (
            <select
              value={formData.distributor ?? "OTHER"}
              onChange={(e) => {
                const dist = e.target.value as Distributor;
                const nextAllowed = getAllowedSaleFormats("DISTRIBUTOR", dist);
                let fmt = formData.format;
                if (!nextAllowed.includes(fmt)) fmt = nextAllowed[0];
                setFormData((prev) => {
                  const ku = fmt === "KINDLE_UNLIMITED";
                  return {
                    ...prev,
                    distributor: dist,
                    format: fmt,
                    quantity: ku ? null : prev.quantity ?? 1,
                    kenp: ku ? prev.kenp : null,
                  };
                });
                if (fmt === "KINDLE_UNLIMITED") {
                  setDisplayQuantity("");
                  if (!displayKenp) setDisplayKenp("");
                } else {
                  setDisplayQuantity(
                    (formData.quantity ?? 1) > 0
                      ? String(formData.quantity ?? 1)
                      : "1"
                  );
                  setDisplayKenp("");
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
            >
              <option value="INGRAM_SPARK">Ingram Spark</option>
              <option value="AMAZON">Amazon</option>
              <option value="OTHER">Other</option>
            </select>
          )}
        </div>

        {/* Format */}
        <div>
          <label className="block text-sm font-medium mb-2">Format</label>
          <select
            value={formData.format}
            onChange={async (e) => {
              const fmt = e.target.value as SaleFormat;
              const book = books.find((b) => b.id === formData.bookId);
              if (fmt === "KINDLE_UNLIMITED") {
                setDisplayQuantity("");
                setDisplayKenp((k) => k);
                const usd = await toUsd(
                  formData.publisherRevenueOriginal,
                  formData.currency
                );
                const rate =
                  book != null ? getRateForSource(book, formData.source) : 0;
                const roy = usd * (rate / 100);
                setDisplayRevenueUSD(usd.toFixed(2));
                setDisplayRoyalty(roy.toFixed(2));
                setFormData((prev) => ({
                  ...prev,
                  format: fmt,
                  quantity: null,
                  kenp: prev.kenp,
                  publisherRevenueUSD: usd,
                  authorRoyalty: roy,
                }));
                return;
              }
              const qty =
                formData.quantity && formData.quantity > 0
                  ? formData.quantity
                  : 1;
              setDisplayQuantity(String(qty));
              setDisplayKenp("");
              if (formData.source === "HAND_SOLD" && book) {
                const autoRev = calcHandSoldRevenue(book, qty) ?? 0;
                const rate = getRateForSource(book, "HAND_SOLD");
                const roy = autoRev * (rate / 100);
                setDisplayRevenueOriginal(autoRev.toFixed(2));
                setDisplayRevenueUSD(autoRev.toFixed(2));
                setDisplayRoyalty(roy.toFixed(2));
                setFormData((prev) => ({
                  ...prev,
                  format: fmt,
                  quantity: qty,
                  kenp: null,
                  publisherRevenueOriginal: autoRev,
                  publisherRevenueUSD: autoRev,
                  authorRoyalty: roy,
                }));
              } else if (book) {
                const usd = await toUsd(
                  formData.publisherRevenueOriginal,
                  formData.currency
                );
                const rate = getRateForSource(book, "DISTRIBUTOR");
                const roy = usd * (rate / 100);
                setDisplayRevenueUSD(usd.toFixed(2));
                setDisplayRoyalty(roy.toFixed(2));
                setFormData((prev) => ({
                  ...prev,
                  format: fmt,
                  quantity: qty,
                  kenp: null,
                  publisherRevenueUSD: usd,
                  authorRoyalty: roy,
                }));
              } else {
                setFormData((prev) => ({
                  ...prev,
                  format: fmt,
                  quantity: qty,
                  kenp: null as number | null,
                }));
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
          >
            {allowedFormats.map((f) => (
              <option key={f} value={f}>
                {f === "KINDLE_UNLIMITED"
                  ? "Kindle Unlimited"
                  : f === "EBOOK"
                    ? "Ebook"
                    : "Print"}
              </option>
            ))}
          </select>
          {allowedFormats.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              Choose a distributor to see allowed formats.
            </p>
          )}
        </div>

        {/* Quantity (print / ebook) */}
        {formData.format !== "KINDLE_UNLIMITED" && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Quantity sold
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={displayQuantity}
              className={cn(
                "w-full px-3 py-2 border rounded-md transition-colors dark:bg-gray-800",
                errors.quantity ? "border-red-500" : "border-gray-300 dark:border-gray-600"
              )}
              onChange={(e) => {
                const val = e.target.value;
                setDisplayQuantity(val);
                if (errors.quantity)
                  setErrors((prev) => ({ ...prev, quantity: "" }));

                const qtyValidation = validateQuantity(val);
                if (qtyValidation.success) {
                  const qty = qtyValidation.data;

                  setFormData((prev) => {
                    const next = { ...prev, quantity: qty };
                    const book = books.find((b) => b.id === prev.bookId);

                    if (prev.source === "HAND_SOLD" && book) {
                      const autoRev = calcHandSoldRevenue(book, qty) ?? 0;
                      next.publisherRevenueOriginal = autoRev;
                      next.publisherRevenueUSD = autoRev;
                      setDisplayRevenueOriginal(autoRev.toFixed(2));
                      setDisplayRevenueUSD(autoRev.toFixed(2));
                      const rate = getRateForSource(book, "HAND_SOLD");
                      next.authorRoyalty = autoRev * (rate / 100);
                      setDisplayRoyalty(next.authorRoyalty.toFixed(2));
                    } else if (book) {
                      const rate = getRateForSource(book, "DISTRIBUTOR");
                      const newRoyalty =
                        prev.publisherRevenueUSD * (rate / 100);
                      next.authorRoyalty = newRoyalty;
                      setDisplayRoyalty(newRoyalty.toFixed(2));
                    }

                    return next;
                  });
                }
              }}
            />
            {errors.quantity && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                {errors.quantity}
              </p>
            )}
          </div>
        )}

        {/* KENP (Kindle Unlimited) */}
        {formData.format === "KINDLE_UNLIMITED" && (
          <div>
            <label className="block text-sm font-medium mb-2">KENP</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 2400"
              value={displayKenp}
              className={cn(
                "w-full px-3 py-2 border rounded-md transition-colors",
                errors.kenp
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              )}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setDisplayKenp(val);
                if (errors.kenp) setErrors((prev) => ({ ...prev, kenp: "" }));
                const kenpValidation = validateKenp(val);
                if (kenpValidation.success) {
                  setFormData((prev) => ({
                    ...prev,
                    kenp: kenpValidation.data,
                  }));
                } else if (val === "") {
                  setFormData((prev) => ({ ...prev, kenp: null }));
                }
              }}
            />
            {errors.kenp && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                {errors.kenp}
              </p>
            )}
          </div>
        )}

        {/* Currency (distributor only) */}
        {formData.source === "DISTRIBUTOR" && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Original Currency
            </label>
            <select
              value={formData.currency}
              onChange={async (e) => {
                const code = e.target.value.toUpperCase();
                const book = books.find((b) => b.id === formData.bookId);
                const orig = formData.publisherRevenueOriginal;
                const usd = await toUsd(orig, code);
                const rate =
                  book != null ? getRateForSource(book, formData.source) : 0;
                const roy = usd * (rate / 100);
                setDisplayRevenueUSD(usd.toFixed(2));
                setDisplayRoyalty(roy.toFixed(2));
                setFormData((prev) => ({
                  ...prev,
                  currency: code,
                  publisherRevenueUSD: usd,
                  authorRoyalty: roy,
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
            >
              {SUPPORTED_CURRENCIES.map((curr) => (
              <option key={curr.code} value={curr.code}>
                {curr.code} - {curr.name} ({curr.symbol})
              </option>
            ))}
            </select>
          </div>
        )}

        {/* Publisher revenue (original currency amount) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Original Publisher Revenue (
            {formData.currency})
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={displayRevenueOriginal}
            readOnly={formData.source === "HAND_SOLD"}
            className={cn(
              "w-full px-3 py-2 border rounded-md transition-colors dark:bg-gray-800",
              errors.publisherRevenue ? "border-red-500" : "border-gray-300 dark:border-gray-600",
              formData.source === "HAND_SOLD" &&
                "bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
            )}
            onChange={(e) => {
              if (formData.source === "HAND_SOLD") return;

              const val = e.target.value;
              setDisplayRevenueOriginal(val);
              if (errors.publisherRevenue)
                setErrors((prev) => ({ ...prev, publisherRevenue: "" }));

              const revCheck = validateNonNegativeNumber(
                val,
                "Publisher revenue"
              );
              if (!revCheck.success) return;

              const originalValue = revCheck.data;
              const applyUsd = (usdValue: number) => {
                setDisplayRevenueUSD(usdValue.toFixed(2));
                const book = books.find(
                  (b) => b.id === Number(formData.bookId)
                );
                const rate = book ? getRateForSource(book, formData.source) : 0;
                const newRoyalty = usdValue * (rate / 100);
                setDisplayRoyalty(newRoyalty.toFixed(2));
                setFormData((prev) => ({
                  ...prev,
                  publisherRevenueOriginal: originalValue,
                  publisherRevenueUSD: usdValue,
                  authorRoyalty: newRoyalty,
                }));
              };

              const sync = convertOriginalToUsd(
                originalValue,
                formData.currency,
                usdRates
              );
              if (sync !== null) {
                applyUsd(sync);
              } else {
                void toUsd(originalValue, formData.currency).then(applyUsd);
              }
            }}
            onBlur={() => {
              if (
                formData.source === "HAND_SOLD" ||
                displayRevenueOriginal === ""
              )
                return;
              const revCheck = validateNonNegativeNumber(
                displayRevenueOriginal,
                "Publisher revenue"
              );
              if (revCheck.success) {
                const precision = formData.currency === "JPY" ? 0 : 2;
                setDisplayRevenueOriginal(revCheck.data.toFixed(precision));
              }
            }}
          />
          {errors.publisherRevenue && (
            <p className="mt-1 text-xs text-red-500 font-medium">
              {errors.publisherRevenue}
            </p>
          )}
        </div>

        {/* 2. USD Equivalent Display (Non-modifiable) */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-500">
            Publisher Revenue (USD)
          </label>
          <input
            type="text"
            value={displayRevenueUSD}
            readOnly
            tabIndex={-1}
            className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formData.source === "HAND_SOLD"
              ? "Calculated automatically from book costs."
              : `Converted from ${formData.currency} to USD using current exchange rates.`}
          </p>
        </div>

        {/* Author Royalty (read-only, auto-calculated) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Author Royalty (USD)
          </label>
          <input
            type="text"
            value={displayRoyalty}
            readOnly
            className={cn(
              "w-full px-3 py-2 border rounded-md bg-gray-100 dark:bg-gray-700 cursor-not-allowed",
              errors.authorRoyalty ? "border-red-500" : "border-gray-300"
            )}
            tabIndex={-1}
          />
          {errors.authorRoyalty && (
            <p className="mt-1 text-xs text-red-500 font-medium">
              {errors.authorRoyalty}
            </p>
          )}
        </div>

        {/* Comment */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">Comment</label>
          <Textarea
            value={formData.comment}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, comment: e.target.value }))
            }
            placeholder="Optional note (Maximum 256 characters)"
            maxLength={256}
            rows={2}
            className="resize-none w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-8 pt-6 border-t">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center min-w-[120px]"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded-md hover:bg-gray-400 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
