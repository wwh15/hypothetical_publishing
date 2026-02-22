import Link from "next/link";

export default function AuthorRoyaltyReportPage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="mb-8 space-y-6">
        <div>
          <Link
            href="/reports"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Reports
          </Link>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Author royalty report
          </h1>
          <p className="text-muted-foreground mt-2">
            Select an author and time period to generate the report. (Form and
            report coming in a later PR.)
          </p>
        </div>
      </div>
    </div>
  );
}
