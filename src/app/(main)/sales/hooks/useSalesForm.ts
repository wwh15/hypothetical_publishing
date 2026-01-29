import { useState, useEffect } from "react";
import { PendingSaleItem } from "@/lib/data/records";
import { BookListItem } from "@/lib/data/books";

interface Book {
  id: number;
  title: string;
  author: { name: string };
  authorRoyaltyRate: number;
}

interface FormData {
  month: string;
  year: string;
  bookId: string;
  quantity: string;
  publisherRevenue: string;
  authorRoyalty: string;
  royaltyOverridden: boolean;
}

export function useSalesForm(
  books: BookListItem[],
  onAddRecord: (record: PendingSaleItem) => void
) {
  const [formData, setFormData] = useState<FormData>({
    month: "",
    year: new Date().getFullYear().toString(),
    bookId: "",
    quantity: "",
    publisherRevenue: "",
    authorRoyalty: "",
    royaltyOverridden: false,
  });

  // Calculate royalty when publisher revenue or book changes
  useEffect(() => {
    if (
      formData.bookId &&
      formData.publisherRevenue &&
      !formData.royaltyOverridden
    ) {
      const book = books.find((b) => b.id === parseInt(formData.bookId));
      if (book) {
        const calculatedRoyalty =
          parseFloat(formData.publisherRevenue) * book.defaultRoyaltyRate / 100;
        setFormData((prev) => ({
          ...prev,
          authorRoyalty: isNaN(calculatedRoyalty)
            ? ""
            : calculatedRoyalty.toFixed(2),
        }));
      }
    }
  }, [
    formData.bookId,
    formData.publisherRevenue,
    formData.royaltyOverridden,
    books,
  ]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "publisherRevenue" || field === "bookId"
        ? { royaltyOverridden: false }
        : {}),
    }));
  };

  const handleRoyaltyChange = (value: string) => {
    setFormData((prev) => {
      const book = books.find((b) => b.id === parseInt(prev.bookId));
      const calculatedValue =
        book && prev.publisherRevenue
          ? (parseFloat(prev.publisherRevenue) * book.defaultRoyaltyRate / 100).toFixed(2)
          : "";

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
      const calculated =
        parseFloat(formData.publisherRevenue) * book.defaultRoyaltyRate / 100;
      setFormData((prev) => ({
        ...prev,
        authorRoyalty: calculated.toFixed(2),
        royaltyOverridden: false,
      }));
    }
  };

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

    const selectedBook = books.find((b) => b.id === parseInt(formData.bookId));
    if (!selectedBook) {
      alert("Please select a valid book");
      return;
    }

    const date = `${formData.month.padStart(2, "0")}-${formData.year}`;
    const newRecord: PendingSaleItem = {
      bookId: parseInt(formData.bookId),
      title: selectedBook.title,
      author: selectedBook.authors.split(",").map(a => a.trim()),
      date,
      quantity: parseInt(formData.quantity),
      publisherRevenue: parseFloat(formData.publisherRevenue),
      authorRoyalty: parseFloat(formData.authorRoyalty),
      royaltyOverridden: formData.royaltyOverridden,
      paid: false,
    };

    onAddRecord(newRecord);

    // Clear form but keep month/year and book
    setFormData((prev) => ({
      month: prev.month,
      year: prev.year,
      bookId: prev.bookId,
      quantity: "",
      publisherRevenue: "",
      authorRoyalty: "",
      royaltyOverridden: false,
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