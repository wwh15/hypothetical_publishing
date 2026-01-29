import { Button } from "@/components/ui/button";
import { getAuthorPaymentData } from "../action";
import AuthorPaymentsTable from "../components/AuthorPaymentsTable";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AuthorPaymentsPage() {
  // getAuthorPaymentData is a function, call it to get the sales data
  const authorPaymentData = await getAuthorPaymentData();

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
      <AuthorPaymentsTable authorPaymentData={authorPaymentData} />
    </div>
  );
}
