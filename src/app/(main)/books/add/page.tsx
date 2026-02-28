import { BackLink } from "@/components/BackLink";
import BookForm from '../components/BookForm';

export const dynamic = "force-dynamic";

export default function AddBookPage() {
  return (
    <div className="container mx-auto py-10 px-4 sm:px-6">
      <div className="mb-6">
        <BackLink href="/books" className="mb-2">
          Back to Books
        </BackLink>
        <h1 className="text-3xl font-bold">Add New Book</h1>
        <p className="text-muted-foreground mt-2">
          Create a new book entry in the system
        </p>
      </div>

      <BookForm mode="create" />
    </div>
  );
}
