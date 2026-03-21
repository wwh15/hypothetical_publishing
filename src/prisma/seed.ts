/**
 * Seed using ev2-sample-data content (embedded inline so the seed does not read from the filesystem).
 * Creates authors, series, books, and sales from the same CSV data as ev2-sample-data/books.csv and sales_records.csv.
 * Order: clear → authors → series → books → sales.
 */
import "dotenv/config";
import Papa from "papaparse";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

// Inline currency list and conversion (matches @/lib/currency-conversion; no import for Docker/tsx)
const SEED_CURRENCIES = ["USD", "GBP", "EUR", "CAD", "JPY", "AUD"];
const EXCHANGE_RATES_TO_USD: Record<string, number> = {
  USD: 1.0,
  GBP: 1.34,
  EUR: 1.16,
  CAD: 0.73,
  JPY: 0.0063,
  AUD: 0.7,
};
function seedConvertToUSD(amount: number, currencyCode: string): number {
  const rate = EXCHANGE_RATES_TO_USD[currencyCode] ?? 1.0;
  return Math.round(amount * rate * 100) / 100;
}

const MONTH_NAMES: Record<string, number> = {
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11,
};

function parseMonthYear(str: string): Date {
  const trimmed = str.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) throw new Error(`Invalid month/year: ${str}`);
  const monthStr = parts[0];
  const year = parseInt(parts[1], 10);
  const month = MONTH_NAMES[monthStr];
  if (month === undefined || !Number.isFinite(year))
    throw new Error(`Invalid month/year: ${str}`);
  return new Date(Date.UTC(year, month, 1));
}

/** Simple canonical author key for upsert: lowercase, alphanumeric + spaces, collapsed. */
function seedCanonicalName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

interface BooksRow {
  title: string;
  author: string;
  series_name: string;
  series_index: string;
  isbn13: string;
  isbn10: string;
  publication_month_year: string;
  distribution_royalty_percent: string;
  hand_sold_royalty_percent: string;
  cover_price: string;
  print_cost: string;
  cover_image: string;
}

interface SalesRow {
  isbn13: string;
  source: string;
  record_month_year: string;
  units_sold: string;
  total_revenue: string;
  royalty_paid: string;
  comment: string;
  /** ingram_spark | amazon | other (empty → other for distributor sales) */
  distributor?: string;
  /** print | ebook | kindle_unlimited (empty → print) */
  format?: string;
  /** Required when format is kindle_unlimited */
  kenp?: string;
}

// ─── ev2-sample-data content (embedded; no file reads) ─────────────────────

const BOOKS_CSV = `title,author,series_name,series_index,isbn13,isbn10,publication_month_year,distribution_royalty_percent,hand_sold_royalty_percent,cover_price,print_cost,cover_image
"The Long Way to a Small, Angry Planet",Becky Chambers,Wayfarers,1,9780062444134,0062444131,July 2014,50,20,14.99,6.00,9780062444134.jpg
A Closed and Common Orbit,Becky Chambers,Wayfarers,2,9780062444141,006244414X,October 2016,50,20,12.99,5.00,
Record of a Spaceborn Few,Becky Chambers,Wayfarers,3,9780062699220,0062699229,July 2018,50,20,13.99,5.50,9780062699220.png
"The Galaxy, and the Ground Within",Becky Chambers,Wayfarers,4,9780062699237,0062699237,February 2021,50,20,14.99,6.00,
All Systems Red,Martha Wells,The Murderbot Diaries,1,9780765397539,0765397536,May 2017,50,20,9.99,4.00,9780765397539.jpg
Artificial Condition,Martha Wells,The Murderbot Diaries,2,9780765397546,0765397544,August 2018,50,20,14.99,6.00,
Rogue Protocol,Martha Wells,The Murderbot Diaries,3,9780765397553,0765397552,August 2018,50,20,12.99,5.50,
Ancillary Justice,Ann Leckie,,,9780316246620,0316246622,October 2013,50,20,10.99,4.50,
The Hobbit, J.R.R. Tolkien,,,9780547928227,054792822X,August 1937,50,20,9.99,4.00,9780547928227.gif
The Fellowship of the Ring,J.R.R. Tolkien,The Lord of the Rings,1,9780547928210,0547928211,July 1954,50,20,18.99,10.00,9780547928210.gif
The Two Towers,J.R.R. Tolkien,The Lord of the Rings,2,9780547928203,0547928203,November 1954,50,20,16.99,9.20,9780547928203.webp
The Return of the King,J.R.R. Tolkien,The Lord of the Rings,3,9780547928197,054792819X,October 1955,50,20,19.99,10.20,9780547928197.png
The Martan,Andy Weir,,,9780553418026,0553418025,February 2014,50,20,9.99,3.00,9780553418026.webp
Ready Player One,Ernest Cline,,,9780307887436,030788743X,August 2011,60,25,12.99,4.00,9780307887436.jpg
The Hitchhiker's Guide to the Galaxy,Douglas Adams,,,9780345391803,0345391802,October 1979,50,20,7.50,2.00,9780345391803.png
The Night Circus,Erin Morgenstern,,,9780307744432,0307744434,September 2011,50,20,10.99,4.00,9780307744432.jxl
`;

