/**
 * Seed data embedded inline (no filesystem reads). Same catalog + sales as former ev3 sample CSVs.
 * `npm run db:seed`. Cover art is not set; upload manually. `cover_image` in CSV is informational only.
 */
import "dotenv/config";
import Papa from "papaparse";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

// royalty_percent_handsold: author % for hand sold and Kickstarter sales (DB column name unchanged)
const BOOKS_CSV = `title,author,series_name,series_index,isbn13,isbn10,asin,publish_date,print_cost,cover_price,royalty_percent_distribution,royalty_percent_handsold,cover_image
"The Long Way to a Small, Angry Planet",Becky Chambers,Wayfarers,1,9780062444134,0062444131,B00ZP64F28,2014/07,6,14.99,50,20,9780062444134.jpg
A Closed and Common Orbit,Becky Chambers,Wayfarers,2,9780062569400,0062569406,B01CNLOZ3G,2016/10,5,12.99,50,20,
Record of a Spaceborn Few,Becky Chambers,Wayfarers,3,9780062699220,0062699229,B072BFJCB9,2018/07,5.5,13.99,50,20,9780062699220.png
"The Galaxy, and the Ground Within",Becky Chambers,Wayfarers,4,9780062936042,0062936042,B088RDCLQ4,2021/02,6,14.99,50,20,
All Systems Red,Martha Wells,The Murderbot Diaries,1,9780765397539,0765397536,B01MYZ8X5C,2017/05,4,9.99,50,20,9780765397539.jpg
Artificial Condition,Martha Wells,The Murderbot Diaries,2,9780765397546,0765397544,B075DGHHQL,2018/08,6,14.99,50,20,
Rogue Protocol,Martha Wells,The Murderbot Diaries,3,9781250191786,1250191785,B0756JSWGL,2018/08,5.5,12.99,50,20,
Ancillary Justice,Ann Leckie,,,9780316246620,0316246622,B00BAXFDLM,2013/10,4.5,10.99,50,20,
The Hobbit, J.R.R. Tolkien,,,9780547928227,054792822X,B007978NU6,1937/08,4,9.99,50,20,9780547928227.gif
The Fellowship of the Ring,J.R.R. Tolkien,The Lord of the Rings,1,9780547928210,0547928211,,1954/07,10,18.99,50,20,9780547928210.gif
The Two Towers,J.R.R. Tolkien,The Lord of the Rings,2,9780547928203,0547928203,,1954/11,9.2,16.99,50,20,9780547928203.webp
The Return of the King,J.R.R. Tolkien,The Lord of the Rings,3,9780547928197,054792819X,,1955/10,10.2,19.99,50,20,9780547928197.png
The Martian,Andy Weir,,,9780553418026,0553418025,,2014/02,3,9.99,50,20,9780553418026.webp
Ready Player One,Ernest Cline,,,9780307887436,030788743X,,2011/08,4,12.99,60,25,9780307887436.jpg
The Hitchhiker's Guide to the Galaxy,Douglas Adams,,,9780345391803,0345391802,B000XUBC2C,1979/10,2,7.5,50,20,9780345391803.png
The Night Circus,Erin Morgenstern,,,9780307744432,0307744434,,2011/09,4,10.99,50,20,9780307744432.jpg
`;

