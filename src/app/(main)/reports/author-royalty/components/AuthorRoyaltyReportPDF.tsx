import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type {
  AuthorRoyaltyReportResult,
  ReportCell,
} from "@/lib/data/author-royalty-report";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#444",
  },
  periodSection: {
    marginBottom: 20,
  },
  periodHeading: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#222",
  },
  table: {
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    minHeight: 20,
    alignItems: "center",
  },
  tableRowHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    minHeight: 22,
    alignItems: "center",
    backgroundColor: "#e8e8e8",
  },
  cellBook: {
    width: "32%",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  cellNum: {
    width: "13.6%",
    paddingHorizontal: 6,
    paddingVertical: 4,
    textAlign: "right",
  },
  headerText: {
    fontWeight: "bold",
  },
  bookTitle: {
    fontWeight: "normal",
    fontSize: 9,
  },
  bookTitleTotals: {
    fontWeight: "bold",
    fontSize: 9,
  },
});

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface PeriodTableProps {
  periodLabel: string;
  bookRows: AuthorRoyaltyReportResult["bookRows"];
  cellsForPeriod: ReportCell[];
}

function PeriodTable({
  periodLabel,
  bookRows,
  cellsForPeriod,
}: PeriodTableProps) {
  return (
    <View style={styles.periodSection} wrap={false}>
      <Text style={styles.periodHeading}>{periodLabel}</Text>
      <View style={styles.table}>
        <View style={styles.tableRowHeader}>
          <View style={styles.cellBook}>
            <Text style={styles.headerText}>Book</Text>
          </View>
          <View style={styles.cellNum}>
            <Text style={styles.headerText}>Qty sold</Text>
          </View>
          <View style={styles.cellNum}>
            <Text style={styles.headerText}>Handsold</Text>
          </View>
          <View style={styles.cellNum}>
            <Text style={styles.headerText}>Unpaid</Text>
          </View>
          <View style={styles.cellNum}>
            <Text style={styles.headerText}>Paid</Text>
          </View>
          <View style={styles.cellNum}>
            <Text style={styles.headerText}>Total</Text>
          </View>
        </View>
        {bookRows.map((row, rowIdx) => {
          const cell = cellsForPeriod[rowIdx];
          return (
            <View key={row.bookId ?? "all"} style={styles.tableRow}>
              <View style={styles.cellBook}>
                <Text
                  style={
                    row.bookId == null
                      ? styles.bookTitleTotals
                      : styles.bookTitle
                  }
                >
                  {row.title}
                </Text>
              </View>
              <View style={styles.cellNum}>
                <Text>{cell.quantitySold}</Text>
              </View>
              <View style={styles.cellNum}>
                <Text>{cell.quantityHandsold}</Text>
              </View>
              <View style={styles.cellNum}>
                <Text>{formatCurrency(cell.royaltyUnpaid)}</Text>
              </View>
              <View style={styles.cellNum}>
                <Text>{formatCurrency(cell.royaltyPaid)}</Text>
              </View>
              <View style={styles.cellNum}>
                <Text>{formatCurrency(cell.royaltyTotal)}</Text>
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
}

export function AuthorRoyaltyReportPDF({ data }: AuthorRoyaltyReportPDFProps) {
  const { author, generatedAt, periods, bookRows, cells } = data;
  const dateStr = generatedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Hypothetical Publishing</Text>
          <Text style={styles.subtitle}>
            Author Royalty Report — {author.name}
          </Text>
          <Text style={styles.subtitle}>Generated {dateStr}</Text>
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
