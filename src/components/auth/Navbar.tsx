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
    <nav className="sticky top-0 z-40 border-b border-border bg-background/85 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex min-h-14 w-full min-w-0 items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="font-bold text-lg py-3 -ml-2 pl-2 pr-2 rounded-md focus:outline-none shrink-0"
        >
          {logoUrl ? (
            <img src={logoUrl} alt={branding.companyName} className="h-8 w-auto max-w-[200px] object-contain" />
          ) : (
            branding.companyName
          )}
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
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
                <span className="max-w-[10rem] cursor-default truncate text-sm text-muted-foreground sm:max-w-none">
                  {user.user_metadata?.username ?? user.email}
                </span>
                <div className="absolute right-0 top-full z-50 mt-1 hidden rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-lg group-hover:block">
                  <Link
                    href="/change-password"
                    className="block px-4 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
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
