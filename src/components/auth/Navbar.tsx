import Link from "next/link";
import { getUser } from "@/lib/supabase/auth";
import LogoutButton from "./LogoutButton";
import { getBranding } from "@/lib/data/branding";
import { getBrandingLogoSignedUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";

const navLinkClass = cn(
  "text-sm font-medium text-muted-foreground transition-colors",
  "hover:text-foreground"
);

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
          className="shrink-0 rounded-md py-3 -ml-2 pl-2 pr-2 text-lg font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="inline-flex min-w-0 max-w-full items-center gap-2.5">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                aria-hidden
                className="h-8 w-auto max-w-[140px] shrink-0 object-contain sm:max-w-[200px]"
              />
            ) : null}
            <span className="truncate">{branding.companyName}</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          {user ? (
            <>
              <nav className="hidden items-center gap-1 sm:flex md:gap-2">
                <Link href="/books" className={cn(navLinkClass, "rounded-md px-2 py-1.5")}>
                  Books
                </Link>
                <Link href="/sales/records" className={cn(navLinkClass, "rounded-md px-2 py-1.5")}>
                  Sales
                </Link>
                <Link href="/authors" className={cn(navLinkClass, "rounded-md px-2 py-1.5")}>
                  Authors
                </Link>
                <Link href="/sales/payments" className={cn(navLinkClass, "rounded-md px-2 py-1.5")}>
                  Author Payments
                </Link>
                <Link href="/reports" className={cn(navLinkClass, "rounded-md px-2 py-1.5")}>
                  Reports
                </Link>
                <Link href="/settings/branding" className={cn(navLinkClass, "rounded-md px-2 py-1.5")}>
                  Settings
                </Link>
              </nav>
              {/* Compact nav on narrow screens */}
              <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:hidden">
                <Link href="/books" className={navLinkClass}>
                  Books
                </Link>
                <Link href="/sales/records" className={navLinkClass}>
                  Sales
                </Link>
                <Link href="/authors" className={navLinkClass}>
                  Authors
                </Link>
                <Link href="/sales/payments" className={navLinkClass}>
                  Pay
                </Link>
                <Link href="/reports" className={navLinkClass}>
                  Reports
                </Link>
                <Link href="/settings/branding" className={navLinkClass}>
                  Settings
                </Link>
              </nav>
              <div className="group relative flex items-center">
                <span className="max-w-[10rem] cursor-default truncate text-sm text-muted-foreground sm:max-w-none">
                  {user.user_metadata?.username ?? user.email}
                </span>
                <div className="absolute right-0 top-full z-50 hidden rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-lg group-hover:block">
                  <Link
                    href="/change-password"
                    className="block whitespace-nowrap px-4 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
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
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
