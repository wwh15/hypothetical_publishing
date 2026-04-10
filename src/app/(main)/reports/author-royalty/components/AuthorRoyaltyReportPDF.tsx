import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type {
  AuthorRoyaltyReportResult,
  ReportCell,
} from "@/lib/data/author-royalty-report";

/** A4 landscape width (pt) minus horizontal page padding — table must match this exactly */
const PAGE_PAD_X = 28;
const PAGE_WIDTH_PT = 842;
const TABLE_WIDTH_PT = PAGE_WIDTH_PT - PAGE_PAD_X * 2;
const COL_BOOK_W = 114;
const COL_NUM_W = (TABLE_WIDTH_PT - COL_BOOK_W) / 12;

const styles = StyleSheet.create({
  page: {
    padding: PAGE_PAD_X,
    fontSize: 6.5,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 9,
    color: "#444",
  },
  legend: {
    fontSize: 5.5,
    color: "#555",
    marginTop: 6,
    lineHeight: 1.35,
  },
  periodSection: {
    marginBottom: 14,
    width: TABLE_WIDTH_PT,
  },
  periodHeading: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#222",
  },
  table: {
    width: TABLE_WIDTH_PT,
  },
  tableRow: {
    flexDirection: "row",
    width: TABLE_WIDTH_PT,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    minHeight: 14,
    alignItems: "center",
  },
  tableRowHeader: {
    flexDirection: "row",
    width: TABLE_WIDTH_PT,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    minHeight: 30,
    alignItems: "stretch",
    backgroundColor: "#e8e8e8",
  },
  colBook: {
    width: COL_BOOK_W,
    flexShrink: 0,
    flexGrow: 0,
    paddingLeft: 4,
    paddingRight: 6,
    paddingVertical: 3,
    justifyContent: "center",
  },
  colNum: {
    width: COL_NUM_W,
    flexShrink: 0,
    flexGrow: 0,
    paddingLeft: 2,
    paddingRight: 4,
    paddingVertical: 3,
    justifyContent: "center",
  },
  txtBook: {
    width: "100%",
    fontSize: 6.5,
    textAlign: "left",
  },
  txtBookTotals: {
    width: "100%",
    fontSize: 6.5,
    fontWeight: "bold",
    textAlign: "left",
  },
  txtHdrBook: {
    width: "100%",
    fontSize: 6,
    fontWeight: "bold",
    textAlign: "left",
  },
  txtNum: {
    width: "100%",
    fontSize: 6.5,
    textAlign: "right",
  },
  txtHdrNum: {
    width: "100%",
    fontSize: 5.5,
    fontWeight: "bold",
    textAlign: "right",
    lineHeight: 1.2,
  },
});

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatKenp(n: number): string {
  if (n === 0) return "0";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

interface PeriodTableProps {
  periodLabel: string;
  bookRows: AuthorRoyaltyReportResult["bookRows"];
  cellsForPeriod: ReportCell[];
}

const HDR = {
  prHs: "Print,\nhandsold",
  prIs: "Print,\nIngram",
  prAmz: "Print,\nAmazon",
  ebAmz: "eBook,\nAmazon",
  prOth: "Print,\nOther",
  ebOth: "eBook,\nOther",
  qtyTot: "Qty\nsold",
  hsTot: "Qty\nhandsold",
  kenp: "KENP\n(Amz KU)",
  royU: "Royalty\nunpaid",
  royP: "Royalty\npaid",
  royT: "Royalty\ntotal",
} as const;

function PeriodTable({
  periodLabel,
  bookRows,
  cellsForPeriod,
}: PeriodTableProps) {
  return (
    <View style={styles.periodSection} wrap={false}>
      <Text style={styles.periodHeading}>{periodLabel}</Text>
      <View style={styles.table}>
        <View style={styles.tableRowHeader} wrap={false}>
          <View style={styles.colBook}>
            <Text style={styles.txtHdrBook}>Book</Text>
          </View>
          <View style={styles.colNum}>
            <Text style={styles.txtHdrNum}>{HDR.prHs}</Text>
          </View>
          <View style={styles.colNum}>
            <Text style={styles.txtHdrNum}>{HDR.prIs}</Text>
          </View>
          <View style={styles.colNum}>
            <Text style={styles.txtHdrNum}>{HDR.prAmz}</Text>
          </View>
          <View style={styles.colNum}>
            <Text style={styles.txtHdrNum}>{HDR.ebAmz}</Text>
          </View>
          <View style={styles.colNum}>
            <Text style={styles.txtHdrNum}>{HDR.prOth}</Text>
          </View>
          <View style={styles.colNum}>
            <Text style={styles.txtHdrNum}>{HDR.ebOth}</Text>
          </View>
          <View style={styles.colNum}>
            <Text style={styles.txtHdrNum}>{HDR.qtyTot}</Text>
          </View>
          <View style={styles.colNum}>
            <Text style={styles.txtHdrNum}>{HDR.hsTot}</Text>
          </View>
          <View style={styles.colNum}>
            <Text style={styles.txtHdrNum}>{HDR.kenp}</Text>
          </View>
          <View style={styles.colNum}>
            <Text style={styles.txtHdrNum}>{HDR.royU}</Text>
          </View>
          <View style={styles.colNum}>
            <Text style={styles.txtHdrNum}>{HDR.royP}</Text>
          </View>
          <View style={styles.colNum}>
            <Text style={styles.txtHdrNum}>{HDR.royT}</Text>
          </View>
        </View>
        {bookRows.map((row, rowIdx) => {
          const cell = cellsForPeriod[rowIdx];
          return (
            <View key={row.bookId ?? "all"} style={styles.tableRow} wrap={false}>
              <View style={styles.colBook}>
                <Text
                  style={
                    row.bookId == null ? styles.txtBookTotals : styles.txtBook
                  }
                >
                  {row.title}
                </Text>
              </View>
              <View style={styles.colNum}>
                <Text style={styles.txtNum}>{cell.qtyPrintHandsold}</Text>
              </View>
              <View style={styles.colNum}>
                <Text style={styles.txtNum}>{cell.qtyPrintIngramSpark}</Text>
              </View>
              <View style={styles.colNum}>
                <Text style={styles.txtNum}>{cell.qtyPrintAmazon}</Text>
              </View>
              <View style={styles.colNum}>
                <Text style={styles.txtNum}>{cell.qtyEbookAmazon}</Text>
              </View>
              <View style={styles.colNum}>
                <Text style={styles.txtNum}>{cell.qtyPrintOther}</Text>
              </View>
              <View style={styles.colNum}>
                <Text style={styles.txtNum}>{cell.qtyEbookOther}</Text>
              </View>
              <View style={styles.colNum}>
                <Text style={styles.txtNum}>{cell.quantitySold}</Text>
              </View>
              <View style={styles.colNum}>
                <Text style={styles.txtNum}>{cell.quantityHandsold}</Text>
              </View>
              <View style={styles.colNum}>
                <Text style={styles.txtNum}>{formatKenp(cell.kenp)}</Text>
              </View>
              <View style={styles.colNum}>
                <Text style={styles.txtNum}>
                  {formatCurrency(cell.royaltyUnpaid)}
                </Text>
              </View>
              <View style={styles.colNum}>
                <Text style={styles.txtNum}>
                  {formatCurrency(cell.royaltyPaid)}
                </Text>
              </View>
              <View style={styles.colNum}>
                <Text style={styles.txtNum}>
                  {formatCurrency(cell.royaltyTotal)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface AuthorRoyaltyReportPDFProps {
  data: AuthorRoyaltyReportResult;
  companyName?: string;
  logoUrl?: string | null;
}

export function AuthorRoyaltyReportPDF({ data, companyName, logoUrl }: AuthorRoyaltyReportPDFProps) {
  const { author, generatedAt, periods, bookRows, cells } = data;
  const dateStr = generatedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      <Page
        size="A4"
        orientation="landscape"
        style={styles.page}
        wrap
      >
        <View style={styles.header} wrap={false}>
          {logoUrl ? (
            <Image src={logoUrl} style={{ height: 40, width: 40, objectFit: "contain", marginBottom: 4 }} />
          ) : null}
          <Text style={styles.title}>{companyName ?? "Hypothetical Publishing"}</Text>
          <Text style={styles.subtitle}>
            Author royalty report — {author.name}
          </Text>
          <Text style={styles.subtitle}>Generated {dateStr}</Text>
          <Text style={styles.legend}>
            Quantity columns follow sale source, distributor, and format (USD
            royalties). KENP is Amazon Kindle Unlimited pages read. “Total
            (selected range)” sums the chosen quarters only. Books are ordered
            by series, position in series, then title (non-series titles last).
            The last row is all books combined.
          </Text>
        </View>

        {periods.map((period, periodIdx) => (
          <PeriodTable
            key={period.key}
            periodLabel={period.label}
            bookRows={bookRows}
            cellsForPeriod={cells.map((row) => row[periodIdx])}
          />
        ))}
      </Page>
    </Document>
  );
}
