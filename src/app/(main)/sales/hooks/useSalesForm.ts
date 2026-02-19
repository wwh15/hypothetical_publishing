import { useState } from "react";
import { PendingSaleItem } from "@/lib/data/records";
import { BookListItem } from "@/lib/data/books";

interface FormData {
  month: string;
  year: string;
  bookId: string;
  quantity: string;
  publisherRevenue: string;
  authorRoyalty: string;
  royaltyOverridden: boolean;
  source: "DISTRIBUTOR" | "HAND_SOLD";
}

/** Get the royalty rate (as percentage) for a book based on sale source */
function getRateForSource(book: BookListItem, source: "DISTRIBUTOR" | "HAND_SOLD"): number {
  return source === "HAND_SOLD" ? book.handSoldRoyaltyRate : book.distRoyaltyRate;
}

/** Auto-calculate revenue for hand-sold: (coverPrice - printCost) * quantity */
function calcHandSoldRevenue(book: BookListItem, quantity: number): string | null {
  if (book.coverPrice != null && book.printCost != null && quantity > 0) {
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
    source: "DISTRIBUTOR",
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        [field]: value,
        ...(field === "publisherRevenue" || field === "bookId" || field === "source" || field === "quantity"
          ? { royaltyOverridden: false }
          : {}),
      } as FormData;

      const book = books.find((b) => b.id === parseInt(next.bookId));
      const qty = parseInt(next.quantity) || 0;

      // Auto-calculate revenue for hand-sold when quantity or book changes
      if (next.source === "HAND_SOLD" && book && (field === "quantity" || field === "bookId" || field === "source")) {
        const autoRevenue = calcHandSoldRevenue(book, qty);
        if (autoRevenue) {
          next.publisherRevenue = autoRevenue;
        }
      }

      // Derive author royalty when book, revenue, source, or quantity changes
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
  };

  const handleRoyaltyChange = (value: string) => {
    setFormData((prev) => {
      const book = books.find((b) => b.id === parseInt(prev.bookId));
      const rate = book ? getRateForSource(book, prev.source) : 0;
      const calculatedValue =
        book && prev.publisherRevenue
          ? ((parseFloat(prev.publisherRevenue) * rate) / 100).toFixed(2)
          : "";

      const trimmed = value.trim();
      if (trimmed === "" && calculatedValue !== "") {
        return {
          ...prev,
          authorRoyalty: calculatedValue,
          royaltyOverridden: false,
        };
      }

      return {
        ...prev,
        authorRoyalty: value,
        royaltyOverridden: value !== "" && value !== calculatedValue,
      };
    });
  };

  const revertRoyalty = () => {
    const book = books.find((b) => b.id === parseInt(formData.bookId));
    if (book && formData.publisherRevenue) {
      const rate = getRateForSource(book, formData.source);
      const calculated =
        (parseFloat(formData.publisherRevenue) * rate) / 100;
      setFormData((prev) => ({
        ...prev,
        authorRoyalty: calculated.toFixed(2),
        royaltyOverridden: false,
      }));
    }
  };

  const SALES_YEAR_MIN = 2000;
  const SALES_YEAR_MAX = 2100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !formData.month ||
      !formData.year ||
      !formData.bookId ||
      !formData.quantity ||
      !formData.publisherRevenue ||
      !formData.authorRoyalty
    ) {
      alert("Please fill in all required fields");
      return;
    }

    const year = parseInt(formData.year, 10);
    if (!Number.isInteger(year) || year < SALES_YEAR_MIN || year > SALES_YEAR_MAX) {
      alert(`Year must be between ${SALES_YEAR_MIN} and ${SALES_YEAR_MAX}`);
      return;
    }

    const selectedBook = books.find((b) => b.id === parseInt(formData.bookId));
    if (!selectedBook) {
      alert("Please select a valid book");
      return;
    }

    const date = `${formData.month.padStart(2, "0")}-${formData.year}`;
    const newRecord: PendingSaleItem = {
      bookId: parseInt(formData.bookId),
      title: selectedBook.title,
      author: selectedBook.author,
      date,
      quantity: parseInt(formData.quantity),
      publisherRevenue: parseFloat(formData.publisherRevenue),
      authorRoyalty: parseFloat(formData.authorRoyalty),
      royaltyOverridden: formData.royaltyOverridden,
      paid: false,
      source: formData.source,
    };

    onAddRecord(newRecord);

    // Clear form but keep month/year, book, and source
    setFormData((prev) => ({
      month: prev.month,
      year: prev.year,
      bookId: prev.bookId,
      quantity: "",
      publisherRevenue: "",
      authorRoyalty: "",
      royaltyOverridden: false,
      source: prev.source,
    }));
  };

  return {
    formData,
    handleInputChange,
    handleRoyaltyChange,
    handleSubmit,
    revertRoyalty,
  };
}
