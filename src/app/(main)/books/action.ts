"use server";

import {
  getAllBooks as getAllBooksFromDb,
  getBooksData as getBooksDataFromDb,
  getBookById as getBookByIdFromDb,
  createBook as createBookInDb,
  updateBook as updateBookInDb,
  deleteBook as deleteBookInDb,
  getAllSeries as getAllSeriesFromDb,
  createSeries as createSeriesInDb,
  getBooksInSeries as getBooksInSeriesFromDb,
  reorderSeriesBooks as reorderSeriesBooksInDb,
  BookListItem,
  BookDetail,
  CreateBookInput,
  UpdateBookInput,
  SeriesListItem,
  SeriesBook,
} from "@/lib/data/books";
import { asyncGetAllAuthors } from "@/lib/data/author";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Get all books (for client-side pagination/sorting)
export async function getAllBooks(): Promise<BookListItem[]> {
  return getAllBooksFromDb();
}

// Get all series
export async function getAllSeries(): Promise<SeriesListItem[]> {
  return getAllSeriesFromDb();
}

// Create a new series
export async function createSeries(name: string, description?: string) {
  const result = await createSeriesInDb(name, description);

  // Revalidate series list after successful creation
  if (result.success) {
    revalidatePath("/books");
    revalidatePath("/books/add");
  }

  return result;
}

// Get books list data with server-side search, sort & pagination
export async function getBooksData({
  search,
  page,
  pageSize,
  sortBy,
  sortDir,
}: {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}): Promise<{
  items: BookListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  return getBooksDataFromDb({ search, page, pageSize, sortBy, sortDir });
}

// Get book by ID
export async function getBookById(id: number): Promise<BookDetail | null> {
  return getBookByIdFromDb(id);
}

// Resolve Open Library author string to an internal author (case-insensitive, normalized whitespace).
function matchAuthor(
  olAuthor: string,
  authors: { id: number; name: string; email: string | null }[]
): { id: number; name: string; email: string | null } | null {
  const normalized = olAuthor.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return (
    authors.find(
      (a) =>
        a.name.trim().toLowerCase().replace(/\s+/g, " ") === normalized
    ) ?? null
  );
}

// Fetch book data from Open Library API by ISBN
export async function fetchBookFromOpenLibrary(isbn: string): Promise<
  | {
      success: true;
      data: {
        title: string;
        author: string;
        isbn13?: string;
        isbn10?: string;
        publicationYear?: number;
        publicationMonth?: string;
        matchedAuthorId: number | null;
        matchedAuthorName: string;
        matchedAuthorEmail: string | null;
      };
    }
  | {
      success: false;
      error: string;
    }
