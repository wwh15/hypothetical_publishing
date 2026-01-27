'use server';

import {
  getBooksData as getBooksDataFromDb,
  getBookById as getBookByIdFromDb,
  createBook as createBookInDb,
  BookListItem,
  BookDetail,
  CreateBookInput,
} from "@/lib/data/books";
import { revalidatePath } from "next/cache";

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

// Create a new book
export async function createBook(input: CreateBookInput) {
  const result = await createBookInDb(input);

  // Revalidate the books pages after successful creation
  if (result.success) {
    revalidatePath("/books");
    revalidatePath(`/books/${result.bookId}`);
  }

  return result;
}
