import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { quarterOrdinal } from "@/lib/data/all-authors-royalty-report";
import { getPublisherProfitReportData } from "@/lib/data/publisher-profit-report";
import { createClient } from "@/lib/supabase/server";
import { formatLocalReportFilenameStamp } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sq = searchParams.get("startQ");
  const sy = searchParams.get("startY");
  const eq = searchParams.get("endQ");
  const ey = searchParams.get("endY");

  const startQ = sq != null ? parseInt(sq, 10) : NaN;
  const startY = sy != null ? parseInt(sy, 10) : NaN;
  const endQ = eq != null ? parseInt(eq, 10) : NaN;
  const endY = ey != null ? parseInt(ey, 10) : NaN;

  if (
    !Number.isFinite(startQ) ||
    !Number.isFinite(startY) ||
    !Number.isFinite(endQ) ||
    !Number.isFinite(endY)
  ) {
    return NextResponse.json(
      { error: "Missing or invalid startQ, startY, endQ, endY" },
      { status: 400 }
    );
  }
  if (startQ < 1 || startQ > 4 || endQ < 1 || endQ > 4) {
    return NextResponse.json(
      { error: "startQ and endQ must be 1–4" },
      { status: 400 }
    );
  }

  if (quarterOrdinal(startY, startQ) > quarterOrdinal(endY, endQ)) {
    return NextResponse.json(
      { error: "Start quarter must be on or before end quarter" },
      { status: 400 }
    );
  }

  const data = await getPublisherProfitReportData({
    startQuarter: startQ,
    startYear: startY,
    endQuarter: endQ,
    endYear: endY,
  });

  const headers = [
    "Author",
    "Series/Position",
    "Title",
    "ISBN-13",
    "ASIN",
    "Cover Price",
    "Print Cost",
    ...data.quarterColumns.map((c) => c.label),
    "Total",
  ];

  const wsData: (string | number)[][] = [
    headers,
    ...data.bookRows.map((row) => [
      row.author,
      row.seriesPosition,
      row.title,
      row.isbn13,
      row.asin,
      row.coverPrice,
      row.printCost,
      ...row.values,
      row.rowTotal,
    ]),
    [
      "Total",
      "",
      "",
      "",
      "",
      "",
      "",
      ...data.columnTotals,
      data.grandTotal,
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const headerRange = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (ws[cellRef]) {
      ws[cellRef].s = { font: { bold: true } };
    }
  }

  const numQuarterCols = data.quarterColumns.length;
  const lastDataRow = data.bookRows.length;
  const currencyFmt = "$#,##0.00";

  for (let row = 1; row <= lastDataRow; row++) {
    for (let col = 5; col <= 7 + numQuarterCols; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (ws[cellRef]) {
        ws[cellRef].z = currencyFmt;
      }
    }
  }

  const totalRow = lastDataRow + 1;
  for (let col = 5; col <= 7 + numQuarterCols; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: totalRow, c: col });
    if (ws[cellRef]) {
      ws[cellRef].z = currencyFmt;
    }
  }

  const ncols = headers.length;
  ws["!cols"] = [
    { wch: 22 },
    { wch: 22 },
    { wch: 32 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    ...Array.from({ length: numQuarterCols }, () => ({ wch: 12 })),
    { wch: 14 },
  ].slice(0, ncols);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Publisher Profit Report");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const stamp = formatLocalReportFilenameStamp(new Date());
  const filename = `Publisher_Profit_Report_${stamp}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
