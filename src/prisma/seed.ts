/**
 * Seed data embedded inline (no filesystem reads). Evolution 4 sample catalog + sales.
 * `npm run db:seed`. Cover art is not set; upload manually. `cover_image` in CSV is informational only.
 */
import "dotenv/config";
import Papa from "papaparse";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

const AUTHORS_CSV = `name,email,paypal_name,venmo_name
Becky Chambers,bc@example.com,bc_payments,bc_payments
Martha Wells,mw@example.com,martha.wells,
Ann Leckie,al@example.com,,aleckie
J.R.R. Tolkien,jrrt@example.com,jrrt_estate,
Andy Weir,aw@example.com,,
Ernest Cline,ec@example.com,ecline72,
Douglas Adams,da@example.com,,doug.adams
Erin Morgenstern,em@example.com,,
`;

const BOOKS_CSV = `title,author,series_name,series_index,isbn13,isbn10,asin,kickstarter_ebook,kickstarter_paperback,publish_date,is_released,print_cost,cover_price,royalty_percent_distribution,royalty_percent_handsold,cover_image
"The Long Way to a Small, Angry Planet",Becky Chambers,Wayfarers,1,9780062444134,62444131,B00ZP64F28,ebook-tlwtasap,paperback-tlwtasap,2014/07,y,6,14.99,50,20,9780062444134.jpg
A Closed and Common Orbit,Becky Chambers,Wayfarers,2,9780062569400,62569406,B01CNLOZ3G,ebook-acaco,paperback-acaco,2016/10,y,5,12.99,50,20,
Record of a Spaceborn Few,Becky Chambers,Wayfarers,3,9780062699220,62699229,B072BFJCB9,ebook-wayfarers-3,paperback-wayfarers-3,2018/07,n,5.5,13.99,50,20,9780062699220.png
"The Galaxy, and the Ground Within",Becky Chambers,Wayfarers,4,9780062936042,62936042,B088RDCLQ4,ebook-wayfarers-4,paperback-wayfarers-4,2021/02,n,6,14.99,50,20,
All Systems Red,Martha Wells,The Murderbot Diaries,1,9780765397539,765397536,B01MYZ8X5C,,,2017/05,y,4,9.99,50,20,9780765397539.jpg
Artificial Condition,Martha Wells,The Murderbot Diaries,2,9780765397546,765397544,B075DGHHQL,,,2018/08,y,6,14.99,50,20,
Rogue Protocol,Martha Wells,The Murderbot Diaries,3,9781250191786,1250191785,B0756JSWGL,,,2018/08,y,5.5,12.99,50,20,
Ancillary Justice,Ann Leckie,,,9780316246620,316246622,B00BAXFDLM,,,2013/10,y,4.5,10.99,50,20,
The Hobbit, J.R.R. Tolkien,,,9780547928227,054792822X,B007978NU6,,,1937/08,y,4,9.99,50,20,9780547928227.gif
The Fellowship of the Ring,J.R.R. Tolkien,The Lord of the Rings,1,9780547928210,547928211,,,,1954/07,y,10,18.99,50,20,9780547928210.gif
The Two Towers,J.R.R. Tolkien,The Lord of the Rings,2,9780547928203,547928203,,,,1954/11,y,9.2,16.99,50,20,9780547928203.webp
The Return of the King,J.R.R. Tolkien,The Lord of the Rings,3,9780547928197,054792819X,,,,1955/10,y,10.2,19.99,50,20,9780547928197.png
The Martian,Andy Weir,,,9780553418026,553418025,,,,2014/02,y,3,9.99,50,20,9780553418026.webp
Ready Player One,Ernest Cline,,,9780307887436,030788743X,,,,2011/08,y,4,12.99,60,25,9780307887436.jpg
The Hitchhiker's Guide to the Galaxy,Douglas Adams,,,9780345391803,345391802,B000XUBC2C,,paperback-hitchhikers-guide,1979/10,y,2,7.5,50,20,9780345391803.png
The Night Circus,Erin Morgenstern,,,9780307744432,307744434,,,,2011/09,n,4,10.99,50,20,9780307744432.jpg
`;

