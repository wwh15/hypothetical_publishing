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
          alt={companyName}
          className="h-12 w-auto max-w-[250px] object-contain mx-auto mb-2"
        />
      ) : (
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          {companyName}
        </h1>
      )}
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {tagline}
      </p>
    </div>
  );
}