// distributor / format / kenp: covers every valid combo for UI testing (see validateSaleRecord).
// HAND_SOLD → print only; INGRAM_SPARK → print; AMAZON → print | ebook | kindle_unlimited; OTHER → print | ebook
const SALES_CSV = `isbn13,source,record_month_year,units_sold,total_revenue,royalty_paid,comment,distributor,format,kenp
9780062444141,handsold,October 2024,21,,y,,,,
9780307744432,handsold,April 2025,31,,y,,,,
9780765397553,distributor,September 2023,47,382.03,y,recalled for misprints,ingram_spark,print,
9780307744432,handsold,October 2025,21,,n,,,,
9780765397553,distributor,June 2023,39,299.04,y,,ingram_spark,print,
9780345391803,handsold,July 2024,31,,y,sales from bookcon,,,
9780062699237,handsold,November 2025,22,,n,,,,
9780345391803,handsold,December 2023,41,,y,,,,
9780765397539,distributor,December 2024,27,168.00,y,,amazon,print,
9780765397546,handsold,September 2024,8,,y,,,,
9780062444134,distributor,April 2023,26,233.74,y,,other,print,
9780062444134,distributor,July 2024,35,314.65,y,,amazon,ebook,
9780547928210,distributor,July 2025,22,197.78,n,,other,print,
9780307887436,distributor,April 2023,24,215.76,y,,amazon,print,
9780345391803,handsold,August 2025,15,,n,,,,
9780345391803,distributor,August 2024,24,132.00,y,,other,ebook,
9780547928203,handsold,October 2025,38,,n,,,,
9780547928210,distributor,February 2025,28,251.72,y,,ingram_spark,print,
9780062444134,handsold,July 2024,33,,y,sales from bookcon,,,
9780765397546,distributor,August 2023,36,323.64,y,,amazon,print,
9780316246620,distributor,March 2025,,112.75,y,seed Amazon Kindle Unlimited,amazon,kindle_unlimited,2400
9780547928197,distributor,May 2025,,67.20,n,seed Amazon KU unpaid,amazon,kindle_unlimited,1800
`;

// ─── Seed execution ─────────────────────────────────────────────────────────

function pickRandomCurrency(): string {
  return SEED_CURRENCIES[Math.floor(Math.random() * SEED_CURRENCIES.length)];
}

type SeedDistributor = "INGRAM_SPARK" | "AMAZON" | "OTHER";
type SeedSaleFormat = "PRINT" | "EBOOK" | "KINDLE_UNLIMITED";

