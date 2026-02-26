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
} from "@/lib/validation";

interface FormData {
  month: string;
  year: string;
  bookId: string;
  quantity: string;
  publisherRevenue: string;
  authorRoyalty: string;
  royaltyOverridden: boolean;
  comment: string;
  source: "DISTRIBUTOR" | "HAND_SOLD";
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
    publisherRevenue: "",
    authorRoyalty: "",
    royaltyOverridden: false,
    comment: "",
    source: "DISTRIBUTOR",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const calculateDerivedValues = (next: FormData) => {
    const book = books.find((b) => b.id === parseInt(next.bookId));
    if (!book) return next;

    // Hand-Sold Auto-Revenue
    if (
      next.source === "HAND_SOLD" &&
      book.coverPrice != null &&
      book.printCost != null
    ) {
      const qty = normalizeQuantity(next.quantity);
      const rev = (book.coverPrice - book.printCost) * qty;
      next.publisherRevenue = normalizeCurrency(rev).toFixed(2);
    }

    // Royalty Calculation
    const rev = normalizeCurrency(next.publisherRevenue);
    const rate =
      next.source === "HAND_SOLD"
        ? book.handSoldRoyaltyRate
        : book.distRoyaltyRate;
    const royalty = normalizeCurrency((rev * (rate ?? 0)) / 100);
    next.authorRoyalty = next.publisherRevenue !== "" ? royalty.toFixed(2) : "";

    return next;
  };

  // Inside useSalesForm.ts

  const handleInputChange = (field: string, value: string | boolean | { month: string, year: string}) => {
    setFormData((prev) => {
      let next = { ...prev };

      // Handle the special "date" object from MonthYearSelector
      if (field === "date" && typeof value === "object") {
        next.month = value.month;
        next.year = value.year;
      } else {
        // Standard string/boolean updates
        next = { ...next, [field]: value };
      }

      // Recalculate derived values (Hand-Sold Revenue, Royalties)
      return calculateDerivedValues(next);
    });

    // Clear errors for date when updated
    if (field === "date" && formErrors.date) {
      setFormErrors(({ date: _, ...rest }) => rest);
    } else if (formErrors[field]) {
      setFormErrors(({ [field]: _, ...rest }) => rest);
    }
  };

  const handleBlur = (field: "publisherRevenue") => {
    setFormData((prev) => {
      const rawValue = prev[field];
      if (!rawValue || isNaN(Number(rawValue.replace(/[,\s]/g, "")))) {
        return prev; 
      }
  
      const next = { ...prev };
      if (field === "publisherRevenue") next.publisherRevenue = normalizeCurrency(prev.publisherRevenue).toFixed(2);
      
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
    const revCheck = validateQuantity(formData.publisherRevenue);

    if (!qtyCheck.success || !revCheck.success) {
      return setFormErrors({
        quantity: qtyCheck.success ? "" : qtyCheck.error,
        publisherRevenue: revCheck.success ? "" : revCheck.error,
      });
    }

    const royaltyAmount = normalizeCurrency(formData.authorRoyalty);
    const limitCheck = validateRoyaltyLimit(royaltyAmount, revCheck.data);
    if (!limitCheck.success)
      return setFormErrors({ authorRoyalty: limitCheck.error });

    // 4. Submit
    onAddRecord({
      bookId: book.id,
      title: book.title,
      author: book.author,
      date: dateCheck.data,
      quantity: qtyCheck.data,
      publisherRevenue: revCheck.data,
      authorRoyalty: royaltyAmount,
      royaltyOverridden: formData.royaltyOverridden,
      paid: false,
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
