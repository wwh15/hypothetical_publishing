import Link from "next/link";
import { getUser } from "@/lib/supabase/auth";
import LogoutButton from "./LogoutButton";
import { getBranding } from "@/lib/data/branding";
import { getBrandingLogoSignedUrl } from "@/lib/supabase/storage";

export default async function Navbar() {
  const user = await getUser();
  const branding = await getBranding();

  let logoUrl: string | null = null;
  if (branding.logoPath) {
    const { url } = await getBrandingLogoSignedUrl(branding.logoPath);
    logoUrl = url;
  }

  return (
    <nav className="border-b bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 min-h-14 px-4 sm:px-6">
        <Link
          href="/"
          className="font-bold text-lg py-3 -ml-2 pl-2 pr-2 rounded-md focus:outline-none shrink-0"
        >
          {logoUrl ? (
            <img src={logoUrl} alt={branding.companyName} className="h-8 max-w-[200px] object-contain" />
          ) : (
            branding.companyName
          )}
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <nav className="flex items-center gap-4">
                <Link
                  href="/books"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-[var(--brand-primary)] transition-colors"
                >
                  Books
                </Link>
                <Link
                  href="/sales/records"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-[var(--brand-primary)] transition-colors"
                >
                  Sales
                </Link>
                <Link
                  href="/authors"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-[var(--brand-primary)] transition-colors"
                >
                  Authors
                </Link>
                <Link
                  href="/sales/payments"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-[var(--brand-primary)] transition-colors"
                >
                  Author Payments
                </Link>
                <Link
                  href="/reports"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-[var(--brand-primary)] transition-colors"
                >
                  Reports
                </Link>
                <Link
                  href="/settings/branding"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-[var(--brand-primary)] transition-colors"
                >
                  Settings
                </Link>
              </nav>
              <div className="group relative flex items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  {user.user_metadata?.username ?? user.email}
                </span>
                <div className="absolute right-0 top-full hidden group-hover:block bg-white dark:bg-gray-800 border rounded-md shadow-md py-1 z-10 whitespace-nowrap">
                  <Link
                    href="/change-password"
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
              className="px-3 py-1 text-sm bg-[var(--brand-primary)] text-[var(--brand-primary-text)] rounded-md hover:bg-[var(--brand-primary-hover)]"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
