/**
 * Writes manual-test Amazon royalty .xlsx fixtures under docs/amazon/.
 * Run: npx tsx scripts/generate-amazon-xlsx-fixtures.ts
 *
 * Identifiers match prisma seed: Ingram Test Book 9780599999999, The Hobbit 9780547928227,
 * Ready Player One ebook ASIN B00SEED123. Unknown ISBN 9780000000000 is not seeded.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";

const OUT = path.join(__dirname, "..", "docs", "amazon");

const PERIOD_ROW = ["Sales Period", "June 2025"] as const;

const PRINT_HEADERS = [
  "Title",
  "Author",
  "ISBN",
  "Marketplace",
  "Units Sold",
  "Units Refunded",
  "Currency",
  "Royalty",
];

const EBOOK_HEADERS = [
  "Title",
  "Author",
  "ASIN",
  "Marketplace",
  "Units Sold",
  "Units Refunded",
  "Net Units Sold",
  "Currency",
  "Royalty",
];

const KENP_HEADERS = [
  "Title",
  "Author",
  "eBook ASIN",
  "Marketplace",
  "Kindle Edition Normalized Pages (KENP)",
  "Currency",
  "Royalty",
  "Units Refunded",
];

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

  writeBook("sample_amazon_valid_all_sheets.xlsx", {
    "Paperback Royalty": [
      [...PERIOD_ROW],
      [...PRINT_HEADERS],
      [
        "Ingram Test Book",
        "Test Author",
        "9780599999999",
        "amazon.com",
        3,
        0,
        "USD",
        12.5,
      ],
    ],
    "Hardcover Royalty": [
      [...PERIOD_ROW],
      [...PRINT_HEADERS],
      [
        "The Hobbit",
        "J.R.R. Tolkien",
        "9780547928227",
        "amazon.co.uk",
        1,
        0,
        "GBP",
        4.2,
      ],
    ],
    "eBook Royalty": [
      [...PERIOD_ROW],
      [...EBOOK_HEADERS],
      [
        "Ready Player One",
        "Ernest Cline",
        "B00SEED123",
        "amazon.com",
        10,
        0,
        10,
        "USD",
        25.0,
      ],
    ],
    KENP: [
      [...PERIOD_ROW],
      [...KENP_HEADERS],
      [
        "Ready Player One",
        "Ernest Cline",
        "B00SEED123",
        "amazon.com",
        1200,
        "USD",
        8.75,
        0,
      ],
    ],
  });

  writeBook("sample_amazon_invalid_no_supported_sheets.xlsx", {
    "Some Other Report": [[...PERIOD_ROW], ["Col A", "Col B"], [1, 2]],
    Summary: [["Total", 99]],
  });

  writeBook("sample_amazon_invalid_wrong_headers.xlsx", {
    "Paperback Royalty": [
      [...PERIOD_ROW],
      ["Title", "Author", "ISBN", "Marketplace", "Qty", "Currency", "Amount"],
      ["Ingram Test Book", "Test Author", "9780599999999", "amazon.com", 1, "USD", 5],
    ],
  });

  writeBook("sample_amazon_invalid_bad_cell_formats.xlsx", {
    "Paperback Royalty": [
      [...PERIOD_ROW],
      [...PRINT_HEADERS],
      [
        "Ingram Test Book",
        "Test Author",
        "9780599999999",
        "amazon.com",
        "two",
        0,
        "US",
        "not-a-number",
      ],
    ],
  });

  writeBook("sample_amazon_invalid_units_refunded.xlsx", {
    "Hardcover Royalty": [
      [...PERIOD_ROW],
      [...PRINT_HEADERS],
      ["The Hobbit", "J.R.R. Tolkien", "9780547928227", "amazon.com", 5, 1, "USD", 20],
    ],
  });

  writeBook("sample_amazon_invalid_net_vs_gross.xlsx", {
    "eBook Royalty": [
      [...PERIOD_ROW],
      [...EBOOK_HEADERS],
      [
        "Ready Player One",
        "Ernest Cline",
        "B00SEED123",
        "amazon.com",
        8,
        0,
        7,
        "USD",
        9.99,
      ],
    ],
  });

  writeBook("sample_amazon_invalid_unknown_isbn.xlsx", {
    "Paperback Royalty": [
      [...PERIOD_ROW],
      [...PRINT_HEADERS],
      [
        "Ghost Book",
        "Nobody",
        "9780000000000",
        "amazon.com",
        1,
        0,
        "USD",
        1.0,
      ],
    ],
  });

  writeBook("sample_amazon_invalid_unknown_asin.xlsx", {
    "eBook Royalty": [
      [...PERIOD_ROW],
      [...EBOOK_HEADERS],
      [
        "Mystery Title",
        "Mystery Author",
        "B00NOTINSEED",
        "amazon.com",
        1,
        0,
        1,
        "USD",
        2.5,
      ],
    ],
  });

  writeBook("sample_amazon_warnings_audiobook_and_kenp_na.xlsx", {
    "Paperback Royalty": [
      [...PERIOD_ROW],
      [...PRINT_HEADERS],
      [
        "Ingram Test Book",
        "Test Author",
        "9780599999999",
        "amazon.com",
        2,
        0,
        "USD",
        6.0,
      ],
    ],
    KENP: [
      [...PERIOD_ROW],
      [...KENP_HEADERS],
      ["Ignored KU row", "Author", "N/A", "amazon.com", 50, "USD", 0.5, 0],
      [
        "Ready Player One",
        "Ernest Cline",
        "B00SEED123",
        "amazon.com",
        800,
        "USD",
        3.25,
        0,
      ],
    ],
    "Audiobook Royalty": [
      [...PERIOD_ROW],
      ["Title", "Royalty", "Currency"],
      ["ACX placeholder row", 0, "USD"],
    ],
  });

  fs.writeFileSync(
    path.join(OUT, "sample_amazon_invalid_wrong_extension.txt"),
    "This is not an Excel file. Use it to verify the UI rejects non-.xlsx/.xls uploads (choose All Files in the file picker).\n",
  );

  const corrupted = Buffer.from("PK\x03\x04not-a-valid-ooxml-workbook");
  fs.writeFileSync(path.join(OUT, "sample_amazon_invalid_corrupted.xlsx"), corrupted);

  console.log(`Wrote Amazon XLSX fixtures to ${OUT}`);
}

main();

