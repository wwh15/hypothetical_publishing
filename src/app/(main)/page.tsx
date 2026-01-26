import Link from "next/link";

export default function Home() {
  return (
    <div className="container mx-auto py-10">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Hypothetical Publishing</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Manage your publishing business with ease. Track books, sales, and author payments all in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Books Card */}
        <Link
          href="/books"
          className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-lg transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">📚</div>
            <h2 className="text-xl font-semibold">Books</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage your book catalog. Add new books, edit details, and track ISBN information.
          </p>
        </Link>

        {/* Sales Card */}
        <Link
          href="/sales"
          className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-lg transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">📊</div>
            <h2 className="text-xl font-semibold">Sales</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage sales records and author payments. View transactions, track royalties, and process payments.
          </p>
        </Link>

        {/* Add Record Card */}
        <Link
          href="/sales/add-record"
          className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-lg transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">➕</div>
            <h2 className="text-xl font-semibold">Add Record</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Quickly add new sales records. Enter book details, quantities, and revenue information.
          </p>
        </Link>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
    
        {/* Welcome Card */}
        <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-2">Welcome</h3>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            Get started by exploring your books catalog or adding a new sales record. All your publishing data is organized and easily accessible.
          </p>
        </div>
      </div>
    </div>
  );
}