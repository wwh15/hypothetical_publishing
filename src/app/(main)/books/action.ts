'use server';

import { getBooksData as getBooksDataFromDb, getBookById as getBookByIdFromDb, createBook as createBookInDb, BookListItem, BookDetail, CreateBookInput } from "@/lib/data/books";
import { revalidatePath } from "next/cache";

// Get books list data
export async function getBooksData(): Promise<BookListItem[]> {
  return getBooksDataFromDb();
}

// Get book by ID
export async function getBookById(id: number): Promise<BookDetail | null> {
  return getBookByIdFromDb(id);
}

// Create a new book
export async function createBook(input: CreateBookInput) {
  const result = await createBookInDb(input);
  
  // Revalidate the books pages after successful creation
  if (result.success) {
    revalidatePath('/books');
    revalidatePath(`/books/${result.bookId}`);
  }
  
  return result;
}
