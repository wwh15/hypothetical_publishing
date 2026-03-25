"use client";

import { useState } from "react";
import { PendingSaleItem } from "@/lib/data/records";
import { BookListItem } from "@/lib/data/books";
import {
  validateDatePeriod,
  normalizeCurrency,
  normalizeQuantity,
  validateQuantity,
  validateCurrency,
  validateNonNegativeNumber,
} from "@/lib/validation";
import { convertCurrency } from "@/lib/currency-conversion";
import { getAllowedSaleFormats } from "@/lib/validation/sale";
import type { Distributor, SaleFormat } from "@prisma/client";

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

/** * Helper functions moved outside the hook for cleanliness
 */
function coerceDistributorForFormat(
  source: "DISTRIBUTOR" | "HAND_SOLD",
  format: SaleFormat,
  distributor: Distributor
): Distributor {
  if (source !== "DISTRIBUTOR") return distributor;
  if (format === "KINDLE_UNLIMITED") return "AMAZON";
  return distributor;
}

function coerceFormatForSourceDistributor(
  source: "DISTRIBUTOR" | "HAND_SOLD",
  distributor: Distributor | null,
  current: SaleFormat
): SaleFormat {
  if (source === "HAND_SOLD") return "PRINT";
  const dist = distributor ?? "OTHER";
  const allowed = getAllowedSaleFormats("DISTRIBUTOR", dist);
  if (allowed.includes(current)) return current;
  return allowed[0] ?? "PRINT";
}