const RECORDS_CSV = `record_date,source,distributor,format,isbn13,qty_sold,kenp,publisher_revenue,iso_currency,author_paid
2023/01,distributor,Amazon,kindle unlimited,9780062444134,,347,69.40,USD,y
2023/02,handsold,,print,9780062699220,10,,,USD,y
2023/06,distributor,Other,ebook,9780547928203,13,,176.70,USD,y
2023/07,distributor,Ingram Spark,print,9780547928203,10,,60.91,USD,y
2023/07,handsold,,print,9780307744432,13,,,USD,y
2023/08,distributor,Ingram Spark,print,9780553418026,11,,56.93,EUR,y
2023/09,distributor,Amazon,print,9780547928210,14,,99.27,USD,y
2023/09,distributor,Ingram Spark,print,9780765397546,9,,10733,JPY,y
2024/01,distributor,Amazon,kindle unlimited,9780765397539,,437,75.50,EUR,y
2024/02,handsold,,print,9780553418026,5,,,USD,y
2024/02,handsold,,print,9781250191786,14,,,USD,y
2024/03,distributor,Other,ebook,9780547928203,6,,81.55,USD,y
2024/03,distributor,Other,print,9780553418026,12,,71.89,USD,y
2024/07,distributor,Amazon,print,9780547928210,6,,42.55,USD,y
2024/08,distributor,Other,print,9780062936042,5,,4928,JPY,y
2024/11,handsold,,print,9780307744432,9,,,USD,y
2025/02,distributor,Other,print,9780765397546,10,,11926,JPY,n
2025/02,handsold,,print,9780547928210,5,,,USD,n
2025/04,distributor,Amazon,ebook,9780765397539,14,,111.89,USD,n
2025/04,distributor,Amazon,print,9780765397539,13,,70.08,USD,n
2025/08,handsold,,print,9780547928197,9,,,USD,n
2025/09,handsold,,print,9780547928203,9,,,USD,n
2025/10,distributor,Ingram Spark,print,9780553418026,15,,89.86,USD,n
2025/12,distributor,Amazon,kindle unlimited,9780345391803,,303,60.60,USD,n
`;

/** USD per one unit of foreign currency (same convention as prior seed). */
const EXCHANGE_RATES_TO_USD: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.74,
  JPY: 0.0067,
  AUD: 0.65,
};

function seedConvertToUSD(amount: number, currencyCode: string): number {
  const code = currencyCode.trim().toUpperCase();
  const rate = EXCHANGE_RATES_TO_USD[code] ?? 1.0;
  return Math.round(amount * rate * 100) / 100;
}

/** `YYYY/MM` → first day of that month UTC */
function parseYearMonth(str: string): Date {
  const trimmed = str.trim();
  const [y, m] = trimmed.split("/").map((s) => s.trim());
  const year = parseInt(y ?? "", 10);
  const month = parseInt(m ?? "", 10);
  if (!Number.isFinite(year) || month < 1 || month > 12) {
    throw new Error(`Invalid YYYY/MM date: ${str}`);
  }
  return new Date(Date.UTC(year, month - 1, 1));
}

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
  asin: string;
  publish_date: string;
  print_cost: string;
  cover_price: string;
  royalty_percent_distribution: string;
  royalty_percent_handsold: string;
  cover_image: string;
}

interface RecordsRow {
  record_date: string;
  source: string;
  distributor: string;
  format: string;
  isbn13: string;
  qty_sold: string;
  kenp: string;
  publisher_revenue: string;
  iso_currency: string;
  author_paid: string;
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
  console.log("🌱 Starting seed (inline ev3-format CSV)…");

  const booksResult = Papa.parse<BooksRow>(BOOKS_CSV, {
    header: true,
    skipEmptyLines: true,
  });
  const recordsResult = Papa.parse<RecordsRow>(RECORDS_CSV, {
    header: true,
    skipEmptyLines: true,
  });

  const booksRows = booksResult.data.filter((r) => r.isbn13?.trim());
  const recordRows = recordsResult.data.filter(
    (r) => r.isbn13?.trim() && r.record_date?.trim()
  );

  await prisma.sale.deleteMany();
  await prisma.book.deleteMany();
  await prisma.series.deleteMany();
  await prisma.author.deleteMany();
  await prisma.user.deleteMany();

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
  console.log(`✅ Authors: ${authorNames.length}`);

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
    const publicationDate = parseYearMonth(row.publish_date);
    const distRate =
      parseInt(row.royalty_percent_distribution || "50", 10) / 100;
    const handSoldRate =
      parseInt(row.royalty_percent_handsold || "20", 10) / 100;
    const coverPrice = new Decimal(row.cover_price?.trim() || "0");
    const printCost = new Decimal(row.print_cost?.trim() || "0");

    const isbn13Norm = row.isbn13.trim().replace(/[-\s]/g, "");
    const isbn10Norm = row.isbn10?.trim().replace(/[-\s]/g, "") || null;
    const asinNorm = row.asin?.trim() || null;

