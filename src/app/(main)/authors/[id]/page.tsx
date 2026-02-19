import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteAuthor, getAuthorBooks, getAuthorById } from "../actions";
import { AuthorBooksTable } from "../components/AuthorBooksTable";
import { Button } from "@/components/ui/button";
import { DeleteAuthorButton } from "../components/DeleteAuthorButton";
// import { getAuthorById } from "../action"; // Future server action

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AuthorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const authorId = parseInt(id);

  const authorByIdResponse = await getAuthorById(authorId);
  const booksResponse = await getAuthorBooks(authorId);

  // 1. Handle Hard Failures (DB is down, etc.)
  if (!authorByIdResponse.success) {
    throw new Error(authorByIdResponse.error); // Triggers your error.tsx boundary
  }

  // 2. Handle "Quiet" Failure (ID doesn't exist in DB)
  if (authorByIdResponse.data === null) {
    notFound(); // Redirects to your 404 page
  }

  const author = authorByIdResponse.data;

  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      {/* Header / Breadcrumb */}
      <div className="mb-8">
        <Link 
          href="/authors"
          className="text-blue-600 hover:underline mb-2 inline-block text-sm"
        >
          ← Back to Authors
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{author.name}</h1>
        <p className="text-muted-foreground mt-2">
          View and manage author profile information.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-8">
        
        {/* Profile Information Section */}
        <section>
          <h2 className="text-xl font-semibold mb-6 border-b pb-2">Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">
                Full Name
              </label>
              <p className="text-lg font-medium">{author.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">
                Email Address
              </label>
              <p className="text-lg">{author.email}</p>
            </div>
            {/* You can add more placeholder fields here like "Joined Date" or "Total Books" */}
          </div>
        </section>

        <div className="border-b pb-2 w-full"/>


        <section className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold">Books</h2>
          </div>
          {booksResponse.success ? (
            <AuthorBooksTable 
            data={booksResponse.data} 
            authorName={author.name} 
          />
          ) : (
            <p className="text-muted-foreground text-sm">
              No sales records yet. Add one using the button above or from Sales → Add Sales Records.
            </p>
          )}
        </section>

        {/* Action Buttons Section */}
        <section className="pt-6 border-t border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap gap-4">
            <Link
              href={`/authors/${authorId}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Edit Author
            </Link>
            
            {/* Placeholder for a Delete component */}
            <DeleteAuthorButton authorId={authorId} authorName={author.name} bookCount={booksResponse.data?.length ?? 0} />
          </div>
        </section>
      </div>
    </div>
  );
}