'use server';

import { getBooksData as getBooksDataFromDb, getBookById as getBookByIdFromDb, BookListItem, BookDetail } from "@/lib/data/books";

// Get books list data
export async function getBooksData(): Promise<BookListItem[]> {
  return getBooksDataFromDb();
}

// Get book by ID
export async function getBookById(id: number): Promise<BookDetail | null> {
  return getBookByIdFromDb(id);
}
