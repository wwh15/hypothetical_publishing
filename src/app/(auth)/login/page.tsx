import { getBranding } from "@/lib/data/branding";
import { getBrandingLogoSignedUrl } from "@/lib/supabase/storage";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const branding = await getBranding();

  let logoUrl: string | null = null;
  if (branding.logoPath) {
    const { url } = await getBrandingLogoSignedUrl(branding.logoPath);
    logoUrl = url;
  }

  return (
    <LoginForm
      companyName={branding.companyName}
      tagline={branding.tagline}
      logoUrl={logoUrl}
    />
  );
}
