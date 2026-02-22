import Link from "next/link";
import { getAllAuthors } from "@/app/(main)/authors/actions";
import { AuthorRoyaltyReportForm } from "./components/AuthorRoyaltyReportForm";
import { getDefaultQuarterRange } from "./lib/quarters";

export const dynamic = "force-dynamic";

export default async function AuthorRoyaltyReportPage() {
  const defaultRange = getDefaultQuarterRange();
  const authors = await getAllAuthors();

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
            Select an author and time period to generate the report.
          </p>
        </div>
      </div>

      <AuthorRoyaltyReportForm
        authors={authors}
        initialAuthorId={null}
        initialStartQuarter={defaultRange.startQuarter}
        initialStartYear={defaultRange.startYear}
        initialEndQuarter={defaultRange.endQuarter}
        initialEndYear={defaultRange.endYear}
      />
    </div>
  );
}
