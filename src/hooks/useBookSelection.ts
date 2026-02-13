// src/hooks/useBookSelection.ts
import { BookListItem } from "@/lib/data/books";
import { useState } from "react";

export function useBookSelection(
  books: BookListItem[],
  selectedBookId: string,
  onBookChange: (bookId: string) => void
) {
  const [open, setOpen] = useState(false);

  const selectedBook = books.find((b) => b.id === parseInt(selectedBookId));
  const bookDisplayValue = selectedBook
    ? `${selectedBook.title} - ${selectedBook.author}`
    : "Select Book";

  const handleBookSelect = (bookId: string) => {
    onBookChange(bookId);
    setOpen(false);
  };

  return {
    open,
    setOpen,
    bookDisplayValue,
    handleBookSelect,
  };
}