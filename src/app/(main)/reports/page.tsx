import Link from "next/link";

export default function ReportsPage() {
  return (
    <div className="py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Reports
        </h1>
        <p className="text-muted-foreground mt-2">
          Generate reports for authors and sales.
        </p>
      </div>
      <ul className="space-y-3">
        <li>
          <Link
            href="/reports/author-royalty"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Author royalty report
          </Link>
          <span className="text-muted-foreground text-sm ml-2">
            — Sales and royalty breakdown by author and time period
          </span>
        </li>
        <li>
          <Link
            href="/reports/amazon-sales"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Amazon sales report
          </Link>
          <span className="text-muted-foreground text-sm ml-2">
            — Lifetime Amazon sales data per book (XLSX)
          </span>
        </li>
      </ul>
    </div>
  );
}
