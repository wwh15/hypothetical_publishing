// src/hooks/useBookSearch.ts
import { useState, useMemo } from "react";

interface Book {
  id: number;
  title: string;
  author: { name: string };
  authorRoyaltyRate: number;
  isbn13?: string | null;
  isbn10?: string | null;
}

export function useBookSearch(books: Book[]) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) {
      return books;
    }
    const query = searchQuery.toLowerCase();
    return books.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.author.name.toLowerCase().includes(query) ||
        (book.isbn13 && book.isbn13.replace(/\D/g, "").includes(query)) ||
        (book.isbn10 && book.isbn10.replace(/\D/g, "").includes(query)),
    );
  }, [books, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    filteredBooks,
  };
}
