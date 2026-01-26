// src/hooks/useBookSearch.ts
import { useState, useMemo } from "react";

interface Book {
  id: number;
  title: string;
  author: { name: string };
  authorRoyaltyRate: number;
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
        book.author.name.toLowerCase().includes(query)
    );
  }, [books, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    filteredBooks,
  };
}