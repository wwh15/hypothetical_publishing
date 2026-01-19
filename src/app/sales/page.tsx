// src/app/sales/page.tsx
import Link from 'next/link';

export const dynamic = "force-dynamic";

export default function SalesLanding() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-2">Sales Management</h1>
      <p className="text-muted-foreground mb-8">
        Manage sales records and author payments
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sales Records Card */}
        <Link 
          href="/sales/records"
          className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">📊 Sales Records</h2>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage all sales transactions. Sort, filter, and navigate to detailed records.
          </p>
        </Link>

        {/* Author Payments Card */}
        <Link 
          href="/sales/payments"
          className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">💰 Author Payments</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Review unpaid royalties grouped by author and process bulk payments.
          </p>
        </Link>

      </div>
    </div>
  );
}