import { DEFAULT_BOOK_SORT_SPEC, parseBookSortSpec } from "@/lib/data/books";
import { getBooksData } from "./action";
import BooksTable from "./components/BooksTable";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface BooksPageProps {
  searchParams?: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    showAll?: string;
  }>;
}

export default async function BooksPage({ searchParams }: BooksPageProps) {
  const params = await searchParams;
  const search = params?.q ?? "";
  const pageParam = params?.page ?? "1";
  const page = Number(pageParam) || 1;
  const showAll = params?.showAll === "true";
  const normalPageSize = 20; // Normal pagination size
  const pageSize = showAll ? 10000 : normalPageSize;
  // First load (no sort in URL): show default sort in UI. User cleared (sort=): show no summary; server still uses default order when sortSpec is empty.
  const sortSpec =
    params?.sort === undefined
      ? DEFAULT_BOOK_SORT_SPEC
      : params.sort === ""
        ? []
        : parseBookSortSpec(params.sort);

  const { items, total, page: currentPage, pageSize: effectivePageSize } =
    await getBooksData({ search, page, pageSize, sortSpec });

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
        key={`${search}-${params?.sort ?? ""}-${currentPage}-${showAll}`}
        books={items}
        total={total}
        page={currentPage}
        pageSize={effectivePageSize}
        search={search}
        sortSpec={sortSpec}
        showAll={showAll}
        normalPageSize={normalPageSize}
      />
    </div>
  );
}
