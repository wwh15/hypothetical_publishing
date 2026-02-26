"use server";
import asyncGetAuthorPaymentData from "@/lib/data/author-payment";
import AuthorPaymentsTable from "../components/AuthorPaymentsTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";


export default async function AuthorPaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; showAll?: string; search?: string }> | { page?: string; showAll?: string; search?: string };
}) {
  // 1. Await the params (Required for Next.js 15+)
  const params = await searchParams;
  
  // 2. Extract values with defaults
  const search = params?.search || "";
  const page = Number(params?.page) || 1;
  const showAll = params?.showAll === "true";
  const pageSize = 20;

  // 3. Fetch data using the search query
  const { authors, totalGroups } = await asyncGetAuthorPaymentData(
    page,
    pageSize,
    search // Pass the search string to your Prisma query



  );

  const totalPages = Math.ceil(totalGroups / pageSize);

  return (
    <div className="container mx-auto py-8">
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
      
      {/* 4. Pass the search prop to the Client Table */}
      <AuthorPaymentsTable
        groups={authors}
        totalGroups={totalGroups}
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        showAll={showAll}
        search={search} 
      />
    </div>
  );
}