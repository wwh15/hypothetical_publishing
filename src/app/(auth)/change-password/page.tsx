import { getBranding } from "@/lib/data/branding";
import { getBrandingLogoSignedUrl } from "@/lib/supabase/storage";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const branding = await getBranding();

  let logoUrl: string | null = null;
  if (branding.logoPath) {
    const { url } = await getBrandingLogoSignedUrl(branding.logoPath);
    logoUrl = url;
  }

  return (
    <ChangePasswordForm
      companyName={branding.companyName}
      tagline={branding.tagline}
      logoUrl={logoUrl}
    />
  );
}
