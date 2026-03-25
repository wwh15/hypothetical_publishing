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

function distributorForValidation(source: FormData["source"], d: Distributor) {
  return source === "DISTRIBUTOR" ? d : null;
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

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const allowedFormats = useMemo(
    () =>
      getAllowedSaleFormats(
        formData.source,
        distributorForValidation(formData.source, formData.distributor)
      ),
    [formData.source, formData.distributor]
  );

  const calculateDerivedValues = (next: FormData) => {
    const book = books.find((b) => b.id === parseInt(next.bookId, 10));
    if (!book) return next;

    if (next.source === "HAND_SOLD") {
      const qty = normalizeQuantity(next.quantity);
      const coverPrice = Number(book.coverPrice ?? 0);
      const printCost = Number(book.printCost ?? 0);
      const rev = (coverPrice - printCost) * qty;
      next.currency = "USD";
      next.publisherRevenueOriginal = rev.toFixed(2);
      next.publisherRevenueUSD = rev.toFixed(2);
    } else {
      const originalAmount = Number(next.publisherRevenueOriginal || 0);
      next.publisherRevenueUSD = convertCurrency(
        originalAmount,
        next.currency
      ).toFixed(2);
    }

    const rev = normalizeCurrency(next.publisherRevenueUSD);
    const rate =
      next.source === "HAND_SOLD"
        ? book.handSoldRoyaltyRate
        : book.distRoyaltyRate;
    const royalty = normalizeCurrency((rev * (rate ?? 0)) / 100);
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
      } else if (field === "distributor") {
        next = { ...next, distributor: value as Distributor };
      } else if (field === "format") {
        next = { ...next, format: value as SaleFormat };
      } else if (field === "source") {
        next = { ...next, source: value as "DISTRIBUTOR" | "HAND_SOLD" };
      } else {
        next = { ...next, [field]: value } as FormData;
      }

      next = coerceSaleForm(next, field);
      return calculateDerivedValues(next);
    });

    if (field === "date" && formErrors.date) {
      setFormErrors((prevErrors) => {
        const next = { ...prevErrors };
        delete next.date;
        return next;
      });
    } else if (formErrors[field]) {
      setFormErrors((prevErrors) => {
        const next = { ...prevErrors };
        delete next[field];
        return next;
      });
    }
  };

  const handleBlur = (field: "publisherRevenueOriginal") => {
    setFormData((prev) => {
      const rawValue = prev[field];
      if (!rawValue || isNaN(Number(String(rawValue).replace(/[,\s]/g, "")))) {
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
    handleInputChange,
    handleBlur,
    handleSubmit,
    allowedFormats,
  };
}
