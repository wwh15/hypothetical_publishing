import { BackLink } from "@/components/BackLink";
import { AmazonSalesReportButton } from "./AmazonSalesReportButton";

export const dynamic = "force-dynamic";

export default function AmazonSalesReportPage() {
  return (
    <div className="py-10">
      <div className="mb-8 space-y-6">
        <div>
          <BackLink href="/reports">Reports</BackLink>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Amazon sales report
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate an XLSX spreadsheet with lifetime Amazon sales data per
            book, including print, ebook, and KENP revenue. Excludes projected
            sales from unreleased books.
          </p>
        </div>
      </div>

      <AmazonSalesReportButton />
    </div>
  );
}
