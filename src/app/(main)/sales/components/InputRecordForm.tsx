"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { PendingSaleItem } from "@/lib/data/records";
import { cn } from "@/lib/utils";

interface Book {
  id: number;
  title: string;
  author: { name: string };
  authorRoyaltyRate: number;
}

interface InputRecordFormProps {
  onAddRecord: (record: PendingSaleItem) => void;
}

// Mock books data - replace with real API call when books API is ready
const MOCK_BOOKS: Book[] = [
  { id: 1, title: "1984", author: { name: "George Orwell" }, authorRoyaltyRate: 0.25 },
  { id: 2, title: "Animal Farm", author: { name: "George Orwell" }, authorRoyaltyRate: 0.25 },
  { id: 3, title: "Pride and Prejudice", author: { name: "Jane Austen" }, authorRoyaltyRate: 0.25 },
  { id: 4, title: "The Great Gatsby", author: { name: "F. Scott Fitzgerald" }, authorRoyaltyRate: 0.25 },
  { id: 5, title: "To Kill a Mockingbird", author: { name: "Harper Lee" }, authorRoyaltyRate: 0.25 },
  { id: 6, title: "The Catcher in the Rye", author: { name: "J.D. Salinger" }, authorRoyaltyRate: 0.25 },
  { id: 7, title: "Brave New World", author: { name: "Aldous Huxley" }, authorRoyaltyRate: 0.25 },
  { id: 8, title: "The Hobbit", author: { name: "J.R.R. Tolkien" }, authorRoyaltyRate: 0.25 },
  { id: 9, title: "Lord of the Rings", author: { name: "J.R.R. Tolkien" }, authorRoyaltyRate: 0.25 },
  { id: 10, title: "Moby-Dick", author: { name: "Herman Melville" }, authorRoyaltyRate: 0.25 },
];

export default function InputRecordForm({ onAddRecord }: InputRecordFormProps) {
  const [books] = useState<Book[]>(MOCK_BOOKS); // Use mock data - no API fetch needed
  const [formData, setFormData] = useState({
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
          parseFloat(formData.publisherRevenue) * book.authorRoyaltyRate;
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
      // Reset royalty override when publisher revenue or book changes
      ...(field === "publisherRevenue" || field === "bookId"
        ? { royaltyOverridden: false }
        : {}),
    }));
  };

  const handleRoyaltyChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      authorRoyalty: value,
      royaltyOverridden:
        value !== "" &&
        value !==
          (() => {
            const book = books.find((b) => b.id === parseInt(prev.bookId));
            if (book && prev.publisherRevenue) {
              return (
                parseFloat(prev.publisherRevenue) * book.authorRoyaltyRate
              ).toFixed(2);
            }
            return "";
          })(),
    }));
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
      author: selectedBook.author.name,
      date,
      quantity: parseInt(formData.quantity),
      publisherRevenue: parseFloat(formData.publisherRevenue),
      authorRoyalty: parseFloat(formData.authorRoyalty),
      royaltyOverridden: formData.royaltyOverridden,
      paid: false,
    };

    onAddRecord(newRecord);

    // Clear form but keep month/year and book for efficient input
    setFormData((prev) => ({
      month: prev.month, // Keep month
      year: prev.year, // Keep year
      bookId: prev.bookId, // Keep book
      quantity: "",
      publisherRevenue: "",
      authorRoyalty: "",
      royaltyOverridden: false,
    }));
  };

  const revertRoyalty = () => {
    const book = books.find((b) => b.id === parseInt(formData.bookId));
    if (book && formData.publisherRevenue) {
      const calculated =
        parseFloat(formData.publisherRevenue) * book.authorRoyaltyRate;
      setFormData((prev) => ({
        ...prev,
        authorRoyalty: calculated.toFixed(2),
        royaltyOverridden: false,
      }));
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Month */}
        <div className="space-y-2">
          <label
            htmlFor="month"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Month <span className="text-red-500">*</span>
          </label>
          <select
            id="month"
            value={formData.month}
            onChange={(e) => handleInputChange("month", e.target.value)}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-gray-700"
            )}
            required
          >
            <option value="">Select Month</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m.toString().padStart(2, "0")}>
                {new Date(2000, m - 1).toLocaleString("default", {
                  month: "long",
                })}
              </option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div className="space-y-2">
          <label
            htmlFor="year"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Year <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="year"
            value={formData.year}
            onChange={(e) => handleInputChange("year", e.target.value)}
            min="2000"
            max="2100"
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-gray-700"
            )}
            required
          />
        </div>

        {/* Book */}
        <div className="space-y-2">
          <label
            htmlFor="book"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Book <span className="text-red-500">*</span>
          </label>
          <select
            id="book"
            value={formData.bookId}
            onChange={(e) => handleInputChange("bookId", e.target.value)}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-gray-700"
            )}
            required
          >
            <option value="">Select Book</option>
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title} - {book.author.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <label
            htmlFor="quantity"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Quantity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="quantity"
            value={formData.quantity}
            onChange={(e) => handleInputChange("quantity", e.target.value)}
            min="1"
            step="1"
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-gray-700"
            )}
            required
          />
        </div>

        {/* Publisher Revenue */}
        <div className="space-y-2">
          <label
            htmlFor="publisherRevenue"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Publisher Revenue ($) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="publisherRevenue"
            value={formData.publisherRevenue}
            onChange={(e) =>
              handleInputChange("publisherRevenue", e.target.value)
            }
            min="0"
            step="0.01"
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-gray-700"
            )}
            required
          />
        </div>

        {/* Author Royalty */}
        <div className="space-y-2">
          <label
            htmlFor="authorRoyalty"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Author Royalty ($) <span className="text-red-500">*</span>
            {formData.royaltyOverridden && (
              <span className="ml-2 text-xs text-orange-600 font-normal">
                (Overridden)
              </span>
            )}
          </label>
          <div className="space-y-1">
            <input
              type="number"
              id="authorRoyalty"
              value={formData.authorRoyalty}
              onChange={(e) => handleRoyaltyChange(e.target.value)}
              min="0"
              step="0.01"
              className={cn(
                "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background",
                "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "dark:bg-gray-700",
                formData.royaltyOverridden
                  ? "border-orange-500 dark:border-orange-600"
                  : "border-input"
              )}
              required
            />
            {formData.royaltyOverridden && (
              <button
                type="button"
                onClick={revertRoyalty}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                Revert to calculated value
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          className={cn(
            "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            "h-10 px-4 py-2",
            "bg-blue-600 text-white hover:bg-blue-700"
          )}
        >
          <Plus className="h-4 w-4" />
          Add Record
        </button>
      </div>
    </form>
  );
}