import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAmazonSalesReportData } from "@/lib/data/amazon-sales-report";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await getAmazonSalesReportData();

  // Build worksheet data
  const headers = [
    "Author",
    "Series",
    "Position",
    "Title",
    "ISBN-13",
    "ASIN",
    "Print Qty",
    "Print Revenue",
    "Ebook Qty",
    "Ebook Revenue",
    "KENP",
    "KENP Revenue",
  ];

  const wsData = [
    headers,
    ...rows.map((r) => [
      r.author,
      r.seriesName ?? "",
      r.seriesOrder != null ? r.seriesOrder : "",
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

  // Format currency columns (Print Revenue=7, Ebook Revenue=9, KENP Revenue=11)
  const currencyCols = [7, 9, 11];
  for (let row = 1; row <= rows.length; row++) {
    for (const col of currencyCols) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (ws[cellRef]) {
        ws[cellRef].z = "$#,##0.00";
      }
    }
  }

  // Set column widths
  ws["!cols"] = [
    { wch: 20 }, // Author
    { wch: 20 }, // Series
    { wch: 8 },  // Position
    { wch: 30 }, // Title
    { wch: 15 }, // ISBN-13
    { wch: 12 }, // ASIN
    { wch: 10 }, // Print Qty
    { wch: 14 }, // Print Revenue
    { wch: 10 }, // Ebook Qty
    { wch: 14 }, // Ebook Revenue
    { wch: 10 }, // KENP
    { wch: 14 }, // KENP Revenue
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Amazon Sales");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  // Filename with timestamp
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toISOString().slice(11, 19).replace(/:/g, "-");
  const filename = `Amazon_Sales_Report_${date}_${time}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
