import React from "react";
import { NextRequest, NextResponse } from "next/server";
import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAuthorRoyaltyReportData } from "@/lib/data/author-royalty-report";
import { AuthorRoyaltyReportPDF } from "@/app/(main)/reports/author-royalty/components/AuthorRoyaltyReportPDF";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const authorId = searchParams.get("authorId");
  const startQ = searchParams.get("startQ");
  const startY = searchParams.get("startY");
  const endQ = searchParams.get("endQ");
  const endY = searchParams.get("endY");

  const aid = authorId != null ? parseInt(authorId, 10) : NaN;
  const sq = startQ != null ? parseInt(startQ, 10) : NaN;
  const sy = startY != null ? parseInt(startY, 10) : NaN;
  const eq = endQ != null ? parseInt(endQ, 10) : NaN;
  const ey = endY != null ? parseInt(endY, 10) : NaN;

  if (
    !Number.isFinite(aid) ||
    !Number.isFinite(sq) ||
    !Number.isFinite(sy) ||
    !Number.isFinite(eq) ||
    !Number.isFinite(ey)
  ) {
    return NextResponse.json(
      { error: "Missing or invalid authorId, startQ, startY, endQ, endY" },
      { status: 400 }
    );
  }
  if (sq < 1 || sq > 4 || eq < 1 || eq > 4) {
    return NextResponse.json(
      { error: "startQ and endQ must be 1–4" },
      { status: 400 }
    );
  }

  const report = await getAuthorRoyaltyReportData({
    authorId: aid,
    startQuarter: sq,
    startYear: sy,
    endQuarter: eq,
    endYear: ey,
  });

  if (!report) {
    return NextResponse.json(
      { error: "Author not found" },
      { status: 404 }
    );
  }

  const doc = React.createElement(AuthorRoyaltyReportPDF, { data: report });
  const buffer = await renderToBuffer(
    doc as React.ReactElement<DocumentProps>
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="author-royalty-report-${report.author.name.replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
