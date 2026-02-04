import { getBooksData } from "./action";
import BooksTable from "./components/BooksTable";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface BooksPageProps {
  searchParams?: Promise<{
    q?: string;
    page?: string;
    sortBy?: string;
    sortDir?: string;
  }>;
}

export default async function BooksPage({ searchParams }: BooksPageProps) {
  const params = await searchParams;
  const search = params?.q ?? "";
  const pageParam = params?.page ?? "1";
  const page = Number(pageParam) || 1;
  const pageSize = 20;
  const sortBy = params?.sortBy ?? "title";
  const sortDir = (params?.sortDir === "desc" ? "desc" : "asc") as "asc" | "desc";

  const { items, total, page: currentPage, pageSize: effectivePageSize } =
    await getBooksData({ search, page, pageSize, sortBy, sortDir });

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Books</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all books
          </p>
        </div>
        <Link
          href="/books/add"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
        >
          <span>+</span>
          Add Book
        </Link>
      </div>
      <BooksTable
        key={`${search}-${sortBy}-${sortDir}-${currentPage}`}
        books={items}
        total={total}
        page={currentPage}
        pageSize={effectivePageSize}
        search={search}
        sortBy={sortBy}
        sortDir={sortDir}
      />
    </div>
  );
}
