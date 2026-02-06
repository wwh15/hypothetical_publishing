import { getBooksData } from "@/app/(main)/books/action";
import SalesInputClient from "../components/SalesInputClient";
import Link from "next/link";

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
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Link
            href="/sales"
            className="text-blue-600 hover:underline text-sm"
          >
            ← Back to Sales
          </Link>
          {validInitialBookId != null && (
            <>
              <span className="text-muted-foreground">·</span>
              <Link
                href={`/books/${validInitialBookId}`}
                className="text-blue-600 hover:underline text-sm"
              >
                Back to book
              </Link>
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
