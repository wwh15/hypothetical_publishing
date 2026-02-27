import { getBooksData } from "@/app/(main)/books/action";
import SalesInputClient from "../components/SalesInputClient";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: Promise<{ bookId?: string }>;
}

export default async function SalesInputPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const bookIdParam = params?.bookId;
  const initialBookId =
    bookIdParam != null && bookIdParam !== ""
      ? parseInt(bookIdParam, 10)
      : undefined;
  const validInitialBookId =
    initialBookId != null && Number.isFinite(initialBookId)
      ? initialBookId
      : undefined;

  const { items: booksData } = await getBooksData({
    search: "",
    page: 1,
    pageSize: 2000,
  });

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <BackLink href="/sales/records">Back to Sales</BackLink>
          {validInitialBookId != null && (
            <>
              <span className="text-muted-foreground">·</span>
              <BackLink href={`/books/${validInitialBookId}`}>
                Back to book
              </BackLink>
            </>
          )}
        </div>
        <h1 className="text-3xl font-bold mb-2">Add Sales Records</h1>
        <p className="text-muted-foreground">
          Input sales records and review before submitting to the database.
        </p>
      </div>
      <SalesInputClient
        booksData={booksData}
        initialBookId={validInitialBookId}
      />
    </div>
  );
}