const RECORDS_CSV = `record_date,source,distributor,format,isbn13,qty_sold,kenp,publisher_revenue,iso_currency,author_paid
2023/01,distributor,Amazon,kindle unlimited,9780062444134,,347,69.40,USD,y
2023/02,kickstarter,,ebook,9780062699220,10,,,USD,n
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
2024/08,kickstarter,,print,9780062936042,5,,,USD,n
2024/11,handsold,,print,9780307744432,9,,,USD,y
2025/02,distributor,Other,print,9780765397546,10,,11926,JPY,n
2025/02,handsold,,print,9780547928210,5,,,USD,n
2025/04,distributor,Amazon,ebook,9780765397539,14,,111.89,USD,n
2025/04,distributor,Amazon,print,9780765397539,13,,70.08,USD,n
2025/08,handsold,,print,9780547928197,9,,,USD,n
2025/09,handsold,,print,9780547928203,9,,,USD,n
2025/10,distributor,Ingram Spark,print,9780553418026,15,,89.86,USD,n
2025/12,kickstarter,,print,9780345391803,18,,,USD,n
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

/** ISBN-10 without dashes; pad sample short numerics to 10 chars. */
function normalizeIsbn10(raw: string | undefined): string | null {
  const d = (raw ?? "").replace(/[-\s]/g, "");
  if (!d) return null;
  if (d.length === 10) return d;
  if (d.length < 10) return d.padStart(10, "0");
  return d.slice(0, 10);
}

interface AuthorsRow {
  name: string;
  email: string;
  paypal_name: string;
  venmo_name: string;
}

interface BooksRow {
  title: string;
  author: string;
  series_name: string;
  series_index: string;
  isbn13: string;
  isbn10: string;
  asin: string;
  kickstarter_ebook: string;
  kickstarter_paperback: string;
  publish_date: string;
  is_released: string;
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

function parseSeedSaleSource(
  raw: string | undefined
): "DISTRIBUTOR" | "HAND_SOLD" | "KICKSTARTER" {
  const s = (raw ?? "").trim().toLowerCase();
  if (s.includes("kickstarter")) return "KICKSTARTER";
  if (s.includes("hand")) return "HAND_SOLD";
  return "DISTRIBUTOR";
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

/** Matches `autoPublisherRevenueUsd` for hand sold / Kickstarter (USD). */
function publisherRevenueUsdFromBook(
  coverPrice: Decimal,
  printCost: Decimal,
  quantity: number,
  source: "HAND_SOLD" | "KICKSTARTER",
  format: SeedSaleFormat
): Decimal {
  if (source === "HAND_SOLD") {
    return coverPrice.sub(printCost).mul(quantity);
  }
  const printCostPerUnit = format === "EBOOK" ? new Decimal(0) : printCost;
  return coverPrice.sub(printCostPerUnit).mul(quantity);
}

async function main() {
  console.log("🌱 Starting seed (inline ev4-format CSV)…");

  const authorsResult = Papa.parse<AuthorsRow>(AUTHORS_CSV, {
    header: true,
    skipEmptyLines: true,
  });
  const booksResult = Papa.parse<BooksRow>(BOOKS_CSV, {
    header: true,
    skipEmptyLines: true,
  });
  const recordsResult = Papa.parse<RecordsRow>(RECORDS_CSV, {
    header: true,
    skipEmptyLines: true,
  });

  const authorRows = authorsResult.data.filter((r) => r.name?.trim());
  const booksRows = booksResult.data.filter((r) => r.isbn13?.trim());
  const recordRows = recordsResult.data.filter(
    (r) => r.isbn13?.trim() && r.record_date?.trim()
  );

  await prisma.sale.deleteMany();
  await prisma.book.deleteMany();
  await prisma.series.deleteMany();
  await prisma.author.deleteMany();
  await prisma.user.deleteMany();

  const authorMap: Record<string, { id: number }> = {};
  for (const row of authorRows) {
    const name = row.name.trim();
    const canonicalName = seedCanonicalName(name);
    const email =
      row.email?.trim() ||
      `${canonicalName.replace(/\s+/g, ".")}@example.com`;
    const payPalUsername = row.paypal_name?.trim() || undefined;
    const venmoUsername = row.venmo_name?.trim() || undefined;
    const paymentHandles = {
      ...(payPalUsername ? { payPalUsername } : {}),
      ...(venmoUsername ? { venmoUsername } : {}),
    };
    const author = await prisma.author.upsert({
      where: { canonicalName },
      update: paymentHandles,
      create: { name, email, canonicalName, ...paymentHandles },
    });
    authorMap[name] = { id: author.id };
  }
  console.log(`✅ Authors: ${authorRows.length}`);

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
    const authorKey = row.author.trim();
    const authorId = authorMap[authorKey]?.id;
    if (!authorId) {
      throw new Error(`Unknown author for book "${row.title}": ${authorKey}`);
    }
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
    const isbn10Norm = normalizeIsbn10(row.isbn10);
    const asinNorm = row.asin?.trim() || null;

    const released =
      (row.is_released?.trim().toLowerCase() ?? "y") === "y";

    const ksEbook = row.kickstarter_ebook?.trim() || null;
    const ksPrint = row.kickstarter_paperback?.trim() || null;

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
        released,
        kickstarterEbookItemTag: ksEbook,
        kickstarterPrintItemTag: ksPrint,
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

  let salesCreated = 0;
  for (const row of recordRows) {
    const isbn13 = row.isbn13.trim().replace(/[-\s]/g, "");
    const book = bookByIsbn13[isbn13];
    if (!book) {
      console.warn(`⚠️ Sale skipped: no book for ISBN-13 ${isbn13}`);
      continue;
    }

    const date = parseYearMonth(row.record_date);
    const saleSource = parseSeedSaleSource(row.source);
    const paid = row.author_paid?.trim().toLowerCase() === "y";
    const currencyUpper = (row.iso_currency?.trim() || "USD").toUpperCase();

    let distributor: SeedDistributor | null = null;
    let format: SeedSaleFormat;
    let quantity: number | null = null;
    let kenp: Decimal | null = null;

    if (saleSource === "HAND_SOLD") {
      distributor = null;
      format = "PRINT";
      const q = parseInt(String(row.qty_sold ?? "").trim(), 10);
      if (!Number.isFinite(q) || q < 1) continue;
      quantity = q;
      kenp = null;
    } else if (saleSource === "KICKSTARTER") {
      distributor = null;
      format = parseSeedFormat(row.format);
      if (format === "KINDLE_UNLIMITED") {
        console.warn(
          `⚠️ Sale skipped: Kickstarter row with KU format (ISBN ${isbn13})`
        );
        continue;
      }
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
        const k = parseInt(String(row.kenp ?? "").trim(), 10);
        if (!Number.isFinite(k) || k < 1) {
          console.warn(
            `⚠️ Sale skipped: KU row needs positive integer kenp (ISBN ${isbn13})`
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

    if (saleSource === "HAND_SOLD" || saleSource === "KICKSTARTER") {
      const rev = publisherRevenueUsdFromBook(
        book.coverPrice,
        book.printCost,
        quantity!,
        saleSource,
        format
      );
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

    const rate =
      saleSource === "DISTRIBUTOR" ? book.distRate : book.handSoldRate;
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
        source: saleSource,
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
