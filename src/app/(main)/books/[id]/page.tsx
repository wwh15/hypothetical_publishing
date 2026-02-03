import { getBookById } from '../action';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SalesRecordsTable from '@/app/(main)/sales/components/SalesRecordsTable';
import DeleteBookButton from './components/DeleteBookButton';

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookDetailPage({ params }: PageProps) {
  const { id } = await params;
  const bookId = parseInt(id);

  const book = await getBookById(bookId);

  if (!book) {
    notFound();
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatPublicationDate = () => {
    if (book.publicationMonth && book.publicationYear) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthIndex = parseInt(book.publicationMonth) - 1;
      const monthName = monthIndex >= 0 && monthIndex < 12 
        ? monthNames[monthIndex] 
        : book.publicationMonth;
      return `${monthName} ${book.publicationYear}`;
    }
    return 'Not specified';
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Link 
          href="/books"
          className="text-blue-600 hover:underline mb-2 inline-block"
        >
          ← Back to Books
        </Link>
        <h1 className="text-3xl font-bold">{book.title}</h1>
        <p className="text-muted-foreground mt-2">
          Book Details
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        {/* Basic Information */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Title</label>
              <p className="text-lg">{book.title}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Author(s)</label>
              <p className="text-lg">{book.authors}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">ISBN-13</label>
              <p className="text-lg">{book.isbn13 || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">ISBN-10</label>
              <p className="text-lg">{book.isbn10 || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Publication Date</label>
              <p className="text-lg">{formatPublicationDate()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Default Royalty Rate</label>
              <p className="text-lg">{book.defaultRoyaltyRate}%</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created At</label>
              <p className="text-lg">{formatDate(book.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Updated At</label>
              <p className="text-lg">{formatDate(book.updatedAt)}</p>
            </div>
          </div>
        </section>

        {/* Totals Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Sales Totals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">Total Sales</label>
              <p className="text-2xl font-bold">{book.totalSales.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">Total Publisher Revenue</label>
              <p className="text-2xl font-bold">${book.totalPublisherRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">Unpaid Author Royalty</label>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">${book.unpaidAuthorRoyalty.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">Paid Author Royalty</label>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">${book.paidAuthorRoyalty.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Total Author Royalty</label>
              <p className="text-2xl font-bold">${book.totalAuthorRoyalty.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </section>

        {/* Sales Records Section */}
        {book.sales && book.sales.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Sales Records</h2>
            <SalesRecordsTable 
              rows={book.sales} 
              preset="bookDetail"
              navigationContext={{ from: 'book', bookId: book.id }}
            />
          </section>
        )}

        {/* Action Buttons */}
        <section className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            <Link
              href={`/books/${bookId}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
            >
              Edit Book
            </Link>
            <DeleteBookButton
              bookId={bookId}
              bookTitle={book.title}
              authors={book.authors}
              salesRecordCount={book.sales?.length ?? 0}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
