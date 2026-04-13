import { BackLink } from "@/components/BackLink";
import { getDefaultQuarterRange } from "../author-royalty/lib/quarters";
import { PublisherProfitReportForm } from "./components/PublisherProfitReportForm";

export const dynamic = "force-dynamic";

export default function PublisherProfitReportPage() {
  const defaultRange = getDefaultQuarterRange();

  return (
    <div className="py-10">
      <div className="mb-8 space-y-6">
        <div>
          <BackLink href="/reports">Reports</BackLink>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Publisher profit report
          </h1>
          <p className="text-muted-foreground mt-2">
            Download an XLSX spreadsheet with publisher profit (publisher
            revenue minus author royalty) per released book per calendar
            quarter. Unreleased books are excluded.
          </p>
        </div>
      </div>

      <PublisherProfitReportForm
        initialStartQuarter={defaultRange.startQuarter}
        initialStartYear={defaultRange.startYear}
        initialEndQuarter={defaultRange.endQuarter}
        initialEndYear={defaultRange.endYear}
      />
    </div>
  );
}
