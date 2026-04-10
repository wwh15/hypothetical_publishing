"use client";

import { Button } from "@/components/ui/button";

export function AmazonSalesReportButton() {
  function handleGenerate() {
    window.open("/api/reports/amazon-sales", "_blank", "noopener,noreferrer");
  }

  return (
    <Button type="button" onClick={handleGenerate}>
      Generate report
    </Button>
  );
}
