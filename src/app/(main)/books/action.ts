'use server';

import { 
  getBooksData as getBooksDataFromDb, 
  getBookById as getBookByIdFromDb, 
  createBook as createBookInDb,
  updateBook as updateBookInDb,
  deleteBook as deleteBookInDb,
  BookListItem, 
  BookDetail, 
  CreateBookInput,
  UpdateBookInput
} from "@/lib/data/books";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

// Update an existing book
export async function updateBook(input: UpdateBookInput) {
  const result = await updateBookInDb(input);
  
  // Revalidate the books pages after successful update
  if (result.success) {
    revalidatePath('/books');
    revalidatePath(`/books/${result.bookId}`);
  }
  
  return result;
}

// Delete a book
export async function deleteBook(id: number) {
  const result = await deleteBookInDb(id);
  
  // Revalidate the books pages after successful deletion
  if (result.success) {
    revalidatePath('/books');
    // Redirect to books list since the book no longer exists
    redirect('/books');
  }
  
  return result;
}
