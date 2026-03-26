// src/hooks/useBookSearch.ts
import { BookListItem } from "@/lib/data/books";
import { useState, useMemo } from "react";
import { normalizeASIN } from "@/lib/validation";

function normalizeIsbnLike(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/[^0-9xX]/g, "").toUpperCase();
}

/** Pure filter: same logic the hook uses. Exported for tests. */
export function filterBooksBySearch(
  books: BookListItem[],
  searchQuery: string
): BookListItem[] {
  if (!searchQuery.trim()) {
    return books;
  }
  const q = searchQuery.toLowerCase().trim();
  const normalizedIsbnQuery = normalizeIsbnLike(searchQuery);
  const hasIsbnQuery = normalizedIsbnQuery.length > 0;
  const asinQuery = normalizeASIN(searchQuery);
  const hasAsinQuery = asinQuery != null && asinQuery.length >= 2;

  const scored = books.flatMap((book) => {
    const titleMatch = book.title.toLowerCase().includes(q);
    const authorList = book.author
      .split(",")
      .map((a) => a.trim().toLowerCase());
    const authorMatch = authorList.some((name) => name && name.includes(q));
    const bookIsbn13 = normalizeIsbnLike(book.isbn13);
    const bookIsbn10 = normalizeIsbnLike(book.isbn10);
    const isbn13Match =
      hasIsbnQuery && bookIsbn13.includes(normalizedIsbnQuery);
    const isbn10Match =
      hasIsbnQuery && bookIsbn10.includes(normalizedIsbnQuery);
    const bookAsin = normalizeASIN(book.asin);
    const asinMatch =
      hasAsinQuery &&
      bookAsin != null &&
      bookAsin.includes(asinQuery!);

    if (!(titleMatch || authorMatch || isbn13Match || isbn10Match || asinMatch)) {
      return [];
    }

    // Ranking: exact/prefix identifier matches first, then text matches.
    let score = 0;
    if (hasIsbnQuery && (bookIsbn13 === normalizedIsbnQuery || bookIsbn10 === normalizedIsbnQuery)) score += 120;
    else if (hasIsbnQuery && (bookIsbn13.startsWith(normalizedIsbnQuery) || bookIsbn10.startsWith(normalizedIsbnQuery))) score += 90;
    else if (isbn13Match || isbn10Match) score += 70;

    if (hasAsinQuery && bookAsin === asinQuery) score += 120;
    else if (hasAsinQuery && bookAsin?.startsWith(asinQuery!)) score += 90;
    else if (asinMatch) score += 70;

    if (titleMatch) score += book.title.toLowerCase().startsWith(q) ? 50 : 35;
    if (authorMatch) score += 20;

    return [{ book, score }];
  });

  return scored
    .sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title))
    .map((entry) => entry.book);
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
