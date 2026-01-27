import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import BookForm from "../../books/components/BookForm";

export default function AddBookModal() {
  return (
    <Dialog>
      {/* DialogTrigger wraps the button that opens the modal */}
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Add Book</Button>
      </DialogTrigger>

      {/* DialogContent contains everything inside the modal */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Book</DialogTitle>
        </DialogHeader>

        <BookForm/>
      </DialogContent>
    </Dialog>
  );
}
