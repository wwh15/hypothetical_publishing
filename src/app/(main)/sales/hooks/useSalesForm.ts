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
    const rev = (book.coverPrice - book.printCost) * quantity;
    return rev.toFixed(2);
  }
  return "";
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

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const calculateDerivedValues = (next: FormData): FormData => {
    const book = books.find((b) => b.id === parseInt(next.bookId, 10));
    if (!book) return next;

    if (next.source === "HAND_SOLD") {
      next.currency = "USD";
      const qty = normalizeQuantity(next.quantity);
      const revUsd = calcHandSoldPublisherRevenueUSD(book, qty);
      next.publisherRevenueOriginal = revUsd;
      next.publisherRevenueUSD = revUsd;
    } else {
      const originalAmount = Number(next.publisherRevenueOriginal || 0);
      next.publisherRevenueUSD = convertCurrency(
        originalAmount,
        next.currency
      ).toFixed(2);
    }

    const revUsdNum = normalizeCurrency(next.publisherRevenueUSD);
    const ratePct =
      next.source === "HAND_SOLD"
        ? book.handSoldRoyaltyRate
        : book.distRoyaltyRate;
    const royalty =
      next.publisherRevenueUSD !== ""
        ? normalizeCurrency((revUsdNum * (ratePct ?? 0)) / 100)
        : 0;
    next.authorRoyalty =
      next.publisherRevenueUSD !== "" ? royalty.toFixed(2) : "";

    return next;
  };

  const handleInputChange = (
    field: string,
    value: string | boolean | { month: string; year: string }
  ) => {
    setFormData((prev) => {
      let next: FormData = { ...prev };

      if (
        field === "date" &&
        typeof value === "object" &&
        value !== null &&
        "month" in value
      ) {
        next.month = value.month;
        next.year = value.year;
      } else {
        next = { ...next, [field]: value } as FormData;
      }

      if (field === "source" && value === "HAND_SOLD") {
        next.format = "PRINT";
        next.kenp = "";
      }

      if (field === "source" && value === "DISTRIBUTOR") {
        next.distributor = next.distributor ?? "OTHER";
        next.format = coerceFormatForSourceDistributor(
          "DISTRIBUTOR",
          next.distributor,
          next.format
        );
      }

      if (field === "distributor" && next.source === "DISTRIBUTOR") {
        next.distributor = value as Distributor;
        if (next.distributor === "OTHER" && next.format === "KINDLE_UNLIMITED") {
          next.format = "PRINT";
          next.kenp = "";
        }
        next.format = coerceFormatForSourceDistributor(
          "DISTRIBUTOR",
          next.distributor,
          next.format
        );
      }

      if (field === "format") {
        next.format = value as SaleFormat;
        if (next.source === "DISTRIBUTOR") {
          next.distributor = coerceDistributorForFormat(
            next.source,
            next.format,
            next.distributor
          );
          next.format = coerceFormatForSourceDistributor(
            "DISTRIBUTOR",
            next.distributor,
            next.format
          );
        }
        if (next.format !== "KINDLE_UNLIMITED") {
          next.kenp = "";
        } else {
          next.quantity = "";
        }
      }

      return calculateDerivedValues(next);
    });

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
      next.publisherRevenueOriginal = normalizeCurrency(
        prev.publisherRevenueOriginal
      ).toFixed(2);
      return calculateDerivedValues(next);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const book = books.find((b) => b.id === parseInt(formData.bookId, 10));
    if (!book) return setFormErrors({ bookId: "Please select a book" });

    const dateCheck = validateDatePeriod(formData.year, formData.month);
    if (!dateCheck.success) return setFormErrors({ date: dateCheck.error });

    const isKu = formData.format === "KINDLE_UNLIMITED";
    const qtyCheck = validateQuantity(formData.quantity);
    const kenpCheck = validateNonNegativeNumber(formData.kenp, "KENP");
    const originalRevCheck = validateCurrency(formData.publisherRevenueOriginal);

    const newErrors: Record<string, string> = {};

    if (!originalRevCheck.success) {
      newErrors.publisherRevenue = originalRevCheck.error;
    }

    if (isKu) {
      if (!kenpCheck.success) newErrors.kenp = kenpCheck.error;
    } else {
      if (!qtyCheck.success) newErrors.quantity = qtyCheck.error;
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    if (!originalRevCheck.success) return;

    const publisherRevenueOriginal = originalRevCheck.data;
    const publisherRevenueUSD = normalizeCurrency(formData.publisherRevenueUSD);
    const ratePct =
      formData.source === "HAND_SOLD"
        ? book.handSoldRoyaltyRate
        : book.distRoyaltyRate;
    const authorRoyalty = normalizeCurrency(
      (publisherRevenueUSD * (ratePct ?? 0)) / 100
    );

    let quantityToSave: number | null;
    let kenpToSave: number | null;
    if (isKu) {
      if (!kenpCheck.success) return;
      quantityToSave = null;
      kenpToSave = kenpCheck.data;
    } else {
      if (!qtyCheck.success) return;
      quantityToSave = qtyCheck.data;
      kenpToSave = null;
    }

    const distributorForSave: Distributor | null =
      formData.source === "HAND_SOLD" ? null : formData.distributor;

    onAddRecord({
      clientId: crypto.randomUUID(),
      bookId: book.id,
      title: book.title,
      author: book.author,
      date: dateCheck.data,
      quantity: quantityToSave,
      kenp: kenpToSave,
      format: formData.format,
      distributor: distributorForSave,
      publisherRevenueOriginal,
      publisherRevenueUSD,
      authorRoyalty,
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

  const allowedFormats =
    formData.source === "HAND_SOLD"
      ? getAllowedSaleFormats("HAND_SOLD", null)
      : getAllowedSaleFormats("DISTRIBUTOR", formData.distributor);

  return {
    formData,
    formErrors,
    handleInputChange,
    handleBlur,
    handleSubmit,
    allowedFormats,
  };
}
