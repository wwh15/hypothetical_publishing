import type { ReactNode } from "react";
import { getBookById } from "../action";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import SalesRowsTable from "@/app/(main)/sales/components/SalesRowsTable";
import DeleteBookButton from "./components/DeleteBookButton";
import { BookCoverSlot } from "./components/BookCoverSlot";
import { Button } from "@/components/ui/button";
import { getSalesByBookId } from "@/lib/data/records";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    salesPage?: string;
    salesSortBy?: string;
    salesSortDir?: string;
    salesPageSize?: string;
  }>;
}

function DetailItem({
  label,
  children,
  muted,
}: {
  label: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <div className={muted ? "opacity-90" : ""}>
      <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default async function BookDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const bookId = parseInt(id);

  const book = await getBookById(bookId);
  if (!book) {
    notFound();
  }

  const sp = await searchParams;
  const salesPage = Math.max(1, Number(sp?.salesPage) || 1);
  const salesPageSize = Math.min(100, Math.max(1, Number(sp?.salesPageSize) || 10));
  const salesSortBy = sp?.salesSortBy ?? "date";
  const salesSortDir = (sp?.salesSortDir === "asc" ? "asc" : "desc") as "asc" | "desc";

  const salesResult = await getSalesByBookId(bookId, {
    page: salesPage,
    pageSize: salesPageSize,
    sortBy: salesSortBy,
    sortDir: salesSortDir,
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  };

  const formatPublicationDate = () =>
    new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(book.publicationDate);

  const money = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="py-8 pb-16">
      <BackLink href="/books" className="mb-6 inline-block text-sm">
        Back to Books
      </BackLink>

      {/* Hero: cover + primary identity + stats */}
      <header className="mb-10 border-b border-border/80 pb-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-10 xl:gap-14">
          <BookCoverSlot
            title={book.title}
            coverArtPath={book.coverArtPath}
            className="mx-auto shrink-0 lg:mx-0 lg:self-start"
          />

          <div className="min-w-0 flex-1 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-3">
                <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.35rem] lg:leading-tight">
                  {book.title}
                </h1>
                <p className="text-lg text-muted-foreground sm:text-xl">
                  by{" "}
                  <Link
                    href={`/authors/${book.authorId}`}
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {book.author}
                  </Link>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      book.released
                        ? "inline-flex items-center rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100"
                        : "inline-flex items-center rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-950 dark:bg-amber-950/50 dark:text-amber-100"
                    }
                  >
                    {book.released ? "Released" : "Pre-release"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Publication {formatPublicationDate()}
                  </span>
                  {book.seriesName && (
                    <span className="text-sm text-muted-foreground">
                      · {book.seriesName}
                      {book.seriesOrder != null ? ` #${book.seriesOrder}` : ""}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                <Button asChild>
                  <Link href={`/books/${bookId}/edit`}>Edit book</Link>
                </Button>
                <DeleteBookButton
                  bookId={bookId}
                  bookTitle={book.title}
                  author={book.author}
                  salesRecordCount={salesResult.total}
                  className="cursor-pointer"
                />
              </div>
            </div>

            {/* Sales summary — single band, full width of column */}
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border shadow-sm sm:grid-cols-3 xl:grid-cols-5">
              <div className="bg-card p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Units sold
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
                  {book.totalSales.toLocaleString()}
                </p>
              </div>
              <div className="bg-card p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Publisher revenue
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
                  ${money(book.totalPublisherRevenue)}
                </p>
              </div>
              <div className="bg-card p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Author royalty (total)
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
                  ${money(book.totalAuthorRoyalty)}
                </p>
              </div>
              <div className="bg-card p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700/90 dark:text-amber-400/90">
                  Unpaid royalty
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-amber-700 dark:text-amber-400 sm:text-3xl">
                  ${money(book.unpaidAuthorRoyalty)}
                </p>
              </div>
              <div className="bg-card p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700/90 dark:text-emerald-400/90">
                  Paid royalty
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-400 sm:text-3xl">
                  ${money(book.paidAuthorRoyalty)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Secondary fields — dense grid, full width */}
      <section className="mb-12">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">
          Identifiers, rates &amp; costs
        </h2>
        <dl className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <DetailItem label="ISBN-13">{book.isbn13}</DetailItem>
          <DetailItem label="ISBN-10">{book.isbn10 || "—"}</DetailItem>
          <DetailItem label="ASIN">{book.asin || "—"}</DetailItem>
          <DetailItem label="Distributor royalty rate">{book.distRoyaltyRate}%</DetailItem>
          <DetailItem label="Hand sold / Kickstarter royalty rate">
            {book.handSoldRoyaltyRate}%
          </DetailItem>
          <DetailItem label="Cover price">${book.coverPrice.toFixed(2)}</DetailItem>
          <DetailItem label="Print cost">${book.printCost.toFixed(2)}</DetailItem>
          <DetailItem label="Kickstarter tag (ebook)">
            <span className="font-mono text-xs break-all">{book.kickstarterEbookItemTag ?? "—"}</span>
          </DetailItem>
          <DetailItem label="Kickstarter tag (print)">
            <span className="font-mono text-xs break-all">{book.kickstarterPrintItemTag ?? "—"}</span>
          </DetailItem>
          <DetailItem label="Created" muted>
            {formatDate(book.createdAt)}
          </DetailItem>
          <DetailItem label="Last updated" muted>
            {formatDate(book.updatedAt)}
          </DetailItem>
        </dl>
      </section>

      {/* Sales history */}
      <section className="border-t border-border/80 pt-10">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Sales for this book</h2>
          <Button asChild className="w-full shrink-0 sm:w-auto bg-emerald-600 hover:bg-emerald-700">
            <Link href={`/sales/add-record?bookId=${bookId}`}>Add sale</Link>
          </Button>
        </div>
        {salesResult.total > 0 ? (
          <SalesRowsTable
            rows={salesResult.items}
            preset="bookDetail"
            navigationContext={{ from: "book", bookId: book.id }}
            total={salesResult.total}
            page={salesResult.page}
            pageSize={salesResult.pageSize}
            sortBy={salesSortBy}
            sortDir={salesSortDir}
            basePath={`/books/${bookId}`}
            paramPrefix="sales"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No sales yet. Add a record with the button above or from Sales → Add record.
          </p>
        )}
      </section>
    </div>
  );
}
