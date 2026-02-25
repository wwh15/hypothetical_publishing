"use client";

import { useState } from "react";
import { PendingSaleItem } from "@/lib/data/records";
import { BookListItem } from "@/lib/data/books";
import { validateDatePeriod, validatePositiveNumber } from "@/lib/validation";

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

/** Get the royalty rate (as percentage) for a book based on sale source */
function getRateForSource(book: BookListItem, source: "DISTRIBUTOR" | "HAND_SOLD"): number {
  return source === "HAND_SOLD" ? book.handSoldRoyaltyRate : book.distRoyaltyRate;
}

/** Auto-calculate revenue for hand-sold: (coverPrice - printCost) * quantity */
function calcHandSoldRevenue(book: BookListItem, quantity: number): string | null {
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
    bookId:
      initialBookId != null && Number.isFinite(initialBookId)
        ? String(initialBookId)
        : "",
    quantity: "",
    publisherRevenue: "",
    authorRoyalty: "",
    royaltyOverridden: false,
    comment: "",
    source: "DISTRIBUTOR",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        [field]: value,
      } as FormData;

      const book = books.find((b) => b.id === parseInt(next.bookId));
      const qty = parseInt(next.quantity) || 0;

      // Auto-calculate revenue for hand-sold
      if (next.source === "HAND_SOLD" && book && (field === "quantity" || field === "bookId" || field === "source")) {
        const autoRevenue = calcHandSoldRevenue(book, qty);
        if (autoRevenue) {
          next.publisherRevenue = autoRevenue;
        }
      }

      // Derive author royalty
      if (field === "publisherRevenue" || field === "bookId" || field === "source" || field === "quantity") {
        const rev = parseFloat(next.publisherRevenue);
        const rate = book ? getRateForSource(book, next.source) : 0;
        next.authorRoyalty =
          book && !isNaN(rev)
            ? ((rev * rate) / 100).toFixed(2)
            : "";
      }
      return next;
    });
    
    // Clear error for this field when user starts typing again
    if (formErrors[field]) {
      setFormErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const selectedBook = books.find((b) => b.id === parseInt(formData.bookId));
    if (!selectedBook) {
      setFormErrors({ bookId: "Please select a valid book" });
      return;
    }

    // Parse numeric values for validation
    const revenue = parseFloat(formData.publisherRevenue);
    const royalty = parseFloat(formData.authorRoyalty);
    const quantity = parseInt(formData.quantity, 10);

    // Run structured validations (Matches Bulk Flow)
    const dateCheck = validateDatePeriod(formData.year, formData.month);
    const revenueCheck = validatePositiveNumber(revenue, "Publisher Revenue");
    const royaltyCheck = validatePositiveNumber(royalty, "Author Royalty");
    const qtyCheck = validatePositiveNumber(quantity, "Quantity");

    // Collect Errors
    if (!revenueCheck.success || !royaltyCheck.success || !qtyCheck.success || !dateCheck.success) {
      const errors: Record<string, string> = {};
      if (!revenueCheck.success) errors.publisherRevenue = revenueCheck.error;
      if (!royaltyCheck.success) errors.authorRoyalty = royaltyCheck.error;
      if (!qtyCheck.success) errors.quantity = qtyCheck.error;
      if (!dateCheck.success) errors.date = dateCheck.error;
      
      setFormErrors(errors);
      return;
    }

    const trimmedComment = formData.comment.trim();

    // Map to PendingSaleItem
    const newRecord: PendingSaleItem = {
      bookId: selectedBook.id,
      title: selectedBook.title,
      author: selectedBook.author,
      date: dateCheck.data, // Using validated date string
      quantity: qtyCheck.data,
      publisherRevenue: revenueCheck.data,
      authorRoyalty: royaltyCheck.data,
      royaltyOverridden: formData.royaltyOverridden,
      paid: false,
      comment: trimmedComment || undefined,
      source: formData.source,
    };

    onAddRecord(newRecord);

    // Reset Form
    setFormData((prev) => ({
      month: prev.month,
      year: prev.year,
      bookId: prev.bookId,
      quantity: "",
      publisherRevenue: "",
      authorRoyalty: "",
      royaltyOverridden: false,
      comment: "",
      source: prev.source,
    }));
  };

  return {
    formData,
    formErrors,
    handleInputChange,
    handleSubmit,
  };
}