import { getBranding } from "@/lib/data/branding";
import { getBrandingLogoSignedUrl } from "@/lib/supabase/storage";

export default async function AuthLogo() {
  const branding = await getBranding();

  let logoUrl: string | null = null;
  if (branding.logoPath) {
    const { url } = await getBrandingLogoSignedUrl(branding.logoPath);
    logoUrl = url;
  }

  return (
    <div className="mb-8 text-center">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={branding.companyName}
          className="h-12 max-w-[250px] object-contain mx-auto mb-2"
        />
      ) : (
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          {branding.companyName}
        </h1>
      )}
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {branding.tagline}
      </p>
    </div>
  );
}
