"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createBook,
  updateBook,
  reorderSeriesBooks,
  fetchBookFromOpenLibrary,
  getAllSeries,
} from "../action";
import { BookDetail, BookListItem, SeriesListItem } from "@/lib/data/books";
import { cn } from "@/lib/utils";
import { Search, Loader2, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeriesSelectBox } from "@/components/SeriesSelectBox";
import SeriesOrderModal, { CURRENT_BOOK_SENTINEL } from "./SeriesOrderModal";
import { AuthorSelectBox } from "../../authors/components/AuthorSelectBox";
import { getAllAuthors } from "../../authors/actions";
import { Author } from "@prisma/client";

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
  const [authors, setAuthors] = useState<Author[]>([]);
  const [isLoadingAuthors, setIsLoadingAuthors] = useState(true);
  const [selectedAuthorId, setSelectedAuthorId] = useState<number | null>(null);
  const [series, setSeries] = useState<SeriesListItem[]>([]);
  const [isLoadingSeries, setIsLoadingSeries] = useState(true);
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(null);
  const [seriesOrderModalOpen, setSeriesOrderModalOpen] = useState(false);
  /** Desired order from modal when current book is unsaved (ids, with CURRENT_BOOK_SENTINEL for this book) */
  const [seriesOrderOverride, setSeriesOrderOverride] = useState<
    number[] | null
  >(null);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    email: "",
    isbn13: "",
    isbn10: "",
    publicationMonth: "",
    publicationYear: "",
    distRoyaltyRate: "50", // Default 50%
    handSoldRoyaltyRate: "20", // Default 20%
    coverPrice: "",
    printCost: "",
  });

  // Track if form has been initialized to prevent resetting user changes
  const formInitializedRef = useRef(false);

  // Reset initialization flag when bookId or mode changes
  useEffect(() => {
    formInitializedRef.current = false;
  }, [bookId, mode]);

  // Populate form with initial data if editing (only once per book/mode)
  useEffect(() => {
    if (initialData && mode === "edit" && !formInitializedRef.current) {
      const month = initialData.publicationDate
        ? String(initialData.publicationDate.getMonth() + 1).padStart(2, "0")
        : "";
      const year = initialData.publicationDate
        ? initialData.publicationDate.getFullYear().toString()
        : "";
      setFormData({
        title: initialData.title,
        author: initialData.author,
        email: initialData.email,
        isbn13: initialData.isbn13 || "",
        isbn10: initialData.isbn10 || "",
        publicationMonth: month,
        publicationYear: year,
        distRoyaltyRate: initialData.distRoyaltyRate.toString(),
        handSoldRoyaltyRate: initialData.handSoldRoyaltyRate.toString(),
        coverPrice: initialData.coverPrice?.toString() ?? "",
        printCost: initialData.printCost?.toString() ?? "",
      });
      
      // Set series information only on initial load
      if (initialData.seriesId !== null && initialData.seriesId !== undefined) {
        setSelectedSeriesId(initialData.seriesId);
      } else {
        setSelectedSeriesId(null);
      }
      setSeriesOrderOverride(null);

      // Set author information only on initial load
      if (initialData.authorId !== null && initialData.authorId !== undefined) {
        setSelectedAuthorId(initialData.authorId);
      } else {
        setSelectedAuthorId(null);
      }

      formInitializedRef.current = true;
    }
  }, [initialData, mode, bookId]);

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

  // Fetch authors on mount
  useEffect(() => {
    async function loadAuthors() {
      try {
        setIsLoadingAuthors(true);
        const authorsList = await getAllAuthors();
        setAuthors(authorsList);
      } catch (err) {
        console.error("Failed to load authors:", err);
      } finally {
        setIsLoadingAuthors(false);
      }
    }
    loadAuthors();
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
        // Pre-populate form with fetched data (Open Library returns month/year)
        const data = result.data as {
          publicationMonth?: string;
          publicationYear?: number;
        };
        setFormData({...formData,
          title: result.data.title || "",
          author: result.data.author || "",
          isbn13: result.data.isbn13 || "",
          isbn10: result.data.isbn10 || "",
          publicationMonth: data.publicationMonth || "",
          publicationYear: data.publicationYear?.toString() || "",
          distRoyaltyRate: "50", // Default to 50% for imported books
          handSoldRoyaltyRate: "20", // Default to 20% for imported books
          coverPrice: "",
          printCost: "",
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

    if (!formData.author.trim()) {
      setError("Author name is required");
      setIsSubmitting(false);
      return;
    }

    if (!selectedAuthorId) {
      setError("Please select an author before saving.");
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

    // Validate royalty rates
    const distRate = formData.distRoyaltyRate
      ? parseFloat(formData.distRoyaltyRate)
      : undefined;
    const handSoldRate = formData.handSoldRoyaltyRate
      ? parseFloat(formData.handSoldRoyaltyRate)
      : undefined;

    if (distRate !== undefined && (distRate < 0 || distRate > 100)) {
      setError("Distributor royalty rate must be between 0 and 100");
      setIsSubmitting(false);
      return;
    }
    if (handSoldRate !== undefined && (handSoldRate < 0 || handSoldRate > 100)) {
      setError("Hand-sold royalty rate must be between 0 and 100");
      setIsSubmitting(false);
      return;
    }

    // Validate publication year if provided (books: 1000 to current year + 1)
    const BOOK_PUBLICATION_YEAR_MIN = 1000;
    const BOOK_PUBLICATION_YEAR_MAX = new Date().getFullYear() + 1;
    const publicationYear = formData.publicationYear
      ? parseInt(formData.publicationYear)
      : undefined;

    if (
      publicationYear !== undefined &&
      (publicationYear < BOOK_PUBLICATION_YEAR_MIN ||
        publicationYear > BOOK_PUBLICATION_YEAR_MAX)
    ) {
      setError(
        `Publication year must be between ${BOOK_PUBLICATION_YEAR_MIN} and ${BOOK_PUBLICATION_YEAR_MAX}`
      );
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

    // Handle series data (order is auto-assigned or set via reorder modal)
    const seriesId = selectedSeriesId;

    const publicationDate =
      publicationYear && formData.publicationMonth
        ? new Date(publicationYear, parseInt(formData.publicationMonth, 10) - 1, 1)
        : null;

    try {
      const bookData = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        authorId: selectedAuthorId,
        email: formData.email.trim(),
        isbn13: isbn13 || undefined,
        isbn10: isbn10 || undefined,
        publicationDate,
        distRoyaltyRate: distRate,
        handSoldRoyaltyRate: handSoldRate,
        coverPrice: formData.coverPrice ? parseFloat(formData.coverPrice) : null,
        printCost: formData.printCost ? parseFloat(formData.printCost) : null,
        seriesId: seriesId ?? null,
        seriesOrder: undefined, // Backend auto-assigns when adding to series
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
        const savedBookId = result.bookId!;

        // Apply series order if user set it in the modal (with unsaved current book)
        if (
          seriesOrderOverride &&
          seriesId !== null &&
          seriesOrderOverride.some((id) => id === CURRENT_BOOK_SENTINEL)
        ) {
          const orderedIds = seriesOrderOverride.map((id) =>
            id === CURRENT_BOOK_SENTINEL ? savedBookId : id
          );
          const reorderResult = await reorderSeriesBooks(seriesId, orderedIds);
          if (!reorderResult.success) {
            setError(
              reorderResult.error ?? "Book saved but failed to apply series order"
            );
            setIsSubmitting(false);
            return;
          }
        }

        let isbn13Val = isbn13 || null;
        let isbn10Val = isbn10 || null;

        if (initialIsbn) {
          const n = initialIsbn.replace(/\D/g, "");
          if (n.length === 13) isbn13Val = n;
          else if (n.length === 10) isbn10Val = n;
        }

        if (inModal && onModalSuccess) {
          const sortKey = publicationDate
            ? `${publicationDate.getFullYear()}-${String(
                publicationDate.getMonth() + 1,
              ).padStart(2, "0")}`
            : "9999-99";
          const book: BookListItem = {
            id: result.bookId!,
            title: formData.title.trim(),
            author: formData.author.trim(),
            isbn13: isbn13Val,
            isbn10: isbn10Val,
            publicationDate,
            publicationSortKey: sortKey,
            distRoyaltyRate: distRate ?? 50,
            handSoldRoyaltyRate: handSoldRate ?? 20,
            coverPrice: formData.coverPrice ? parseFloat(formData.coverPrice) : null,
            printCost: formData.printCost ? parseFloat(formData.printCost) : null,
            totalSales: 0,
            seriesName: null,
            seriesOrder: null,
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

        {/* author */}
        <div className="md:col-span-2 space-y-2">
          <label
            htmlFor="author"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Author <span className="text-red-500">*</span>
            {isLoadingAuthors ? (
            <div className="flex h-10 items-center justify-start rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
              Loading authors...
            </div>
          ) : (
            <AuthorSelectBox
            authors={authors}
            selectedAuthorId={selectedAuthorId}
            onSelect={(authorId) => {
              setSelectedAuthorId(authorId);
            }}
          />
          )}
          </label>
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

        {/* Distributor Royalty Rate */}
        <div className="space-y-2">
          <label
            htmlFor="distRoyaltyRate"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Distributor Royalty Rate (%)
          </label>
          <input
            id="distRoyaltyRate"
            type="number"
            value={formData.distRoyaltyRate}
            onChange={(e) =>
              handleInputChange("distRoyaltyRate", e.target.value)
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
            Default: 50%. Percentage of publisher revenue that goes to author for distributor sales.
          </p>
        </div>

        {/* Hand-Sold Royalty Rate */}
        <div className="space-y-2">
          <label
            htmlFor="handSoldRoyaltyRate"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Hand-Sold Royalty Rate (%)
          </label>
          <input
            id="handSoldRoyaltyRate"
            type="number"
            value={formData.handSoldRoyaltyRate}
            onChange={(e) =>
              handleInputChange("handSoldRoyaltyRate", e.target.value)
            }
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-gray-700",
            )}
            placeholder="20"
            min="0"
            max="100"
            step="0.1"
          />
          <p className="text-xs text-muted-foreground">
            Default: 20%. Percentage of (cover price - print cost) that goes to author for hand-sold copies.
          </p>
        </div>

        {/* Cover Price */}
        <div className="space-y-2">
          <label
            htmlFor="coverPrice"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Cover Price ($)
          </label>
          <input
            id="coverPrice"
            type="number"
            value={formData.coverPrice}
            onChange={(e) =>
              handleInputChange("coverPrice", e.target.value)
            }
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-gray-700",
            )}
            placeholder="25.00"
            min="0"
            step="0.01"
          />
          <p className="text-xs text-muted-foreground">
            Retail cover price per copy. Used for hand-sold revenue calculation.
          </p>
        </div>

        {/* Print Cost */}
        <div className="space-y-2">
          <label
            htmlFor="printCost"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Print Cost ($)
          </label>
          <input
            id="printCost"
            type="number"
            value={formData.printCost}
            onChange={(e) =>
              handleInputChange("printCost", e.target.value)
            }
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-gray-700",
            )}
            placeholder="5.00"
            min="0"
            step="0.01"
          />
          <p className="text-xs text-muted-foreground">
            Cost to print one copy. Used for hand-sold revenue calculation.
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
                setSeriesOrderOverride(null);
              }}
              onSeriesCreated={(newSeries) => {
                // Refresh series list so the new series appears in the dropdown
                setSeries((prev) => {
                  const updated = [...prev, newSeries].sort((a, b) => a.name.localeCompare(b.name));
                  return updated;
                });
              }}
              placeholder="Select series or add new..."
            />
          )}

          {/* Series Order - drag-and-drop reorder modal */}
          {selectedSeriesId !== null && (
            <div className="space-y-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="text-sm font-medium leading-none block mb-3">
                Series Order
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSeriesOrderModalOpen(true)}
                className="h-10"
              >
                <ListOrdered className="mr-2 h-4 w-4" />
                Reorder books in series
              </Button>
              <p className="text-xs text-muted-foreground">
                Drag and drop to set the order of books in this series. New
                books are added at the end by default.
              </p>
              <SeriesOrderModal
                open={seriesOrderModalOpen}
                onOpenChange={setSeriesOrderModalOpen}
                seriesId={selectedSeriesId}
                seriesName={
                  series.find((s) => s.id === selectedSeriesId)?.name ?? ""
                }
                currentBook={
                  mode === "create" ||
                  selectedSeriesId !== initialData?.seriesId
                    ? { title: formData.title, author: formData.author }
                    : undefined
                }
                onOrderChange={(ids) => {
                  setSeriesOrderOverride(ids);
                  setSeriesOrderModalOpen(false);
                }}
                onReorderComplete={() => router.refresh()}
              />
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
