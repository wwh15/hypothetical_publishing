import { getBranding } from "@/lib/data/branding";
import { getBrandingLogoSignedUrl } from "@/lib/supabase/storage";
import BrandingForm from "./BrandingForm";

export const metadata = {
  title: "Branding Settings",
};

export default async function BrandingSettingsPage() {
  const branding = await getBranding();

  let logoUrl: string | null = null;
  if (branding.logoPath) {
    const { url } = await getBrandingLogoSignedUrl(branding.logoPath);
    logoUrl = url;
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Branding
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Customize how your publishing platform looks to users.
        </p>
      </div>

      <BrandingForm branding={branding} logoUrl={logoUrl} />
    </div>
  );
}