function calcHandSoldPublisherRevenueUSD(book: BookListItem, quantity: number): string {
  if (quantity > 0) {
    const rev = (book.coverPrice - (book.printCost ?? 0)) * quantity;
    return rev.toFixed(2);
  }
  return "0.00";
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

  /**
   * PHASE 2: The Asynchronous Math
   */
  const calculateDerivedValues = async (current: FormData): Promise<FormData> => {
    const next = { ...current };
    const book = books.find((b) => b.id === parseInt(next.bookId, 10));
    if (!book) return next;

    setIsCalculating(true);

    try {
      if (next.source === "HAND_SOLD") {
        next.currency = "USD";
        const qty = normalizeQuantity(next.quantity);
        const revUsdStr = calcHandSoldPublisherRevenueUSD(book, qty);
        next.publisherRevenueOriginal = revUsdStr;
        next.publisherRevenueUSD = revUsdStr;
      } else {
        const originalAmount = Number(next.publisherRevenueOriginal.replace(/[,\s]/g, "") || 0);
        
        if (next.currency === "USD") {
          next.publisherRevenueUSD = originalAmount.toFixed(2);
        } else if (originalAmount > 0) {
          // Wrapped in parentheses to fix precedence bug: (await ...).toFixed()
          const converted = await convertCurrency(originalAmount, next.currency);
          next.publisherRevenueUSD = converted.toFixed(2);
        } else {
          next.publisherRevenueUSD = "0.00";
        }
      }

      // Final Royalty Logic
      const revUsdNum = normalizeCurrency(next.publisherRevenueUSD);
      const ratePct = next.source === "HAND_SOLD" 
        ? book.handSoldRoyaltyRate 
        : book.distRoyaltyRate;

      const royalty = next.publisherRevenueUSD !== "" 
        ? normalizeCurrency((revUsdNum * (ratePct ?? 0)) / 100) 
        : 0;

      next.authorRoyalty = next.publisherRevenueUSD !== "" ? royalty.toFixed(2) : "";

      // Clear any previous calculation errors
      setFormErrors((prev) => {
        const { currency: _, ...rest } = prev;
        return rest;
      });
    } catch (err) {
      console.error("Calculation Error:", err);
      setFormErrors((prev) => ({ ...prev, currency: "Currency conversion failed." }));
    } finally {
      setIsCalculating(false);
    }

    return next;
  };

  /**
   * PHASE 1: Immediate Synchronous UI Update
   */
  const handleInputChange = async (
    field: string,
    value: string | boolean | { month: string; year: string }
  ) => {
    let next: FormData = { ...formData };

    // Basic value assignment
    if (field === "date" && typeof value === "object" && value !== null && "month" in value) {
      next.month = value.month;
      next.year = value.year;
    } else {
      next = { ...next, [field]: value } as FormData;
    }

    // Business Logic Rules (Sync)
    if (field === "source" && value === "HAND_SOLD") {
      next.format = "PRINT";
      next.kenp = "";
      next.currency = "USD";
    }

    if (field === "source" && value === "DISTRIBUTOR") {
      next.distributor = next.distributor ?? "OTHER";
      next.format = coerceFormatForSourceDistributor("DISTRIBUTOR", next.distributor, next.format);
    }

    if (field === "distributor" && next.source === "DISTRIBUTOR") {
      next.distributor = value as Distributor;
      next.format = coerceFormatForSourceDistributor("DISTRIBUTOR", next.distributor, next.format);
    }

    if (field === "format") {
      next.format = value as SaleFormat;
      if (next.source === "DISTRIBUTOR") {
        next.distributor = coerceDistributorForFormat(next.source, next.format, next.distributor);
        next.format = coerceFormatForSourceDistributor("DISTRIBUTOR", next.distributor, next.format);
      }
      next.format !== "KINDLE_UNLIMITED" ? (next.kenp = "") : (next.quantity = "");
    }

    // Update UI immediately
    setFormData(next);

    // Trigger Async Calc if relevant field changed
    const triggerFields = ["quantity", "publisherRevenueOriginal", "currency", "bookId", "source", "format"];
    if (triggerFields.includes(field)) {
      const updatedData = await calculateDerivedValues(next);
      setFormData(updatedData);
    }

    // Clear UI Errors
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors((prev) => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleBlur = async (field: "publisherRevenueOriginal") => {
    const rawValue = formData[field];
    if (!rawValue) return;

    const normalized = normalizeCurrency(rawValue).toFixed(2);
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

    // Validation checks
    const dateCheck = validateDatePeriod(formData.year, formData.month);
    const qtyCheck = validateQuantity(formData.quantity);
    const kenpCheck = validateNonNegativeNumber(formData.kenp, "KENP");
    const originalRevCheck = validateCurrency(formData.publisherRevenueOriginal);

    const newErrors: Record<string, string> = {};
    if (!dateCheck.success) newErrors.date = dateCheck.error;
    if (!originalRevCheck.success) newErrors.publisherRevenue = originalRevCheck.error;
    
    const isKu = formData.format === "KINDLE_UNLIMITED";
    if (isKu && !kenpCheck.success) newErrors.kenp = kenpCheck.error;
    if (!isKu && !qtyCheck.success) newErrors.quantity = qtyCheck.error;

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    // TYPE NARROWING: Satisfy TypeScript before calling onAddRecord
    if (!dateCheck.success || !originalRevCheck.success || !qtyCheck.success || !kenpCheck.success) return;

    onAddRecord({
      clientId: crypto.randomUUID(),
      bookId: book.id,
      title: book.title,
      author: book.author,
      date: dateCheck.data,
      quantity: isKu ? null : qtyCheck.data,
      kenp: isKu ? kenpCheck.data : null,
      format: formData.format,
      distributor: formData.source === "HAND_SOLD" ? null : formData.distributor,
      publisherRevenueOriginal: originalRevCheck.data,
      publisherRevenueUSD: normalizeCurrency(formData.publisherRevenueUSD),
      authorRoyalty: normalizeCurrency(formData.authorRoyalty),
      paid: false,
      currency: formData.currency.trim().toUpperCase(),
      comment: formData.comment.trim() || undefined,
      source: formData.source,
    });

    // Reset Form
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

  const allowedFormats = formData.source === "HAND_SOLD"
    ? getAllowedSaleFormats("HAND_SOLD", null)
    : getAllowedSaleFormats("DISTRIBUTOR", formData.distributor);

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