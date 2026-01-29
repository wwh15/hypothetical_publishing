// src/hooks/useBookSelection.ts
import { useState } from "react";

interface Book {
  id: number;
  title: string;
  author: { name: string };
}

export function useBookSelection(
  books: Book[],
  selectedBookId: string,
  onBookChange: (bookId: string) => void
) {
  const [open, setOpen] = useState(false);

  const selectedBook = books.find((b) => b.id === parseInt(selectedBookId));
  const bookDisplayValue = selectedBook
    ? `${selectedBook.title} - ${selectedBook.author.name}`
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