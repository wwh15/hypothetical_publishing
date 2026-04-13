/**
 * Writes Backerkit-style .xlsx fixtures under docs/backerkit/.
 * Run: npx tsx scripts/generate-backerkit-xlsx-fixtures.ts
 *
 * Kickstarter item tags must match prisma seed (pre-release books by Becky Chambers):
 *   Wayfarers Book Five: ebook-seed-wayfarers-five, print-seed-wayfarers-five
 *   Untitled Novella:    ebook-seed-novella-qa, print-seed-novella-qa
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";

const OUT = path.join(__dirname, "..", "docs", "backerkit");

/** Standard header: itemN/qtyN/priceN only after the two required columns. */
const HEAD = [
  "Pledge Status",
  "Order Placed",
  "item1",
  "qty1",
  "price1",
  "item2",
  "qty2",
  "price2",
  "item3",
  "qty3",
  "price3",
] as const;

function writeBook(name: string, sheets: Record<string, unknown[][]>) {
  const wb = XLSX.utils.book_new();
  for (const [sheetName, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  fs.writeFileSync(path.join(OUT, name), buf);
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });

  // Multiple rows roll up to same (month, book, format) per req 3.8.3
  writeBook("sample_backerkit_valid_rollup.xlsx", {
    Sheet1: [
      [...HEAD],
      [
        "imported",
        "12/08/25",
        "ebook-seed-wayfarers-five",
        1,
        0,
        "ebook-seed-wayfarers-five",
        4,
        0,
        "",
        "",
        "",
      ],
      ["imported", "12/08/25", "print-seed-wayfarers-five", 2, 0],
      ["imported", "11/22/25", "ebook-seed-wayfarers-five", 16, 0],
      ["collected", "12/08/25", "ebook-seed-novella-qa", 3, 0],
    ],
  });

  writeBook("sample_backerkit_pledge_mixed.xlsx", {
    Sheet1: [
      [...HEAD],
      ["imported", "12/08/25", "ebook-seed-wayfarers-five", 2, 0],
      ["failed", "12/08/25", "print-seed-wayfarers-five", 50, 0],
    ],
  });

  writeBook("sample_backerkit_unknown_swag.xlsx", {
    Sheet1: [
      [...HEAD],
      [
        "imported",
        "12/08/25",
        "swag-sticker-seed-qa",
        1,
        0,
        "ebook-seed-wayfarers-five",
        2,
        0,
      ],
    ],
  });

  writeBook("sample_backerkit_two_sheets.xlsx", {
    Rewards: [[...HEAD], ["imported", "12/08/25", "ebook-seed-wayfarers-five", 1, 0]],
    SecondTab: [[...HEAD], ["imported", "12/08/25", "ebook-seed-novella-qa", 5, 0]],
  });

  writeBook("sample_backerkit_no_valid_sales.xlsx", {
    Sheet1: [
      [...HEAD],
      ["failed", "12/08/25", "ebook-seed-wayfarers-five", 1, 0],
      ["imported", "12/08/25", "totally-unknown-tag-not-in-seed", 2, 0],
    ],
  });

  writeBook("sample_backerkit_invalid_extra_column.xlsx", {
    Sheet1: [
      [
        "Pledge Status",
        "Order Placed",
        "Notes",
        "item1",
        "qty1",
        "price1",
      ],
      ["imported", "12/08/25", "oops", "ebook-seed-wayfarers-five", 1, 0],
    ],
  });

  console.log(`Wrote Backerkit fixtures to ${OUT}`);
}

main();