    const book = await prisma.book.create({
      data: {
        title: row.title.trim(),
        authorId,
        isbn13: isbn13Norm,
        isbn10: isbn10Norm && isbn10Norm.length > 0 ? isbn10Norm : null,
        asin: asinNorm && asinNorm.length > 0 ? asinNorm : null,
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
        // coverArtPath: null — upload covers manually; cover_image filename is informational only
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

  let salesCreated = 0;
  for (const row of recordRows) {
    const isbn13 = row.isbn13.trim().replace(/[-\s]/g, "");
    const book = bookByIsbn13[isbn13];
    if (!book) {
      console.warn(`⚠️ Sale skipped: no book for ISBN-13 ${isbn13}`);
      continue;
    }

    const date = parseYearMonth(row.record_date);
    const source = row.source?.toLowerCase().includes("hand")
      ? "HAND_SOLD"
      : "DISTRIBUTOR";
    const paid = row.author_paid?.trim().toLowerCase() === "y";
    const currencyUpper = (row.iso_currency?.trim() || "USD").toUpperCase();

    let distributor: SeedDistributor | null = null;
    let format: SeedSaleFormat;
    let quantity: number | null = null;
    let kenp: Decimal | null = null;

    if (source === "HAND_SOLD") {
      distributor = null;
      format = "PRINT";
      const q = parseInt(String(row.qty_sold ?? "").trim(), 10);
      if (!Number.isFinite(q) || q < 1) continue;
      quantity = q;
      kenp = null;
    } else {
      let dist = parseSeedDistributor(row.distributor);
      let fmt = parseSeedFormat(row.format);
      ({ distributor: dist, format: fmt } = normalizeDistributorFormat(
        dist,
        fmt
      ));
      distributor = dist;
      format = fmt;

      if (format === "KINDLE_UNLIMITED") {
        quantity = null;
        const k = parseFloat(String(row.kenp ?? "").trim());
        if (!Number.isFinite(k) || k < 0) {
          console.warn(
            `⚠️ Sale skipped: KU row needs non-negative kenp (ISBN ${isbn13})`
          );
          continue;
        }
        kenp = new Decimal(k);
      } else {
        const q = parseInt(String(row.qty_sold ?? "").trim(), 10);
        if (!Number.isFinite(q) || q < 1) continue;
        quantity = q;
        kenp = null;
      }
    }

    let publisherRevenueOriginal: Decimal;
    let publisherRevenueUSD: Decimal;
    let finalCurrency: string;

    const revenueStr = row.publisher_revenue?.trim() ?? "";

    if (source === "HAND_SOLD") {
      const netPerCopy = new Decimal(book.coverPrice).sub(book.printCost);
      const rev = netPerCopy.mul(quantity!);
      publisherRevenueOriginal = rev;
      publisherRevenueUSD = rev;
      finalCurrency = "USD";
    } else if (revenueStr === "" || Number.isNaN(parseFloat(revenueStr))) {
      console.warn(
        `⚠️ Sale skipped: distributor row missing publisher_revenue (ISBN ${isbn13})`
      );
      continue;
    } else if (format === "KINDLE_UNLIMITED") {
      const rawAmount = new Decimal(revenueStr);
      publisherRevenueOriginal = rawAmount;
      publisherRevenueUSD = new Decimal(
        seedConvertToUSD(rawAmount.toNumber(), currencyUpper)
      );
      finalCurrency = currencyUpper;
    } else {
      const rawAmount = new Decimal(revenueStr);
      publisherRevenueOriginal = rawAmount;
      publisherRevenueUSD = new Decimal(
        seedConvertToUSD(rawAmount.toNumber(), currencyUpper)
      );
      finalCurrency = currencyUpper;
    }

    const rate = source === "HAND_SOLD" ? book.handSoldRate : book.distRate;
    const authorRoyalty = new Decimal(
      publisherRevenueUSD.mul(rate).toFixed(2)
    );

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
        comment: null,
        kenp,
      } as Prisma.SaleUncheckedCreateInput,
    });
    salesCreated += 1;
  }

  console.log(
    `✅ Sales: ${salesCreated} records (${recordRows.length} rows in embedded records CSV)`
  );
  console.log("🏁 Seed complete (covers: upload manually).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
