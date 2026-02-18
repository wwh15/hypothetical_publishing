import { getAuthorsData } from "@/lib/data/author";
import AuthorsTable from "@/app/(main)/authors/components/AuthorsTable";

/**
 * Ensure the page is dynamic to reflect the latest denormalized
 * royalty totals and URL parameter updates.
 */
export const dynamic = "force-dynamic";

interface AuthorsPageProps {
  searchParams?: Promise<{
    q?: string;
    page?: string;
    sortBy?: string;
    sortDir?: string;
    showAll?: string;
  }>;
}

export default async function AuthorsPage({ searchParams }: AuthorsPageProps) {
  // 1. Await and extract search parameters from the URL
  const params = await searchParams;

  const search = params?.q ?? "";
  const page = Number(params?.page) || 1;
  const showAll = params?.showAll === "true";

  // Use a high limit for 'showAll' mode, otherwise default to 20
  const pageSize = showAll ? 10000 : 20;

  // Default sort for Authors is usually by name
  const sortBy = params?.sortBy ?? "name";
  const sortDir = (params?.sortDir === "asc" ? "asc" : "desc") as
    | "asc"
    | "desc";

  // 2. Fetch the data using our optimized Prisma logic
  // This handles the Decimal conversions and _count subqueries.
  const {
    items,
    total,
    page: currentPage,
    pageSize: effectivePageSize,
  } = await getAuthorsData({
    search,
    page,
    pageSize,
    sortBy,
    sortDir,
  });

  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="mb-8 space-y-6">
        <div className="flex flex-col gap-3">
          <Link href="/authors/add-author" className="w-fit">
            <Button size="sm">Add New Author</Button>
          </Link>
        </div>
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Author Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Overview of author catalogs, books published, and royalty balances.
          </p>
        </div>
      </div>

      {/* Author Table */}
      <AuthorsTable
        key={`${search}-${sortBy}-${sortDir}-${currentPage}-${showAll}`}
        rows={items}
        total={total}
        page={currentPage}
        pageSize={effectivePageSize}
        search={search}
        sortBy={sortBy}
        sortDir={sortDir}
        showAll={showAll}
      />
    </div>
  );
}
