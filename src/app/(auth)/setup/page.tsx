import { getBranding } from "@/lib/data/branding";
import SetupForm from "./SetupForm";

export default async function SetupPage() {
  const branding = await getBranding();

  return <SetupForm companyName={branding.companyName} />;
}
