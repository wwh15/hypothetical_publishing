// src/hooks/useBookSearch.ts
import { BookListItem } from "@/lib/data/books";
import { useState, useMemo } from "react";

/** Pure filter: same logic the hook uses. Exported for tests. */
export function filterBooksBySearch(
  books: BookListItem[],
  searchQuery: string
): BookListItem[] {
  if (!searchQuery.trim()) {
    return books;
  }
  const q = searchQuery.toLowerCase().trim();
  const norm = (s: string) => s.replace(/\D/g, "");

  const normalizedQuery = norm(searchQuery);
  const hasDigits = normalizedQuery.length > 0;

  return books.filter((book) => {
    const titleMatch = book.title.toLowerCase().includes(q);
    const authorList = book.authors
      .split(",")
      .map((a) => a.trim().toLowerCase());
    const authorMatch = authorList.some((name) => name && name.includes(q));
    const isbn13Match =
      hasDigits && book.isbn13 && norm(book.isbn13).includes(normalizedQuery);
    const isbn10Match =
      hasDigits && book.isbn10 && norm(book.isbn10).includes(normalizedQuery);

    return titleMatch || authorMatch || isbn13Match || isbn10Match;
  });
}

export function useBookSearch(books: BookListItem[]) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBooks = useMemo(
    () => filterBooksBySearch(books, searchQuery),
    [books, searchQuery]
  );

  return {
    searchQuery,
    setSearchQuery,
    filteredBooks,
  };
}
