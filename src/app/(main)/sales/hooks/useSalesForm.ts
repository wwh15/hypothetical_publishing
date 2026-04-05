"use client";

import { useEffect, useMemo, useState } from "react";
import type { Distributor, SaleFormat, SaleSource } from "@prisma/client";
import { PendingSaleItem } from "@/lib/data/records";
import {
  BookListItem,
  authorRoyaltyRatePercentForSaleSource,
  autoPublisherRevenueUsd,
} from "@/lib/data/books";
import {
  validateDatePeriod,
  normalizeCurrency,
  normalizeQuantity,
  validateRoyaltyLimit,
  validateQuantity,
  validateCurrency,
  validateNonNegativeNumber,
} from "@/lib/validation";
import { convertOriginalToUsd } from "@/lib/exchange-rates";
import { getUsdConversionRates } from "../action";
import {
  getAllowedSaleFormats,
  validateSaleRecord,
} from "@/lib/validation/sale";

interface FormData {
  month: string;
  year: string;
  bookId: string;
  quantity: string;
  kenp: string;
  publisherRevenueUSD: string;
  publisherRevenueOriginal: string;
  authorRoyalty: string;
  comment: string;
  currency: string;
  source: "DISTRIBUTOR" | "HAND_SOLD" | "KICKSTARTER";
  distributor: Distributor;
  format: SaleFormat;
}

function distributorForValidation(
  source: FormData["source"],
  d: Distributor
) {
  return source === "DISTRIBUTOR" ? d : null;
}

/** Coerce format/distributor/source rules after a field change */
function coerceSaleForm(next: FormData, changedField: string): FormData {
  let n = { ...next };

  if (n.source === "HAND_SOLD") {
    n = { ...n, format: "PRINT", kenp: "" };
  }
  if (n.source === "KICKSTARTER") {
    n = { ...n, kenp: "" };
  }

  // KU is only valid for Amazon; picking KU switches distributor to Amazon (not when user picks Other/etc.)
  if (
    changedField === "format" &&
    n.format === "KINDLE_UNLIMITED" &&
    n.source === "DISTRIBUTOR"
  ) {
    n = { ...n, distributor: "AMAZON" };
  }

  const dist = distributorForValidation(n.source, n.distributor);
  const allowed = getAllowedSaleFormats(n.source, dist);
  if (!allowed.includes(n.format)) {
    n = { ...n, format: allowed[0] ?? "PRINT" };
  }

  // Match qty vs KENP to final format (e.g. switching distributor off Amazon may coerce KU → print/ebook)
  if (n.format === "KINDLE_UNLIMITED") {
    n = { ...n, quantity: "" };
  } else {
    n = { ...n, kenp: "" };
  }

  if (changedField === "source" && n.source === "HAND_SOLD") {
    n = { ...n, kenp: "" };
  }

  return n;
}

function applyDerivedValues(
  current: FormData,
  rates: Record<string, number> | null,
  forceCurrencyUpdate: boolean,
  bookList: BookListItem[]
): FormData {
  const next = { ...current };
  const book = bookList.find((b) => b.id === parseInt(next.bookId, 10));
  if (!book) return next;

  if (next.source === "HAND_SOLD" || next.source === "KICKSTARTER") {
    next.currency = "USD";
    const qty = normalizeQuantity(next.quantity);
    const revNum = autoPublisherRevenueUsd(
      book,
      qty,
      next.source as SaleSource,
      next.format
    );
    const revUsdStr = (revNum ?? 0).toFixed(2);
    next.publisherRevenueOriginal = revUsdStr;
    next.publisherRevenueUSD = revUsdStr;
  } else if (forceCurrencyUpdate) {
    const originalAmount = Number(
      next.publisherRevenueOriginal.replace(/[,\s]/g, "") || 0
    );

    if (next.currency === "USD") {
      next.publisherRevenueUSD = originalAmount.toFixed(2);
    } else if (originalAmount > 0) {
      const converted = convertOriginalToUsd(
        originalAmount,
        next.currency,
        rates
      );
      if (converted != null) {
        next.publisherRevenueUSD = converted.toFixed(2);
      }
    } else {
      next.publisherRevenueUSD = "0.00";
    }
  }

  const revUsdNum = normalizeCurrency(next.publisherRevenueUSD);
  const ratePct = authorRoyaltyRatePercentForSaleSource(
    book,
    next.source as SaleSource
  );
  next.authorRoyalty = (
    (revUsdNum * (ratePct ?? 0)) /
    100
  ).toFixed(2);

  return next;
}

