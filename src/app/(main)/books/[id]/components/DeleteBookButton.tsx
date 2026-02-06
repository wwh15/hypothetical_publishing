"use client";

import { useState } from "react";
import { deleteBook } from "../../action";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export interface DeleteBookButtonProps {
  bookId: number;
  bookTitle: string;
  authors: string;
  salesRecordCount: number;
}

export default function DeleteBookButton({
  bookId,
  bookTitle,
  authors,
  salesRecordCount,
}: DeleteBookButtonProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteBook(bookId);
    if (!result.success) {
      alert(result.error ?? "Failed to delete book");
      setIsDeleting(false);
      setOpen(false);
      return;
    }
    // Success: action redirects to /books
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setOpen(true)}
        className="px-4 py-2"
      >
        Delete Book
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isDeleting}
          onPointerDownOutside={(e) => isDeleting && e.preventDefault()}
          onEscapeKeyDown={(e) => isDeleting && e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="size-10 shrink-0" aria-hidden />
              <DialogTitle className="text-xl">
                Delete this book?
              </DialogTitle>
            </div>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2 text-left">
                <p className="text-foreground font-medium">
                  You are about to permanently delete:
                </p>
                <div className="rounded-md border border-border bg-muted/50 px-3 py-2">
                  <p className="font-semibold">{bookTitle}</p>
                  <p className="text-muted-foreground text-sm">
                    {authors}
                  </p>
                </div>
                {salesRecordCount > 0 ? (
                  <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2">
                    <p className="text-amber-700 dark:text-amber-400 font-medium">
                      This book has {salesRecordCount} sales record{salesRecordCount !== 1 ? "s" : ""}.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Deleting the book will permanently remove these sales records as well. This cannot be undone.
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    This book has no sales records. This action cannot be undone.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting
                ? "Deleting…"
                : salesRecordCount > 0
                  ? "Delete book and remove sales records"
                  : "Delete book"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
