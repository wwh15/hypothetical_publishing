"use client";

import { useState } from "react";
import { deleteBook } from "../../action";
import { cn } from "@/lib/utils";

interface DeleteBookButtonProps {
  bookId: number;
  bookTitle: string;
}

export default function DeleteBookButton({ bookId, bookTitle }: DeleteBookButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    
    const result = await deleteBook(bookId);
    
    if (!result.success) {
      alert(result.error || "Failed to delete book");
      setIsDeleting(false);
      setShowConfirm(false);
    }
    // If successful, deleteBook action will redirect to /books
  };

  if (showConfirm) {
    return (
      <div className="flex gap-2 items-center">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Delete &quot;{bookTitle}&quot;?
        </span>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={cn(
            "px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isDeleting ? "Deleting..." : "Confirm"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
          className={cn(
            "px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
    >
      Delete Book
    </button>
  );
}