export function useSalesForm(
  books: BookListItem[],
  onAddRecord: (record: PendingSaleItem) => void,
  initialBookId?: number,
  usdRatesInitial?: Record<string, number> | null
) {
  const [formData, setFormData] = useState<FormData>({
    month: "",
    year: new Date().getFullYear().toString(),
    bookId: initialBookId ? String(initialBookId) : "",
    quantity: "",
    kenp: "",
    publisherRevenueUSD: "",
    publisherRevenueOriginal: "",
    authorRoyalty: "",
    comment: "",
    currency: "USD",
    source: "DISTRIBUTOR",
    distributor: "OTHER",
    format: "PRINT",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [lastAddedAt, setLastAddedAt] = useState<number>(0);
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

  useEffect(() => {
    if (!usdRates) return;
    setFormData((prev) =>
      applyDerivedValues(prev, usdRates, prev.source === "DISTRIBUTOR", books)
    );
  }, [usdRates, books]);

  const allowedFormats = useMemo(
    () =>
      getAllowedSaleFormats(
        formData.source,
        distributorForValidation(formData.source, formData.distributor)
      ),
    [formData.source, formData.distributor]
  );

  const handleInputChange = (
    field: string,
    value: string | boolean | { month: string; year: string }
  ) => {
    // 1. SANITIZATION: Clean JPY inputs before they touch the state
    let processedValue = value;
    if (
      field === "publisherRevenueOriginal" && 
      formData.currency === "JPY" && 
      typeof value === "string"
    ) {
      processedValue = value.replace(/[^0-9]/g, ""); // Strips decimals/letters instantly
    }
  
    // 2. BUILD THE "NEXT" OBJECT
    let next: FormData = { ...formData };
    if (field === "date" && typeof value === "object" && value !== null && "month" in value) {
      next.month = value.month;
      next.year = value.year;
    } else if (field === "distributor" || field === "format" || field === "source") {
      next = { ...next, [field]: processedValue } as FormData;
    } else {
      next = { ...next, [field]: processedValue } as FormData;
    }
  
    // 3. COERCE RULES (Sync)
    next = coerceSaleForm(next, field);
  
    // 4. IMMEDIATE SYNC UPDATE (Keeps the UI snappy and cursor in place)
    setFormData(next);
  
    // 5. Derived revenue / royalty (sync using cached USD rates)
    const isMoneyField = field === "publisherRevenueOriginal" || field === "currency";
    const isAutoRevenueQty =
      field === "quantity" &&
      (next.source === "HAND_SOLD" || next.source === "KICKSTARTER");

    // These fields require an update to Royalty or Revenue
    const triggerFields = ["quantity", "publisherRevenueOriginal", "currency", "bookId", "source", "format"];

    if (triggerFields.includes(field)) {
      const needsCurrency = isMoneyField || isAutoRevenueQty;
      const updatedData = applyDerivedValues(
        next,
        usdRates,
        needsCurrency,
        books
      );

      setFormData((prev) => ({
        ...updatedData,
        ...(typeof processedValue === "string"
          ? { [field as keyof FormData]: prev[field as keyof FormData] }
          : {}),
      }));
    }
  
    // 7. ERROR CLEARING
    if (field === "date" && formErrors.date) {
      setFormErrors(({ date, ...rest }) => rest);
    } else if (formErrors[field]) {
      setFormErrors(({ [field]: _, ...rest }) => rest);
    }
  };

  const handleBlur = (field: "publisherRevenueOriginal") => {
    const rawValue = formData[field];
    if (
      !rawValue ||
      isNaN(Number(String(rawValue).replace(/[,\s]/g, "")))
    ) {
      return;
    }

    const precision = formData.currency === "JPY" ? 0 : 2;

    const normalized = normalizeCurrency(rawValue).toFixed(precision);
    const intermediate = { ...formData, [field]: normalized };

    setFormData(intermediate);
    const forceFx = intermediate.source === "DISTRIBUTOR";
    setFormData(applyDerivedValues(intermediate, usdRates, forceFx, books));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setFormErrors({});
    const book = books.find((b) => b.id === parseInt(formData.bookId, 10));
    if (!book) return setFormErrors({ bookId: "Please select a book" });

    const dateCheck = validateDatePeriod(formData.year, formData.month);
    if (!dateCheck.success) return setFormErrors({ date: dateCheck.error });

    const isKu = formData.format === "KINDLE_UNLIMITED";

    const qtyCheck = isKu ? null : validateQuantity(formData.quantity);
    const kenpCheck = isKu
      ? validateNonNegativeNumber(formData.kenp, "KENP")
      : null;

    if (!isKu && qtyCheck && !qtyCheck.success) {
      return setFormErrors({ quantity: qtyCheck.error });
    }
    if (isKu && kenpCheck && !kenpCheck.success) {
      return setFormErrors({ kenp: kenpCheck.error });
    }

    const originalRevCheck = validateCurrency(
      formData.publisherRevenueOriginal,
      "Publisher revenue"
    );
    if (!originalRevCheck.success) {
      return setFormErrors({ publisherRevenue: originalRevCheck.error });
    }

    const currencyUpper = formData.currency.trim().toUpperCase();
    if (
      formData.source === "DISTRIBUTOR" &&
      currencyUpper !== "USD"
    ) {
      if (!usdRates) {
        return setFormErrors({
          publisherRevenue:
            "Exchange rates are still loading. Please wait a moment and try again.",
        });
      }
      if (
        originalRevCheck.data > 0 &&
        convertOriginalToUsd(
          originalRevCheck.data,
          currencyUpper,
          usdRates
        ) === null
      ) {
        return setFormErrors({
          publisherRevenue:
            "No exchange rate for this currency. Use USD or another listed currency.",
        });
      }
    }

    const royaltyAmount = normalizeCurrency(formData.authorRoyalty);
    const revUsd = normalizeCurrency(formData.publisherRevenueUSD);
    const limitCheck = validateRoyaltyLimit(royaltyAmount, revUsd);
    if (!limitCheck.success) {
      return setFormErrors({ authorRoyalty: limitCheck.error });
    }

    const distributorForSave = distributorForValidation(
      formData.source,
      formData.distributor
    );

    const quantityVal = isKu
      ? null
      : qtyCheck?.success
        ? qtyCheck.data
        : null;
    const kenpVal = isKu && kenpCheck?.success ? kenpCheck.data : null;

    const saleCheck = validateSaleRecord({
      source: formData.source,
      distributor: distributorForSave,
      format: formData.format,
      quantity: quantityVal,
      kenp: kenpVal,
      currency: currencyUpper,
      publisherRevenueOriginal: originalRevCheck.data,
      publisherRevenueUSD: revUsd,
      authorRoyalty: royaltyAmount,
      comment: formData.comment.trim() || null,
    });

    if (!saleCheck.success) {
      return setFormErrors({ publisherRevenue: saleCheck.error });
    }

    onAddRecord({
      id: crypto.randomUUID(),
      bookId: book.id,
      title: book.title,
      author: book.author,
      date: dateCheck.data,
      quantity: quantityVal,
      kenp: kenpVal,
      format: formData.format,
      distributor: distributorForSave,
      publisherRevenueOriginal: originalRevCheck.data,
      publisherRevenueUSD: revUsd,
      authorRoyalty: royaltyAmount,
      paid: false,
      currency: currencyUpper,
      comment: formData.comment.trim() || undefined,
      source: formData.source,
    });

    setFormData((prev) => ({
      ...prev,
      quantity: "",
      kenp: "",
      publisherRevenueOriginal: "",
      publisherRevenueUSD: "",
      authorRoyalty: "",
      comment: "",
    }));
    setLastAddedAt(Date.now());
  };

  return {
    formData,
    formErrors,
    handleInputChange,
    handleBlur,
    handleSubmit,
    allowedFormats,
    lastAddedAt,
  };
}
