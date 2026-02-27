import { getBookById } from '../../action';
import { notFound } from 'next/navigation';
import { BackLink } from "@/components/BackLink";
import BookForm from '../../components/BookForm';

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBookPage({ params }: PageProps) {
  const { id } = await params;
  const bookId = parseInt(id);

  const book = await getBookById(bookId);

  if (!book) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <BackLink href={`/books/${bookId}`} className="mb-2">
          Back to Book Details
        </BackLink>
        <h1 className="text-3xl font-bold">Edit Book</h1>
        <p className="text-muted-foreground mt-2">
          Update book information
        </p>
      </div>

      <BookForm bookId={bookId} initialData={book} mode="edit" />
    </div>
  );
}
