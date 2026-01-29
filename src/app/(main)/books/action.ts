'use server';

import { 
  getBooksData as getBooksDataFromDb, 
  getBookById as getBookByIdFromDb, 
  createBook as createBookInDb,
  updateBook as updateBookInDb,
  deleteBook as deleteBookInDb,
  BookListItem, 
  BookDetail, 
  CreateBookInput,
  UpdateBookInput
} from "@/lib/data/books";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Get books list data with server-side search & pagination
export async function getBooksData({
  search,
  page,
  pageSize,
}: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: BookListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  return getBooksDataFromDb({ search, page, pageSize });
}

// Get book by ID
export async function getBookById(id: number): Promise<BookDetail | null> {
  return getBookByIdFromDb(id);
}

// Fetch book data from Open Library API by ISBN
export async function fetchBookFromOpenLibrary(isbn: string): Promise<{
  success: true;
  data: {
    title: string;
    authors: string;
    isbn13?: string;
    isbn10?: string;
    publicationYear?: number;
    publicationMonth?: string;
  };
} | {
  success: false;
  error: string;
}> {
  try {
    // Normalize ISBN (remove dashes and spaces)
    const normalizedIsbn = isbn.replace(/[-\s]/g, "");

    if (!normalizedIsbn || (normalizedIsbn.length !== 10 && normalizedIsbn.length !== 13)) {
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
    let authors: string[] = [];
    console.log(data.authors);
    if (data.authors && Array.isArray(data.authors)) {
      // Authors can be objects with 'key' or strings
      authors = await Promise.all(
        data.authors.map(async (author: any) => {
          if (typeof author === "string") {
            return author;
          }
          if (author.key) {
            // Fetch full author data if we have a key
            try {
              const authorUrl = `https://openlibrary.org${author.key}.json`;
              const authorResponse = await fetch(authorUrl);
              if (authorResponse.ok) {
                const authorData = await authorResponse.json();
                return authorData.name || author.key.split("/").pop() || "";
              }
            } catch {
              // Fallback to key if fetch fails
            }
            return author.key.split("/").pop() || "";
          }
          return "";
        })
      );
    } else if (data.author_key && Array.isArray(data.author_key)) {
      // Alternative format: author_key array
      authors = data.author_key.map((key: string) => key.split("/").pop() || "");
    }

    const authorsString = authors.filter(Boolean).join(", ") || "";

    // Extract ISBNs
    const isbn13 = data.isbn_13?.[0]?.replace(/[-\s]/g, "") || 
                   (normalizedIsbn.length === 13 ? normalizedIsbn : undefined);
    const isbn10 = data.isbn_10?.[0]?.replace(/[-\s]/g, "") || 
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
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december"
      ];
      const monthAbbr = [
        "jan", "feb", "mar", "apr", "may", "jun",
        "jul", "aug", "sep", "oct", "nov", "dec"
      ];
      
      const lowerDate = dateStr.toLowerCase();
      for (let i = 0; i < monthNames.length; i++) {
        if (lowerDate.includes(monthNames[i]) || lowerDate.includes(monthAbbr[i])) {
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

    return {
      success: true,
      data: {
        title,
        authors: authorsString,
        isbn13,
        isbn10,
        publicationYear,
        publicationMonth,
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
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
    revalidatePath('/books');
    revalidatePath(`/books/${result.bookId}`);
  }
  
  return result;
}

// Delete a book
export async function deleteBook(id: number) {
  const result = await deleteBookInDb(id);
  
  // Revalidate the books pages after successful deletion
  if (result.success) {
    revalidatePath('/books');
    // Redirect to books list since the book no longer exists
    redirect('/books');
  }
  
  return result;
}
