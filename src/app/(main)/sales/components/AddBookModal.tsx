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

export default function AddBookModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* DialogTrigger wraps the button that opens the modal */}
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
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
          inModal={true}
          onModalSuccess={() => {
            setOpen(false);
            router.refresh()
          }}
          onModalCancel={() => {
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
