import { getBooksData } from "./action";
import BooksTable from "./components/BooksTable";
import Link from "next/link";
import { parseSortParam, DEFAULT_BOOK_SORT, SortColumn } from "@/lib/types/sort";

export const dynamic = "force-dynamic";

interface BooksPageProps {
  searchParams?: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    /** Legacy params — converted to sort format */
    sortBy?: string;
    sortDir?: string;
    showAll?: string;
  }>;
}

export default async function BooksPage({ searchParams }: BooksPageProps) {
  const params = await searchParams;
  const search = params?.q ?? "";
  const pageParam = params?.page ?? "1";
  const page = Number(pageParam) || 1;
  const showAll = params?.showAll === "true";
  const normalPageSize = 20;
  const pageSize = showAll ? 10000 : normalPageSize;

  // Parse sort columns: new `sort` param > legacy `sortBy`/`sortDir` > default
  let sortColumns: SortColumn[];
  if (params?.sort === "none") {
    sortColumns = [];
  } else if (params?.sort) {
    sortColumns = parseSortParam(params.sort);
  } else if (params?.sortBy) {
    const dir = params.sortDir === "desc" ? "desc" : "asc";
    sortColumns = [{ field: params.sortBy, direction: dir }];
  } else {
    sortColumns = DEFAULT_BOOK_SORT;
  }

  const { items, total, page: currentPage, pageSize: effectivePageSize } =
    await getBooksData({ search, page, pageSize, sortColumns });

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
        key={`${search}-${JSON.stringify(sortColumns)}-${currentPage}-${showAll}`}
        books={items}
        total={total}
        page={currentPage}
        pageSize={effectivePageSize}
        search={search}
        sortColumns={sortColumns}
        showAll={showAll}
        normalPageSize={normalPageSize}
      />
    </div>
  );
}
