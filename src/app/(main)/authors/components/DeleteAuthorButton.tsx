"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteAuthor } from "../actions";

export interface DeleteAuthorButtonProps {
  authorId: number;
  authorName: string;
  bookCount: number;
}

export function DeleteAuthorButton({
  authorId,
  authorName,
  bookCount,
}: DeleteAuthorButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAuthor(authorId);
      if (!result.success) {
        alert(result.error ?? "Failed to delete author");
        setIsDeleting(false);
        setOpen(false);
        return;
      }
      router.push("/authors");
    } catch (error) {
      console.error("Delete error:", error);
      setIsDeleting(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setOpen(true)}
        className="px-4 py-2"
      >
        <Trash2 className="size-4" />
        Delete Author
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => isDeleting && e.preventDefault()}
          onEscapeKeyDown={(e) => isDeleting && e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="size-10 shrink-0" aria-hidden />
              <DialogTitle className="text-xl">Delete this author?</DialogTitle>
            </div>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2 text-left">
                <p className="text-foreground font-medium">
                  You are about to permanently delete:
                </p>
                <div className="rounded-md border border-border bg-muted/50 px-3 py-2">
                  <p className="font-semibold text-foreground">{authorName}</p>
                  <p className="text-muted-foreground text-sm italic">
                    ID: {authorId}
                  </p>
                </div>

                {bookCount > 0 && (
                  <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2">
                    <p className="text-amber-700 dark:text-amber-400 font-medium">
                      This author has {bookCount} book
                      {bookCount !== 1 ? "s" : ""}.
                    </p>
                  </div>
                )}
                <p className="text-muted-foreground text-sm">
                  Deleting this author will also permanently remove all
                  associated books and their sales records. This action cannot
                  be undone.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-4">
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
                : "Delete author and all associated data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
