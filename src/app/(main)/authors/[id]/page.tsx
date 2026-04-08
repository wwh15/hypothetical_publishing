import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { getAuthorBooks, getAuthorById } from "../actions";
import { DeleteAuthorButton } from "../components/DeleteAuthorButton";
import { AuthorRoyaltyReportForm } from "../../reports/author-royalty/components/AuthorRoyaltyReportForm";
import { getDefaultQuarterRange } from "../../reports/author-royalty/lib/quarters";
import AuthorBooksTable from "../components/AuthorBooksTable";
import { Button } from "@/components/ui/button";
// import { getAuthorById } from "../action"; // Future server action

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AuthorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const authorId = parseInt(id);

  const authorByIdResponse = await getAuthorById(authorId);
  const authorBooksResponse = await getAuthorBooks(authorId);

  const defaultRange = getDefaultQuarterRange();
  // 1. Handle Hard Failures (DB is down, etc.)
  if (!authorByIdResponse.success) {
    throw new Error(authorByIdResponse.error); // Triggers your error.tsx boundary
  }

  // 2. Handle "Quiet" Failure (ID doesn't exist in DB)
  if (authorByIdResponse.data === null) {
    notFound(); // Redirects to your 404 page
  }

  const author = authorByIdResponse.data;

  // 1. Handle Hard Failures (DB is down, etc.)
  if (!authorBooksResponse.success) {
    throw new Error(authorBooksResponse.error); // Triggers your error.tsx boundary
  }

  // 2. Handle "Quiet" Failure (ID doesn't exist in DB)
  if (authorBooksResponse.data === null) {
    notFound(); // Redirects to your 404 page
  }

  const authorBooks = authorBooksResponse.data;

  return (
    <div className="py-10">
      {/* Header / Breadcrumb */}
      <header className="mb-8">
        <BackLink href="/authors" className="mb-4 inline-block">
          Back to Authors
        </BackLink>
        <div className="flex flex-col gap-4 border-b border-border/80 pb-6  sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{author.name}</h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              View and manage author profile information.
            </p>
            <div className="flex shrink-0 flex-wrap items-center gap-2 mt-6">
            <Button asChild>
              <Link href={`/authors/${authorId}/edit`}>Edit Author</Link>
            </Button>
            <DeleteAuthorButton
              authorId={authorId}
              authorName={author.name}
              bookCount={authorBooks.length}
            />
          </div>
          </div>
          
        </div>
      </header>

      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Profile Information Section */}
          <section className="xl:col-span-2 bg-white shadow-sm dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-semibold">Profile Information</h2>
            </div>
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
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  Paypal.me Username
                </label>
                {author.payPalUsername ? (
                  <p className="text-lg">{author.payPalUsername}</p>
                ) : (
                  <Button asChild size="sm" variant="outline" className="self-start mt-2">
                    <Link href={`/authors/${authorId}/edit`}>
                     + Add PayPal
                    </Link>
                  </Button>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  Venmo Username
                </label>
                {author.venmoUsername ? (
                  <p className="text-lg">{author.venmoUsername}</p>
                ) : (
                  <Button asChild size="sm" variant="outline" className="self-start mt-2">
                    <Link href={`/authors/${authorId}/edit`}>
                      + Add Venmo
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </section>

          {/* Royalty Form Section */}
          <section className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Generate Author Royalty</h2>
            <AuthorRoyaltyReportForm
              initialAuthorId={authorId}
              initialStartQuarter={defaultRange.startQuarter}
              initialStartYear={defaultRange.startYear}
              initialEndQuarter={defaultRange.endQuarter}
              initialEndYear={defaultRange.endYear}
              hideAuthorSelect={true}
            />
          </section>
        </div>

        {/* Books Section */}
        <section className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold">Books</h2>
          </div>
          <AuthorBooksTable rows={authorBooks} />
        </section>
      </div>
    </div>
  );
}
