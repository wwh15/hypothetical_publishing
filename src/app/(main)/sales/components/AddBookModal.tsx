"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import BookForm from "../../books/components/BookForm";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookListItem } from "@/lib/data/books";

interface AddBookModalProps {
  initialIsbn?: string;
  inPreview?: boolean;
  onBookCreated?: (book: BookListItem) => void;
}

export default function AddBookModal({ initialIsbn, inPreview = false, onBookCreated }: AddBookModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* DialogTrigger wraps the button that opens the modal */}
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className={inPreview ? "h-7 px-2 text-xs" : ""}>
          Add Book
        </Button>
      </DialogTrigger>

      {/* DialogContent contains everything inside the modal */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Book</DialogTitle>
        </DialogHeader>

        <BookForm
          mode="create"
          initialIsbn={initialIsbn}
          inModal={true}
          onModalSuccess={() => {
            setOpen(false);
            if (!inPreview) router.refresh();
          }}
          onModalCancel={() => {
            setOpen(false);
          }}
          onBookCreated={onBookCreated}
        />
      </DialogContent>
    </Dialog>
  );
}
