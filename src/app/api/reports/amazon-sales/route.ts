import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAmazonSalesReportData } from "@/lib/data/amazon-sales-report";
import { createClient } from "@/lib/supabase/server";
import { formatLocalReportFilenameStamp } from "@/lib/utils";

export async function GET() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await getAmazonSalesReportData();

  const totals = rows.reduce(
    (acc, r) => ({
      printQty: acc.printQty + r.printQty,
      printRevenue: acc.printRevenue + r.printRevenue,
      ebookQty: acc.ebookQty + r.ebookQty,
      ebookRevenue: acc.ebookRevenue + r.ebookRevenue,
      kenp: acc.kenp + r.kenp,
      kenpRevenue: acc.kenpRevenue + r.kenpRevenue,
    }),
    {
      printQty: 0,
      printRevenue: 0,
      ebookQty: 0,
      ebookRevenue: 0,
      kenp: 0,
      kenpRevenue: 0,
    }
  );

  // Req 6.4.4: single Series/Position column; 6.4.4.6–11 naming; 6.4.7 total row.
  const headers = [
    "Author",
    "Series/Position",
    "Title",
    "ISBN-13",
    "ASIN",
    "Print Quantity",
    "Print Revenue",
    "Ebook Quantity",
    "Ebook Revenue",
    "KENP",
    "KENP Revenue",
  ];

  const totalRow = [
    "Total",
    "",
    "",
    "",
    "",
    totals.printQty,
    totals.printRevenue,
    totals.ebookQty,
    totals.ebookRevenue,
    totals.kenp,
    totals.kenpRevenue,
  ];

  const wsData = [
    headers,
    ...rows.map((r) => [
      r.author,
      r.seriesPosition,
      r.title,
      r.isbn13,
      r.asin ?? "",
      r.printQty,
      r.printRevenue,
      r.ebookQty,
      r.ebookRevenue,
      r.kenp,
      r.kenpRevenue,
    ]),
    totalRow,
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Bold headers
  const headerRange = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (ws[cellRef]) {
      ws[cellRef].s = { font: { bold: true } };
    }
  }

  // Bold total row (req: final row with aggregate totals)
  const totalRowIndex = rows.length + 1;
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: totalRowIndex, c: col });
    if (ws[cellRef]) {
      ws[cellRef].s = { font: { bold: true } };
    }
  }

  // Format currency columns (Print Revenue=6, Ebook Revenue=8, KENP Revenue=10)
  const currencyCols = [6, 8, 10];
  for (let row = 1; row <= totalRowIndex; row++) {
    for (const col of currencyCols) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (ws[cellRef]) {
        ws[cellRef].z = "$#,##0.00";
      }
    }
  }

  // Set column widths (11 cols per req 6.4.4)
  ws["!cols"] = [
    { wch: 20 }, // Author
    { wch: 24 }, // Series/Position
    { wch: 30 }, // Title
    { wch: 15 }, // ISBN-13
    { wch: 12 }, // ASIN
    { wch: 14 }, // Print Quantity
    { wch: 14 }, // Print Revenue
    { wch: 14 }, // Ebook Quantity
    { wch: 14 }, // Ebook Revenue
    { wch: 10 }, // KENP
    { wch: 14 }, // KENP Revenue
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Amazon Sales");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = `Amazon_Sale_Report_${formatLocalReportFilenameStamp(new Date(), "-")}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
