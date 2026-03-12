"use client";

import { useState } from "react";
import { PendingSaleItem } from "@/lib/data/records";
import { BookListItem } from "@/lib/data/books";
import {
  validateDatePeriod,
  normalizeCurrency,
  normalizeQuantity,
  validateRoyaltyLimit,
  validateQuantity,
  validateCurrency,
} from "@/lib/validation";
import { convertCurrency } from "@/lib/currency-conversion";

interface FormData {
  month: string;
  year: string;
  bookId: string;
  quantity: string;
  publisherRevenueUSD: string;
  publisherRevenueOriginal: string;
  authorRoyalty: string;
  royaltyOverridden: boolean;
  comment: string;
  currency: string;
  source: "DISTRIBUTOR" | "HAND_SOLD";
}

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
): string | null {
  if (quantity > 0) {
    const rev = (book.coverPrice - book.printCost) * quantity;
    return rev.toFixed(2);
  }
  return null;
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
    publisherRevenueUSD: "",
    publisherRevenueOriginal: "",
    authorRoyalty: "",
    royaltyOverridden: false,
    comment: "",
    currency: "USD",
    source: "DISTRIBUTOR",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const calculateDerivedValues = (next: FormData) => {
    const book = books.find((b) => b.id === parseInt(next.bookId));
    if (!book) return next;

    // 1. Handle Hand-Sold Auto-Revenue
    if (next.source === "HAND_SOLD") {
      // Per Req 3.4.1, handsold is (price - cost) * qty
      // Per your implementation logic, these are always USD
      const qty = normalizeQuantity(next.quantity);
      const coverPrice = Number(book.coverPrice ?? 0);
      const printCost = Number(book.printCost ?? 0);
      
      const rev = (coverPrice - printCost) * qty;
      
      // Lock to USD for Hand-Sold
      next.currency = "USD"; 
      next.publisherRevenueOriginal = rev.toFixed(2);
      next.publisherRevenueUSD = rev.toFixed(2);
    } else {
      // 2. Handle Distributor Conversion (Req 3.3)
      // Convert the user-entered original amount to USD
      const originalAmount = Number(next.publisherRevenueOriginal || 0);
      next.publisherRevenueUSD = convertCurrency(originalAmount, next.currency).toFixed(2);
    }

    // Royalty Calculation
    const rev = normalizeCurrency(next.publisherRevenueUSD);
    const rate =
      next.source === "HAND_SOLD"
        ? book.handSoldRoyaltyRate
        : book.distRoyaltyRate;
    const royalty = normalizeCurrency((rev * (rate ?? 0)) / 100);
    next.authorRoyalty = next.publisherRevenueUSD !== "" ? royalty.toFixed(2) : "";

    return next;
  };

  // Inside useSalesForm.ts

  const handleInputChange = (
    field: string,
    value: string | boolean | { month: string; year: string }
  ) => {
    setFormData((prev) => {
      // 1. Initialize 'next' with current state
      let next = { ...prev };

      // 2. Handle the special "date" object from MonthYearSelector
      if (
        field === "date" &&
        typeof value === "object" &&
        value !== null &&
        "month" in value
      ) {
        next.month = value.month;
        next.year = value.year;
      } else {
        // Standard string/boolean updates
        next = { ...next, [field]: value };
      }

      // 3. Trigger Conversion Logic (Requirement 3.3)
      // If currency or original revenue changed, update the USD field
      if (field === "currency" || field === "publisherRevenueOriginal") {
        next.publisherRevenueUSD = convertCurrency(
          Number(next.publisherRevenueOriginal),
          next.currency
        ).toString();
      }

      // 4. Recalculate derived values (Hand-Sold Revenue, Royalties)
      return calculateDerivedValues(next);
    });

    // 5. Clear errors for the specific field being updated
    if (field === "date" && formErrors.date) {
      setFormErrors(({ date: _, ...rest }) => rest);
    } else if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors((prevErrors) => {
        const { [field as keyof typeof prevErrors]: _, ...rest } = prevErrors;
        return rest;
      });
    }
  };

  const handleBlur = (field: "publisherRevenueOriginal") => {
    setFormData((prev) => {
      const rawValue = prev[field];
      if (!rawValue || isNaN(Number(rawValue.replace(/[,\s]/g, "")))) {
        return prev;
      }

      const next = { ...prev };
      if (field === "publisherRevenueOriginal")
        next.publisherRevenueOriginal = normalizeCurrency(
          prev.publisherRevenueOriginal
        ).toFixed(2);

      return calculateDerivedValues(next);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // 1. Context Checks
    const book = books.find((b) => b.id === parseInt(formData.bookId));
    if (!book) return setFormErrors({ bookId: "Please select a book" });

    const dateCheck = validateDatePeriod(formData.year, formData.month);
    if (!dateCheck.success) return setFormErrors({ date: dateCheck.error });

    // 3. Validation Rules
    const qtyCheck = validateQuantity(formData.quantity);
    const originalRevCheck = validateCurrency(formData.publisherRevenueOriginal);

    if (!qtyCheck.success || !originalRevCheck.success) {
      return setFormErrors({
        quantity: qtyCheck.success ? "" : qtyCheck.error,
        publisherRevenue: originalRevCheck.success ? "" : originalRevCheck.error,
      });
    }

    const originalRev = originalRevCheck.data;
    const royaltyAmount = normalizeCurrency(formData.authorRoyalty);
    const limitCheck = validateRoyaltyLimit(royaltyAmount, originalRevCheck.data);
    if (!limitCheck.success)
      return setFormErrors({ authorRoyalty: limitCheck.error });

    // 4. Submit
    onAddRecord({
      bookId: book.id,
      title: book.title,
      author: book.author,
      date: dateCheck.data,
      quantity: qtyCheck.data,
      publisherRevenueOriginal: originalRevCheck.data,
      publisherRevenueUSD: normalizeCurrency(formData.publisherRevenueUSD),
      authorRoyalty: royaltyAmount,
      royaltyOverridden: formData.royaltyOverridden,
      paid: false,
      currency: formData.currency,
      comment: formData.comment.trim() || undefined,
      source: formData.source,
    });

    // Reset keeping month/year/book context
    setFormData((prev) => ({
      ...prev,
      quantity: "",
      publisherRevenue: "",
      authorRoyalty: "",
      comment: "",
    }));
  };

  return { formData, formErrors, handleInputChange, handleBlur, handleSubmit };
}
