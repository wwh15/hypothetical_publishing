import Link from "next/link";

const backLinkClass =
  "text-sm text-muted-foreground hover:text-foreground inline-block";

interface BackLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

/** Standard back navigation link (e.g. "← Reports"). Use for consistent back buttons across the app. */
export function BackLink({ href, children, className = "" }: BackLinkProps) {
  return (
    <Link href={href} className={`${backLinkClass} ${className}`.trim()}>
      ← {children}
    </Link>
  );
}
