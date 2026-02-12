import Link from "next/link";
import { getUser } from "@/lib/supabase/auth";
import LogoutButton from "./LogoutButton";

export default async function Navbar() {
  const user = await getUser();

  return (
    <nav className="border-b bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">
          Hypothetical Publishing
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <nav className="flex items-center gap-4">
                <Link
                  href="/books"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Books
                </Link>
                <Link
                  href="/sales/records"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Sales
                </Link>
                <Link
                  href="/sales/payments"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Author Payments
                </Link>
              </nav>
              <div className="group relative pb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  {user.email}
                </span>
                <div className="absolute right-0 top-full hidden group-hover:block bg-white dark:bg-gray-800 border rounded-md shadow-md py-1 z-10 whitespace-nowrap">
                  <Link
                    href="/reset-password"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Change Password
                  </Link>
                </div>
              </div>
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
