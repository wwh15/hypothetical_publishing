interface AuthLogoProps {
  companyName?: string;
  tagline?: string;
  logoUrl?: string | null;
}

export default function AuthLogo({
  companyName = "Hypothetical Publishing",
  tagline = "Book publishing & royalty management",
  logoUrl = null,
}: AuthLogoProps) {
  return (
    <div className="mb-8 text-center">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          aria-hidden
          className="mx-auto mb-3 h-12 w-auto max-w-[250px] object-contain"
        />
      ) : null}
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        {companyName}
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {tagline}
      </p>
    </div>
  );
}
