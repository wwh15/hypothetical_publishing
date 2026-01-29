import Link from 'next/link';
import BookForm from '../components/BookForm';

export const dynamic = "force-dynamic";

export default function AddBookPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Link 
          href="/books"
          className="text-blue-600 hover:underline mb-2 inline-block"
        >
          ← Back to Books
        </Link>
        <h1 className="text-3xl font-bold">Add New Book</h1>
        <p className="text-muted-foreground mt-2">
          Create a new book entry in the system
        </p>
      </div>

      <BookForm mode="create" />
    </div>
  );
}
