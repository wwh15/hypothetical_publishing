// Inside your SalesRecordsPage.tsx or a dedicated ExportButton.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { exportSalesToCsvAction } from "../action";
import type { SaleSource } from "@prisma/client";
import type { SaleReleaseFilter } from "@/lib/data/records";

export interface ExportCSVButtonProps {
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  dateFrom?: string;
  dateTo?: string;
  source?: SaleSource;
  distributor?: "INGRAM_SPARK" | "AMAZON" | "OTHER";
  format?: "PRINT" | "EBOOK" | "KINDLE_UNLIMITED";
  saleRelease?: SaleReleaseFilter;
  className?: string;
}

export function ExportCSVButton({
  search,
  sortBy,
  sortDir,
  dateFrom,
  dateTo,
  source,
  distributor,
  format,
  saleRelease,
  className,
}: ExportCSVButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    const result = await exportSalesToCsvAction({
      search,
      sortBy,
      sortDir,
      dateFrom,
      dateTo,
      source,
      distributor,
      format,
      saleRelease,
    });

    if (result.success && result.data) {
      // Create a blob and trigger download
      const blob = new Blob(["\ufeff", result.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const now = new Date();

      // Get YYYY-MM-DD in local time (en-CA defaults to ISO order)
      const datePart = now.toLocaleDateString("en-CA");

      // Get HHMM in local time (en-GB defaults to 24-hour)
      const timePart = now
        .toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
        .replace(":", "");

      const filename = `hypothetical-publishing-sales-export-${datePart}-${timePart}.csv`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("Export failed: " + result.error);
    }

    setIsExporting(false);
  };

  return (
    <Button
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      className={cn("shrink-0", className)}
    >
      <Download className="" />
      {isExporting ? "Generating..." : "Export CSV"}
    </Button>
  );
}