> {
  try {
    // Normalize ISBN (remove dashes and spaces)
    const normalizedIsbn = isbn.replace(/[-\s]/g, "");

    if (
      !normalizedIsbn ||
      (normalizedIsbn.length !== 10 && normalizedIsbn.length !== 13)
    ) {
      return {
        success: false,
        error: "Please enter a valid ISBN-10 or ISBN-13",
      };
    }

    // Open Library API endpoint
    const apiUrl = `https://openlibrary.org/isbn/${normalizedIsbn}.json`;

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: "Book not found in Open Library database",
        };
      }
      return {
        success: false,
        error: `Failed to fetch book data: ${response.statusText}`,
      };
    }

    const data = await response.json();

    // Extract book information
    const title = data.title || "";
    if (!title) {
      return {
        success: false,
        error: "Book data incomplete: title not found",
      };
    }

    // Extract authors
    let author = "";

    if (data.authors && Array.isArray(data.authors)) {
      // 1. Fire off all author name requests at once
      const authorNames = await Promise.all(
        data.authors.map(async (authorRef: { key: string }) => {
          try {
            const res = await fetch(
              `https://openlibrary.org${authorRef.key}.json`
            );
            if (!res.ok) return null;
            const authorData = await res.json();
            return authorData.name;
          } catch {
            return null; // Fallback if one specific fetch fails
          }
        })
      );

      // 2. Filter out any nulls and join them
      const filteredNames = authorNames.filter(
        (name): name is string => !!name
      );
      if (filteredNames.length > 0) {
        author = filteredNames.join(", ");
      }
    }

    // Extract ISBNs
    const isbn13 =
      data.isbn_13?.[0]?.replace(/[-\s]/g, "") ||
      (normalizedIsbn.length === 13 ? normalizedIsbn : undefined);
    const isbn10 =
      data.isbn_10?.[0]?.replace(/[-\s]/g, "") ||
      (normalizedIsbn.length === 10 ? normalizedIsbn : undefined);

    // Extract publication date
    let publicationYear: number | undefined;
    let publicationMonth: string | undefined;

    if (data.publish_date) {
      // Parse various date formats
      const dateStr = data.publish_date.trim();

      // Try to extract year (look for 4-digit year)
      const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        publicationYear = parseInt(yearMatch[0], 10);
      }

      // Try to extract month (look for month names or numbers)
      const monthNames = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
      ];
      const monthAbbr = [
        "jan",
        "feb",
        "mar",
        "apr",
        "may",
        "jun",
        "jul",
        "aug",
        "sep",
        "oct",
        "nov",
        "dec",
      ];

      const lowerDate = dateStr.toLowerCase();
      for (let i = 0; i < monthNames.length; i++) {
        if (
          lowerDate.includes(monthNames[i]) ||
          lowerDate.includes(monthAbbr[i])
        ) {
          publicationMonth = (i + 1).toString().padStart(2, "0");
          break;
        }
      }

      // Try numeric month (MM-YYYY or YYYY-MM)
      const numericMonthMatch = dateStr.match(/\b(0?[1-9]|1[0-2])\b/);
      if (numericMonthMatch && !publicationMonth) {
        publicationMonth = numericMonthMatch[0].padStart(2, "0");
      }
    } else if (data.first_publish_date) {
      const yearMatch = data.first_publish_date.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        publicationYear = parseInt(yearMatch[0], 10);
      }
    }

    const internalAuthors = await asyncGetAllAuthors();
    const matched = matchAuthor(author.trim(), internalAuthors);

    return {
      success: true,
      data: {
        title,
        author,
        isbn13,
        isbn10,
        publicationYear,
        publicationMonth,
        matchedAuthorId: matched?.id ?? null,
        matchedAuthorName: matched?.name ?? "",
        matchedAuthorEmail: matched?.email ?? null,
      },
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      success: false,
      error: `Failed to fetch book data: ${errorMessage}`,
    };
  }
}

// Create a new book
export async function createBook(input: CreateBookInput) {
  const result = await createBookInDb(input);

  // Revalidate the books pages after successful creation
  if (result.success) {
    revalidatePath("/books");
    revalidatePath(`/books/${result.bookId}`);
    revalidatePath("/sales/add-record");
  }

  return result;
}

// Update an existing book
export async function updateBook(input: UpdateBookInput) {
  const result = await updateBookInDb(input);

  // Revalidate the books pages after successful update
  if (result.success) {
    revalidatePath("/books");
    revalidatePath(`/books/${result.bookId}`);
  }

  return result;
}

// Get books in a series (for reorder modal)
export async function getBooksInSeries(
  seriesId: number
): Promise<SeriesBook[]> {
  return getBooksInSeriesFromDb(seriesId);
}

// Reorder books in a series
export async function reorderSeriesBooks(
  seriesId: number,
  orderedBookIds: number[]
) {
  const result = await reorderSeriesBooksInDb(seriesId, orderedBookIds);

  if (result.success) {
    revalidatePath("/books");
    revalidatePath("/books/add");
  }

  return result;
}

// Delete a book
export async function deleteBook(id: number) {
  const result = await deleteBookInDb(id);

  // Revalidate the books pages after successful deletion
  if (result.success) {
    revalidatePath("/books");
    // Redirect to books list since the book no longer exists
    redirect("/books");
  }

  return result;
}
