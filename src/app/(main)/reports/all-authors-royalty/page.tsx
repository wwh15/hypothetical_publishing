import { BackLink } from "@/components/BackLink";
import { getDefaultQuarterRange } from "../author-royalty/lib/quarters";
import { AllAuthorsRoyaltyReportForm } from "./components/AllAuthorsRoyaltyReportForm";

export const dynamic = "force-dynamic";

export default function AllAuthorsRoyaltyReportPage() {
  const defaultRange = getDefaultQuarterRange();

  return (
    <div className="py-10">
      <div className="mb-8 space-y-6">
        <div>
          <BackLink href="/reports">Reports</BackLink>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            All authors royalty report
          </h1>
          <p className="text-muted-foreground mt-2">
            Download an XLSX spreadsheet with total author royalties (paid and
            unpaid) per calendar quarter for all books. Projected sales from
            unreleased books are excluded.
          </p>
        </div>
      </div>

      <AllAuthorsRoyaltyReportForm
        initialStartQuarter={defaultRange.startQuarter}
        initialStartYear={defaultRange.startYear}
        initialEndQuarter={defaultRange.endQuarter}
        initialEndYear={defaultRange.endYear}
      />
    </div>
  );
}
