import { asyncGetSaleById } from '@/lib/data/records';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSaleById } from '../../action';

interface PageProps {
  params: Promise<{ record_id: string }>;
}

export default async function SalesRecordDetailPage({ params }: PageProps) {
  const { record_id } = await params;
  const saleId = parseInt(record_id);

  // Fetch the sale data
  const sale = await getSaleById(saleId);

  // If sale not found, show 404
  if (!sale) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      {/* Header with back button */}
      <div className="mb-6">
        <Link 
          href="/sales/records" 
          className="text-blue-600 hover:underline mb-2 inline-block"
        >
          ← Back to Sales Records
        </Link>
        <h1 className="text-3xl font-bold">Sales Record Details</h1>
        <p className="text-muted-foreground mt-2">
          View and manage sale record #{sale.id}
        </p>
      </div>

      {/* Detail Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ID */}
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Record ID
            </label>
            <p className="text-lg font-semibold mt-1">{sale.id}</p>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Book Title
            </label>
            <p className="text-lg font-semibold mt-1">{sale.book.title}</p>
          </div>

          {/* Author */}
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Author
            </label>
            <p className="text-lg font-semibold mt-1">{sale.book.author.name}</p>
          </div>

          {/* Date */}
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Period (Month/Year)
            </label>
            <p className="text-lg font-semibold mt-1">{sale.date}</p>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Quantity Sold
            </label>
            <p className="text-lg font-semibold mt-1">{sale.quantity} units</p>
          </div>

          {/* Publisher Revenue */}
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Publisher Revenue
            </label>
            <p className="text-lg font-semibold mt-1 text-green-600">
              ${sale.publisherRevenue.toFixed(2)}
            </p>
          </div>

          {/* Author Royalty */}
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Author Royalty
            </label>
            <p className="text-lg font-semibold mt-1 text-blue-600">
              ${sale.authorRoyalty.toFixed(2)}
            </p>
          </div>

          {/* Paid Status */}
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Royalty Payment Status
            </label>
            <div className="mt-1">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  sale.paid
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}
              >
                {sale.paid ? 'Paid' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Edit Record
          </button>
          <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
            Delete Record
          </button>
        </div>
      </div>
    </div>
  );
}