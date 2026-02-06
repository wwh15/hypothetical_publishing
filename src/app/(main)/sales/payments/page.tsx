import { Button } from "@/components/ui/button";
import { getAuthorPaymentDataPage } from "../action";
import AuthorPaymentsTable from "../components/AuthorPaymentsTable";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AuthorPaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; showAll?: string }> | { page?: string; showAll?: string };
}) {
  const resolved =
    searchParams && typeof searchParams === "object" && "then" in searchParams
      ? await searchParams
      : searchParams;

  const showAll = resolved?.showAll === "true";
  const page = Math.max(1, Number(resolved?.page ?? "1") || 1);
  const pageSize = 2;

  // When showing all, fetch all data by using a very large pageSize
  const authorPaymentData = await getAuthorPaymentDataPage({ 
    page: showAll ? 1 : page, 
    pageSize: showAll ? 10000 : pageSize 
  });
  const totalPages = Math.max(
    1,
    Math.ceil(authorPaymentData.totalGroups / pageSize)
  );

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 space-y-6">
        <div className="flex flex-col gap-3">
          <Link href="/sales" className="w-fit">
            <Button variant="outline" size="sm">
              ← Back to Sales
            </Button>
          </Link>
          <Link href="/sales/add-record" className="w-fit">
            <Button size="sm">Add New Sale Record</Button>
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Author Payments
          </h1>
          <p className="text-muted-foreground mt-2">
            View and manage all author payments
          </p>
        </div>
      </div>
      <AuthorPaymentsTable
        groups={authorPaymentData.groups}
        totalGroups={authorPaymentData.totalGroups}
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        showAll={showAll}
      />
    </div>
  );
}
