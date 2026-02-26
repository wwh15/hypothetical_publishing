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
import {
  uploadBookCoverArt,
  removeBookCoverArt,
} from "@/lib/data/books";
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
  sortColumns,
}: {
  search?: string;
  page?: number;
  pageSize?: number;
  sortColumns?: { field: string; direction: "asc" | "desc" }[];
}): Promise<{
  items: BookListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  return getBooksDataFromDb({ search, page, pageSize, sortColumns });
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

// Open Library often appends volume number, e.g. "Song of Ice and Fire (3)". Strip that for matching.
function normalizeSeriesNameForMatch(name: string): string {
  return name
    .trim()
    .replace(/\s*\(\s*#?\d+\s*\)\s*$/, "") // trailing "(3)" or "(#3)"
    .trim();
}

// Resolve Open Library series name to an internal series (case-insensitive, normalized whitespace).
function matchSeries(
  olSeriesName: string,
  seriesList: { id: number; name: string }[]
): { id: number; name: string } | null {
  const normalized = normalizeSeriesNameForMatch(olSeriesName)
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!normalized) return null;
  return (
    seriesList.find(
      (s) =>
        normalizeSeriesNameForMatch(s.name).toLowerCase().replace(/\s+/g, " ") ===
        normalized
    ) ?? null
  );
}

// Get series name from Open Library so we can string-match to our internal series.
// Prefer the edition's "series" field when present (some books have it); otherwise
// try work.series / work.serial_works.
async function fetchSeriesNameFromEdition(
  editionData: { works?: { key: string }[]; series?: unknown }
): Promise<string | null> {
  // 1. Edition series field (string, string[], or objects with name/title/key)
  if (editionData.series != null) {
    const raw = editionData.series;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0];
      if (typeof first === "string" && first.trim()) return first.trim();
      const obj = first as { name?: string; title?: string; key?: string } | undefined;
      if (obj?.name?.trim()) return obj.name.trim();
      if (obj?.title?.trim()) return obj.title.trim();
      if (typeof obj?.key === "string") {
        try {
          const res = await fetch(
            `https://openlibrary.org${obj.key}.json`,
            { headers: { Accept: "application/json" } }
          );
          if (!res.ok) return null;
          const data = (await res.json()) as { title?: string; name?: string };
          const n = data.title ?? data.name;
          return typeof n === "string" && n.trim() ? n.trim() : null;
        } catch {
          return null;
        }
      }
    }
  }

  // 2. Fallback: fetch work and read series/serial_works
  const works = editionData.works;
  if (!works?.length || !works[0]?.key) return null;

  try {
    const workRes = await fetch(
      `https://openlibrary.org${works[0].key}.json`,
      { headers: { Accept: "application/json" } }
    );
    if (!workRes.ok) return null;
    const work = (await workRes.json()) as Record<string, unknown>;

    const serialWorks = work.serial_works as { series?: { key?: string } }[] | undefined;
    if (Array.isArray(serialWorks) && serialWorks.length > 0 && serialWorks[0]?.series?.key) {
      const seriesKey = serialWorks[0].series.key as string;
      const seriesRes = await fetch(
        `https://openlibrary.org${seriesKey}.json`,
        { headers: { Accept: "application/json" } }
      );
      if (!seriesRes.ok) return null;
      const seriesData = (await seriesRes.json()) as { title?: string; name?: string };
      const name = seriesData.title ?? seriesData.name;
      return typeof name === "string" && name.trim() ? name.trim() : null;
    }

    const seriesArr = work.series as { key?: string; name?: string; title?: string }[] | undefined;
    if (Array.isArray(seriesArr) && seriesArr.length > 0) {
      const first = seriesArr[0];
      const name = first?.name ?? first?.title;
      if (typeof name === "string" && name.trim()) return name.trim();
      if (typeof first?.key === "string") {
        const seriesRes = await fetch(
          `https://openlibrary.org${first.key}.json`,
          { headers: { Accept: "application/json" } }
        );
        if (!seriesRes.ok) return null;
        const seriesData = (await seriesRes.json()) as { title?: string; name?: string };
        const n = seriesData.title ?? seriesData.name;
        return typeof n === "string" && n.trim() ? n.trim() : null;
      }
    }
  } catch {
    // ignore fetch/parse errors
  }
  return null;
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
        matchedSeriesId: number | null;
        matchedSeriesName: string;
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

    const [internalAuthors, internalSeries] = await Promise.all([
      asyncGetAllAuthors(),
      getAllSeriesFromDb(),
    ]);
    const matchedAuthor = matchAuthor(author.trim(), internalAuthors);
    const olSeriesName = await fetchSeriesNameFromEdition(data);
    const matchedSeries =
      olSeriesName != null
        ? matchSeries(olSeriesName, internalSeries)
        : null;

    return {
      success: true,
      data: {
        title,
        author,
        isbn13,
        isbn10,
        publicationYear,
        publicationMonth,
        matchedAuthorId: matchedAuthor?.id ?? null,
        matchedAuthorName: matchedAuthor?.name ?? "",
        matchedAuthorEmail: matchedAuthor?.email ?? null,
        matchedSeriesId: matchedSeries?.id ?? null,
        matchedSeriesName: matchedSeries?.name ?? "",
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

// Upload cover art for a book (edit only)
export async function uploadCoverArt(
  bookId: number,
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const file = formData.get("cover") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false, error: "No file selected." };
  }

  const result = await uploadBookCoverArt(bookId, file);
  if (!result.success) {
    return result;
  }

  revalidatePath("/books");
  revalidatePath(`/books/${bookId}`);
  revalidatePath(`/books/${bookId}/edit`);
  return { success: true };
}

// Remove cover art from a book
export async function removeCoverArt(
  bookId: number
): Promise<{ success: true } | { success: false; error: string }> {
  const result = await removeBookCoverArt(bookId);
  if (!result.success) {
    return result;
  }

  revalidatePath("/books");
  revalidatePath(`/books/${bookId}`);
  revalidatePath(`/books/${bookId}/edit`);
  return { success: true };
}
