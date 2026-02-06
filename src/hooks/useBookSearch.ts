// src/hooks/useBookSearch.ts
import { BookListItem } from "@/lib/data/books";
import { useState, useMemo } from "react";

export function useBookSearch(books: BookListItem[]) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) {
      return books;
    }
    const q = searchQuery.toLowerCase().trim();
    const norm = (s: string) => s.replace(/\D/g, "");

    return books.filter((book) => {
      const titleMatch = book.title.toLowerCase().includes(q);
      const authorList = book.authors
        .split(",")
        .map((a) => a.trim().toLowerCase());
      const authorMatch = authorList.some((name) => name && name.includes(q));
      const isbn13Match =
        book.isbn13 && norm(book.isbn13).includes(norm(searchQuery));
      const isbn10Match =
        book.isbn10 && norm(book.isbn10).includes(norm(searchQuery));

      return titleMatch || authorMatch || isbn13Match || isbn10Match;
    });
  }, [books, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    filteredBooks,
  };
}
