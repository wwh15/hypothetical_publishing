"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBook, updateBook, fetchBookFromOpenLibrary, getAllSeries } from "../action";
import { BookDetail, BookListItem, SeriesListItem } from "@/lib/data/books";
import { cn } from "@/lib/utils";
import { Search, Loader2 } from "lucide-react";
import { title } from "process";
import { SeriesSelectBox } from "@/components/SeriesSelectBox";

interface BookFormProps {
  bookId?: number;
  initialData?: BookDetail;
  mode?: "create" | "edit";
  initialIsbn?: string;
  inModal?: boolean;
  onModalSuccess?: () => void;
  onModalCancel?: () => void;
  onBookCreated?: (book: BookListItem) => void;
}

export default function BookForm({
  bookId,
  initialData,
  mode = "create",
  initialIsbn,
  inModal,
  onModalSuccess,
  onModalCancel,
  onBookCreated,
}: BookFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isbnLookup, setIsbnLookup] = useState("");
  const [isImported, setIsImported] = useState(false);
  const [series, setSeries] = useState<SeriesListItem[]>([]);
  const [isLoadingSeries, setIsLoadingSeries] = useState(true);
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(null);
  const [seriesOrder, setSeriesOrder] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    authors: "",
    isbn13: "",
    isbn10: "",
    publicationMonth: "",
    publicationYear: "",
    defaultRoyaltyRate: "50", // Default 50%
  });

  // Populate form with initial data if editing
  useEffect(() => {
    if (initialData && mode === "edit") {
      setFormData({
        title: initialData.title,
        authors: initialData.authors,
        isbn13: initialData.isbn13 || "",
        isbn10: initialData.isbn10 || "",
        publicationMonth: initialData.publicationMonth || "",
        publicationYear: initialData.publicationYear?.toString() || "",
        defaultRoyaltyRate: initialData.defaultRoyaltyRate.toString(),
      });
      
      // Set series information
      if (initialData.seriesId !== null && initialData.seriesId !== undefined) {
        setSelectedSeriesId(initialData.seriesId);
        setSeriesOrder(initialData.seriesOrder?.toString() || "");
      } else {
        setSelectedSeriesId(null);
        setSeriesOrder("");
      }
    }
  }, [initialData, mode]);

  useEffect(() => {
    if (initialIsbn && mode === "create") {
      setIsbnLookup(initialIsbn);
    }
  }, [mode, initialIsbn]);

  // Fetch series on mount
  useEffect(() => {
    async function loadSeries() {
      try {
        setIsLoadingSeries(true);
        const seriesList = await getAllSeries();
        setSeries(seriesList);
      } catch (err) {
        console.error("Failed to load series:", err);
      } finally {
        setIsLoadingSeries(false);
      }
    }
    loadSeries();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (error) setError(null);
    // Reset imported flag if user manually edits
    if (isImported) setIsImported(false);
  };

  const handleIsbnLookup = async () => {
    if (!isbnLookup.trim()) {
      setError("Please enter an ISBN to lookup");
      return;
    }

    setIsLookingUp(true);
    setError(null);

    try {
      const result = await fetchBookFromOpenLibrary(isbnLookup.trim());

      if (result.success) {
        // Pre-populate form with fetched data
        setFormData({
          title: result.data.title || "",
          authors: result.data.authors || "",
          isbn13: result.data.isbn13 || "",
          isbn10: result.data.isbn10 || "",
          publicationMonth: result.data.publicationMonth || "",
          publicationYear: result.data.publicationYear?.toString() || "",
          defaultRoyaltyRate: "50", // Default to 50% for imported books
        });
        setIsImported(true);
        setIsbnLookup(""); // Clear lookup input
      } else {
        setError(result.error || "Failed to fetch book data");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "An unexpected error occurred");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError("Title is required");
      setIsSubmitting(false);
      return;
    }

    if (!formData.authors.trim()) {
      setError("At least one author is required");
      setIsSubmitting(false);
      return;
    }

    // Validate ISBN formats (remove dashes/spaces)
    const isbn13 = formData.isbn13.replace(/[-\s]/g, "") || undefined;
    const isbn10 = formData.isbn10.replace(/[-\s]/g, "") || undefined;

    // Validate ISBN-13 length (should be 13 digits)
    if (isbn13 && isbn13.length !== 13) {
      setError("ISBN-13 must be exactly 13 digits");
      setIsSubmitting(false);
      return;
    }

    // Validate ISBN-10 length (should be 10 characters, can include X)
    if (isbn10 && isbn10.length !== 10) {
      setError("ISBN-10 must be exactly 10 characters");
      setIsSubmitting(false);
      return;
    }

    // Validate royalty rate
    const royaltyRate = formData.defaultRoyaltyRate
      ? parseFloat(formData.defaultRoyaltyRate)
      : undefined;

    if (royaltyRate !== undefined && (royaltyRate < 0 || royaltyRate > 100)) {
      setError("Royalty rate must be between 0 and 100");
      setIsSubmitting(false);
      return;
    }

    // Validate publication year if provided
    const publicationYear = formData.publicationYear
      ? parseInt(formData.publicationYear)
      : undefined;

    if (
      publicationYear !== undefined &&
      (publicationYear < 1000 || publicationYear > new Date().getFullYear() + 1)
    ) {
      setError("Please enter a valid publication year");
      setIsSubmitting(false);
      return;
    }

    // Validate publication month if year is provided
    if (publicationYear && !formData.publicationMonth) {
      setError(
        "Publication month is required when publication year is provided",
      );
      setIsSubmitting(false);
      return;
    }

    // Validate series order if series is selected
    if (selectedSeriesId !== null && seriesOrder && (isNaN(parseInt(seriesOrder)) || parseInt(seriesOrder) < 1)) {
      setError("Series order must be a positive number");
      setIsSubmitting(false);
      return;
    }

    // Handle series data
    const seriesId = selectedSeriesId;
    const seriesOrderNum = seriesOrder ? parseInt(seriesOrder) : null;

    try {
      const bookData = {
        title: formData.title.trim(),
        authors: formData.authors.trim(),
        isbn13: isbn13 || undefined,
        isbn10: isbn10 || undefined,
        publicationMonth: formData.publicationMonth || undefined,
        publicationYear: publicationYear,
        defaultRoyaltyRate: royaltyRate,
        seriesId: seriesId ?? null,
        seriesOrder: seriesOrderNum,
      };

      let result;
      if (mode === "edit" && bookId) {
        result = await updateBook({
          id: bookId,
          ...bookData,
        });
      } else {
        result = await createBook(bookData);
      }

      if (result.success) {
        let isbn13Val = isbn13 || null;
        let isbn10Val = isbn10 || null;

        if (initialIsbn) {
          const n = initialIsbn.replace(/\D/g, "");
          if (n.length === 13) isbn13Val = n;
          else if (n.length === 10) isbn10Val = n;
        }

        if (inModal && onModalSuccess) {
          const pm = formData.publicationMonth || null;
          const py = publicationYear ?? null;
          const year = py ?? 9999;
          const month = pm ?? "99";
          const book: BookListItem = {
            id: result.bookId!,
            title: formData.title.trim(),
            authors: formData.authors.trim(),
            isbn13: isbn13Val,
            isbn10: isbn10Val,
            publicationMonth: pm,
            publicationYear: py,
            publicationSortKey: `${year}-${month}`,
            defaultRoyaltyRate: royaltyRate ?? 50,
            totalSales: 0,
          };

          onBookCreated?.(book);
          setIsSubmitting(false);
          onModalSuccess();
        } else {
          // Redirect to the book's detail page
          const redirectId = mode === "edit" ? bookId : result.bookId;
          router.push(`/books/${redirectId}`);
        }
      } else {
        setError(result.error || `Failed to ${mode} book`);
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "An unexpected error occurred");
      } else {
        setError("An unexpected error occurred");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* ISBN Lookup Section */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="text-sm font-semibold mb-3 text-blue-900 dark:text-blue-100">
          Import from Open Library
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={isbnLookup}
            onChange={(e) => setIsbnLookup(e.target.value)}
            placeholder="Enter ISBN-10 or ISBN-13"
            className={cn(
              "flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-gray-700",
            )}
            disabled={isLookingUp}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleIsbnLookup();
              }
            }}
          />
          <button
            type="button"
            onClick={handleIsbnLookup}
            disabled={isLookingUp || !isbnLookup.trim()}
            className={cn(
              "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
              "h-10 px-4 py-2",
              "bg-blue-600 text-white hover:bg-blue-700",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors",
            )}
          >
            {isLookingUp ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Looking up...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Lookup ISBN
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Enter an ISBN to automatically fetch book information from Open
          Library. You can modify any fields before saving.
        </p>
        {isImported && (
          <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
            ✓ Book data imported. Royalty rate set to 50% (default for imported
            books).
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="md:col-span-2 space-y-2">
          <label
            htmlFor="title"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange("title", e.target.value)}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-gray-700",
            )}
            placeholder="Enter book title"
            required
          />
        </div>

        {/* Authors */}
        <div className="md:col-span-2 space-y-2">
          <label
            htmlFor="authors"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Author(s) <span className="text-red-500">*</span>
          </label>
          <input
            id="authors"
            type="text"
            value={formData.authors}
            onChange={(e) => handleInputChange("authors", e.target.value)}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-gray-700",
            )}
            placeholder="Enter author names (comma-separated for multiple)"
            required
          />
          <p className="text-xs text-muted-foreground">
            Separate multiple authors with commas (e.g., &quot;John Doe, Jane Smith&quot;)
          </p>
        </div>

        {/* ISBN-13 */}
        <div className="space-y-2">
          <label
            htmlFor="isbn13"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            ISBN-13
          </label>
          <input
            id="isbn13"
            type="text"
            value={formData.isbn13}
            onChange={(e) => handleInputChange("isbn13", e.target.value)}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-gray-700",
            )}
            placeholder="9781234567890"
            maxLength={17} // Allow for dashes/spaces
          />
        </div>

        {/* ISBN-10 */}
        <div className="space-y-2">
          <label
            htmlFor="isbn10"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            ISBN-10
          </label>
          <input
            id="isbn10"
            type="text"
            value={formData.isbn10}
            onChange={(e) => handleInputChange("isbn10", e.target.value)}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-gray-700",
            )}
            placeholder="1234567890"
            maxLength={13} // Allow for dashes/spaces
          />
        </div>

        {/* Publication Month */}
        <div className="space-y-2">
          <label
            htmlFor="publicationMonth"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Publication Month
          </label>
          <select
            id="publicationMonth"
            value={formData.publicationMonth}
            onChange={(e) =>
              handleInputChange("publicationMonth", e.target.value)
            }
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-gray-700",
            )}
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

        {/* Publication Year */}
        <div className="space-y-2">
          <label
            htmlFor="publicationYear"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Publication Year
          </label>
          <input
            id="publicationYear"
            type="number"
            value={formData.publicationYear}
            onChange={(e) =>
              handleInputChange("publicationYear", e.target.value)
            }
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-gray-700",
            )}
            placeholder="2024"
            min="1000"
            max={new Date().getFullYear() + 1}
          />
        </div>

        {/* Default Royalty Rate */}
        <div className="md:col-span-2 space-y-2">
          <label
            htmlFor="defaultRoyaltyRate"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Default Royalty Rate (%)
          </label>
          <input
            id="defaultRoyaltyRate"
            type="number"
            value={formData.defaultRoyaltyRate}
            onChange={(e) =>
              handleInputChange("defaultRoyaltyRate", e.target.value)
            }
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-gray-700",
            )}
            placeholder="50"
            min="0"
            max="100"
            step="0.1"
          />
          <p className="text-xs text-muted-foreground">
            Default: 50%. This is the percentage of publisher revenue that goes
            to authors.
          </p>
        </div>

        {/* Series Selection */}
        <div className="md:col-span-2 space-y-2">
          <label
            htmlFor="series"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Series
          </label>
          {isLoadingSeries ? (
            <div className="flex h-10 items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
              Loading series...
            </div>
          ) : (
            <SeriesSelectBox
              series={series}
              selectedSeriesId={selectedSeriesId}
              onSelect={(seriesId) => {
                setSelectedSeriesId(seriesId);
                if (!seriesId) {
                  setSeriesOrder("");
                }
              }}
              onSeriesCreated={(newSeries) => {
                // Refresh series list when a new series is created
                setSeries((prev) => [...prev, newSeries].sort((a, b) => a.name.localeCompare(b.name)));
                setSelectedSeriesId(newSeries.id);
              }}
              placeholder="Select series or add new..."
            />
          )}

          {/* Series Order Input (shown when a series is selected) */}
          {selectedSeriesId !== null && (
            <div className="space-y-2">
              <label
                htmlFor="seriesOrder"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Series Order (optional)
              </label>
              <input
                id="seriesOrder"
                type="number"
                value={seriesOrder}
                onChange={(e) => setSeriesOrder(e.target.value)}
                placeholder="e.g., 1, 2, 3..."
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                  "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "dark:bg-gray-700",
                )}
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                The position of this book in the series (e.g., 1 for first book,
                2 for second book, etc.)
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <button
          type="button"
          onClick={() => (inModal ? onModalCancel?.() : router.back())}
          className={cn(
            "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            "h-10 px-4 py-2",
            "border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800",
          )}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            "h-10 px-4 py-2",
            "bg-blue-600 text-white hover:bg-blue-700",
            isSubmitting && "opacity-50 cursor-not-allowed",
          )}
        >
          {isSubmitting
            ? mode === "edit"
              ? "Updating..."
              : "Creating..."
            : mode === "edit"
              ? "Update Book"
              : "Create Book"}
        </button>
      </div>
    </form>
  );
}
