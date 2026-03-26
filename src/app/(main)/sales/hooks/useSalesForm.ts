"use client";

import { useMemo, useState } from "react";
import type { Distributor, SaleFormat } from "@prisma/client";
import { PendingSaleItem } from "@/lib/data/records";
import { BookListItem } from "@/lib/data/books";
import {
  validateDatePeriod,
  normalizeCurrency,
  normalizeQuantity,
  validateRoyaltyLimit,
  validateQuantity,
  validateCurrency,
  validateNonNegativeNumber,
} from "@/lib/validation";
import { convertCurrency } from "@/lib/currency-conversion";
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
  source: "DISTRIBUTOR" | "HAND_SOLD";
  distributor: Distributor;
  format: SaleFormat;
}

function distributorForValidation(
  source: FormData["source"],
  d: Distributor
) {
  return source === "DISTRIBUTOR" ? d : null;
}

function calcHandSoldPublisherRevenueUSD(
  book: BookListItem,
  quantity: number
): string {
  if (quantity > 0) {
    const rev = (book.coverPrice - (book.printCost ?? 0)) * quantity;
    return rev.toFixed(2);
  }
  return "0.00";
}

/** Coerce format/distributor/source rules after a field change */
function coerceSaleForm(next: FormData, changedField: string): FormData {
  let n = { ...next };

  if (n.source === "HAND_SOLD") {
    n = { ...n, format: "PRINT", kenp: "" };
  }

  if (n.format === "KINDLE_UNLIMITED" && n.source === "DISTRIBUTOR") {
    n = { ...n, distributor: "AMAZON" };
  }

  const dist = distributorForValidation(n.source, n.distributor);
  const allowed = getAllowedSaleFormats(n.source, dist);
  if (!allowed.includes(n.format)) {
    n = { ...n, format: allowed[0] ?? "PRINT" };
  }

  if (changedField === "format") {
    if (n.format === "KINDLE_UNLIMITED") {
      n = { ...n, quantity: "" };
    } else {
      n = { ...n, kenp: "" };
    }
  }

  if (changedField === "source" && n.source === "HAND_SOLD") {
    n = { ...n, kenp: "" };
  }

  return n;
}

export function useSalesForm(
  books: BookListItem[],
  onAddRecord: (record: PendingSaleItem) => void,
  initialBookId?: number
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

  const [isCalculating, setIsCalculating] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const allowedFormats = useMemo(
    () =>
      getAllowedSaleFormats(
        formData.source,
        distributorForValidation(formData.source, formData.distributor)
      ),
    [formData.source, formData.distributor]
  );

  const calculateDerivedValues = async (
    current: FormData, 
    forceCurrencyUpdate = false // Only true if Currency or Original Revenue changed
  ): Promise<FormData> => {
    const next = { ...current };
    const book = books.find((b) => b.id === parseInt(next.bookId, 10));
    if (!book) return next;
  
    setIsCalculating(true);
  
    try {
      // 1. REVENUE CALCULATION
      if (next.source === "HAND_SOLD") {
        next.currency = "USD";
        const qty = normalizeQuantity(next.quantity);
        const revUsdStr = calcHandSoldPublisherRevenueUSD(book, qty);
        next.publisherRevenueOriginal = revUsdStr;
        next.publisherRevenueUSD = revUsdStr;
      } else if (forceCurrencyUpdate) {
        // ONLY call the API if currency/amount actually changed
        const originalAmount = Number(next.publisherRevenueOriginal.replace(/[,\s]/g, "") || 0);
        
        if (next.currency === "USD") {
          next.publisherRevenueUSD = originalAmount.toFixed(2);
        } else if (originalAmount > 0) {
          const converted = await convertCurrency(originalAmount, next.currency);
          next.publisherRevenueUSD = converted.toFixed(2);
        } else {
          next.publisherRevenueUSD = "0.00";
        }
      }
  
      // 2. ROYALTY CALCULATION (This is always "Sync" and fast)
      const revUsdNum = normalizeCurrency(next.publisherRevenueUSD);
      const ratePct = next.source === "HAND_SOLD" ? book.handSoldRoyaltyRate : book.distRoyaltyRate;
      const royalty = (revUsdNum * (ratePct ?? 0)) / 100;
      
      next.authorRoyalty = royalty.toFixed(2);
  
      return next;
    } finally {
      setIsCalculating(false);
    }
  };

  const handleInputChange = async (
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
  
    // 5. SELECTIVE ASYNC CALCULATION
    const isMoneyField = field === "publisherRevenueOriginal" || field === "currency";
    const isHandSoldQty = field === "quantity" && next.source === "HAND_SOLD";
    
    // These fields require an update to Royalty or Revenue
    const triggerFields = ["quantity", "publisherRevenueOriginal", "currency", "bookId", "source", "format"];
  
    if (triggerFields.includes(field)) {
      const needsApiConversion = isMoneyField || isHandSoldQty;
      const updatedData = await calculateDerivedValues(next, needsApiConversion);
    
      setFormData((prev) => ({
        ...updatedData,
        // Cast 'field' as keyof FormData to satisfy the index signature requirement
        ...(typeof processedValue === "string" 
          ? { [field as keyof FormData]: prev[field as keyof FormData] } 
          : {})
      }));
    }
  
    // 7. ERROR CLEARING
    if (field === "date" && formErrors.date) {
      setFormErrors(({ date, ...rest }) => rest);
    } else if (formErrors[field]) {
      setFormErrors(({ [field]: _, ...rest }) => rest);
    }
  };

  const handleBlur = async (field: "publisherRevenueOriginal") => {
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
    const final = await calculateDerivedValues(intermediate);
    setFormData(final);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCalculating) return;

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
      currency: formData.currency.trim().toUpperCase(),
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
      currency: formData.currency.trim().toUpperCase(),
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
  };

  return {
    formData,
    formErrors,
    isCalculating,
    handleInputChange,
    handleBlur,
    handleSubmit,
    allowedFormats,
  };
}
