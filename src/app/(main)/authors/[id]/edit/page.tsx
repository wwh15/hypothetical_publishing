import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAuthorById } from '../../actions';
import AuthorForm from '../../components/AuthorForm';

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAuthorPage({ params }: PageProps) {
  const { id } = await params;
  const authorId = parseInt(id);

  const getAuthorResponse = await getAuthorById(authorId);
  const author = getAuthorResponse.data

  if (!author) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Link 
          href={`/authors/${authorId}`}
          className="text-blue-600 hover:underline mb-2 inline-block"
        >
          ← Back to Author Details
        </Link>
        <h1 className="text-3xl font-bold">Edit Author</h1>
        <p className="text-muted-foreground mt-2">
          Update book information
        </p>
      </div>

      <AuthorForm initialData={author} mode="edit" />
    </div>
  );
}
