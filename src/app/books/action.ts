'use server';

import { getMockBooksData, getMockBookById, BookListItem, BookDetail } from "@/lib/data/books";

// Get books list data (using mock data for now)
export async function getBooksData(): Promise<BookListItem[]> {
  return getMockBooksData();
}

// Get book by ID (using mock data for now)
export async function getBookById(id: number): Promise<BookDetail | null> {
  return getMockBookById(id);
}