function parseSeedDistributor(raw: string | undefined): SeedDistributor {
  const s = (raw ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (s.includes("ingram")) return "INGRAM_SPARK";
  if (s.includes("amazon")) return "AMAZON";
  return "OTHER";
}

function parseSeedFormat(raw: string | undefined): SeedSaleFormat {
  const s = (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
  if (s.includes("kindle") || s === "ku") return "KINDLE_UNLIMITED";
  if (s.includes("ebook")) return "EBOOK";
  return "PRINT";
}

/** Enforce spec: KU only on Amazon; Ingram → print only; Other → print or ebook. */
function normalizeDistributorFormat(
  distributor: SeedDistributor,
  format: SeedSaleFormat
): { distributor: SeedDistributor; format: SeedSaleFormat } {
  if (format === "KINDLE_UNLIMITED" && distributor !== "AMAZON") {
    return { distributor, format: "PRINT" };
  }
  if (distributor === "INGRAM_SPARK" && format !== "PRINT") {
    return { distributor, format: "PRINT" };
  }
  return { distributor, format };
}

async function main() {
  console.log("🌱 Starting seed (ev2-sample-data content, inline)...");

  const booksResult = Papa.parse<BooksRow>(BOOKS_CSV, {
    header: true,
    skipEmptyLines: true,
  });
  const salesResult = Papa.parse<SalesRow>(SALES_CSV, {
    header: true,
    skipEmptyLines: true,
  });

  const booksRows = booksResult.data.filter((r) => r.isbn13?.trim());
  const salesRows = salesResult.data.filter(
    (r) => r.isbn13?.trim() && r.record_month_year?.trim()
  );

  await prisma.sale.deleteMany();
  await prisma.book.deleteMany();
  await prisma.series.deleteMany();
  await prisma.author.deleteMany();
  await prisma.user.deleteMany();

  // ─── AUTHORS (unique by name from books) ───
  const authorNames = [
    ...new Set(booksRows.map((r) => r.author.trim()).filter(Boolean)),
  ];
  const authorMap: Record<string, { id: number }> = {};
  for (const name of authorNames) {
    const canonicalName = seedCanonicalName(name);
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`;
    const author = await prisma.author.upsert({
      where: { canonicalName },
      update: {},
      create: { name, email, canonicalName },
    });
    authorMap[name] = { id: author.id };
  }
  console.log(`✅ Authors: ${authorNames.length} (${authorNames.join(", ")})`);

  // ─── SERIES (unique non-empty series_name from books) ───
  const seriesNames = [
    ...new Set(booksRows.map((r) => r.series_name?.trim()).filter(Boolean)),
  ] as string[];
  const seriesMap: Record<string, number> = {};
  for (const name of seriesNames) {
    const series = await prisma.series.upsert({
      where: { name },
      update: {},
      create: { name, description: null },
    });
    seriesMap[name] = series.id;
  }
  console.log(`✅ Series: ${seriesNames.length}`);

  // ─── BOOKS ───────────────────────────────────────────────────────────────
  const bookByIsbn13: Record<
    string,
    {
      id: number;
      coverPrice: Decimal;
      printCost: Decimal;
      distRate: number;
      handSoldRate: number;
    }
  > = {};
  for (const row of booksRows) {
    const authorId = authorMap[row.author.trim()]?.id;
    if (!authorId) throw new Error(`Unknown author: ${row.author}`);
    const seriesName = row.series_name?.trim();
    const seriesId = seriesName ? seriesMap[seriesName] ?? null : null;
    const seriesOrder = row.series_index?.trim()
      ? parseInt(row.series_index, 10)
      : null;
    const publicationDate = parseMonthYear(row.publication_month_year);
    const distRate =
      parseInt(row.distribution_royalty_percent || "50", 10) / 100;
    const handSoldRate =
      parseInt(row.hand_sold_royalty_percent || "20", 10) / 100;
    const coverPrice = new Decimal(row.cover_price?.trim() || "0");
    const printCost = new Decimal(row.print_cost?.trim() || "0");

    const book = await prisma.book.create({
      data: {
        title: row.title.trim(),
        authorId,
        isbn13: row.isbn13.trim().replace(/[-\s]/g, ""),
        isbn10: row.isbn10?.trim().replace(/[-\s]/g, "") || null,
        distAuthorRoyaltyRate: distRate,
        handSoldAuthorRoyaltyRate: handSoldRate,
        coverPrice,
        printCost,
        publicationDate,
        seriesId,
        seriesOrder:
          seriesOrder != null && !Number.isNaN(seriesOrder)
            ? seriesOrder
            : null,
      },
    });
    bookByIsbn13[book.isbn13] = {
      id: book.id,
      coverPrice,
      printCost,
      distRate,
      handSoldRate,
    };
  }
  console.log(`✅ Books: ${booksRows.length}`);

  // ─── SALES ──────────────────────────────────────────────────────────────
  let salesCreated = 0;
  for (const row of salesRows) {
    const isbn13 = row.isbn13.trim().replace(/[-\s]/g, "");
    const book = bookByIsbn13[isbn13];
    if (!book) {
      console.warn(`⚠️ Sale skipped: no book for ISBN-13 ${isbn13}`);
      continue;
    }
    const date = parseMonthYear(row.record_month_year);
    const source = row.source?.toLowerCase().includes("hand")
      ? "HAND_SOLD"
      : "DISTRIBUTOR";
    const paid = row.royalty_paid?.toLowerCase() === "y";
    const comment = row.comment?.trim() || null;

    let distributor: SeedDistributor | null = null;
    let format: SeedSaleFormat;
    let quantity: number | null = null;
    let kenp: Decimal | null = null;

    if (source === "HAND_SOLD") {
      distributor = null;
      format = "PRINT";
      const q = parseInt(String(row.units_sold ?? "").trim(), 10);
      if (!Number.isFinite(q) || q < 1) continue;
      quantity = q;
      kenp = null;
    } else {
      let dist = parseSeedDistributor(row.distributor);
      let fmt = parseSeedFormat(row.format);
      ({ distributor: dist, format: fmt } = normalizeDistributorFormat(dist, fmt));
      distributor = dist;
      format = fmt;

      if (format === "KINDLE_UNLIMITED") {
        quantity = null;
        const k = parseFloat(String(row.kenp ?? "").trim());
        if (!Number.isFinite(k) || k < 0) {
          console.warn(`⚠️ Sale skipped: KU row needs non-negative kenp (ISBN ${isbn13})`);
          continue;
        }
        kenp = new Decimal(k);
      } else {
        const q = parseInt(String(row.units_sold ?? "").trim(), 10);
        if (!Number.isFinite(q) || q < 1) continue;
        quantity = q;
        kenp = null;
      }
    }

    const selectedCurrency = pickRandomCurrency();

    let publisherRevenueOriginal: Decimal;
    let publisherRevenueUSD: Decimal;
    let finalCurrency: string;

    if (source === "HAND_SOLD") {
      const netPerCopy = new Decimal(book.coverPrice).sub(book.printCost);
      const rev = netPerCopy.mul(quantity!);
      publisherRevenueOriginal = rev;
      publisherRevenueUSD = rev;
      finalCurrency = "USD";
    } else if (format === "KINDLE_UNLIMITED") {
      const totalRevenueStr = row.total_revenue?.trim();
      const rawAmount =
        totalRevenueStr && !Number.isNaN(parseFloat(totalRevenueStr))
          ? new Decimal(totalRevenueStr)
          : new Decimal(0);
      publisherRevenueOriginal = rawAmount;
      publisherRevenueUSD = rawAmount;
      finalCurrency = "USD";
    } else {
      const totalRevenueStr = row.total_revenue?.trim();
      const rawAmount =
        totalRevenueStr && !Number.isNaN(parseFloat(totalRevenueStr))
          ? new Decimal(totalRevenueStr)
          : new Decimal(0);
      publisherRevenueOriginal = rawAmount;
      const usdAmount = seedConvertToUSD(rawAmount.toNumber(), selectedCurrency);
      publisherRevenueUSD = new Decimal(usdAmount);
      finalCurrency = selectedCurrency;
    }

    const rate = source === "HAND_SOLD" ? book.handSoldRate : book.distRate;
    const authorRoyalty = new Decimal(publisherRevenueUSD.mul(rate).toFixed(2));

    // quantity null + kenp set for KU matches DB; Prisma input types can disagree on nullability
    await prisma.sale.create({
      data: {
        bookId: book.id,
        date,
        quantity,
        format,
        distributor,
        publisherRevenueUSD,
        publisherRevenueOriginal,
        currency: finalCurrency,
        authorRoyalty,
        source,
        paid,
        comment,
        kenp,
      } as Prisma.SaleUncheckedCreateInput,
    });
    salesCreated += 1;
  }
  console.log(`✅ Sales: ${salesCreated} records (${salesRows.length} rows in CSV)`);
  console.log(
    "   Coverage: HAND_SOLD+PRINT | INGRAM_SPARK+PRINT | AMAZON+PRINT/EBOOK/KU | OTHER+PRINT/EBOOK"
  );
  console.log("🏁 Seed complete. Data from ev2-sample-data (embedded).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
