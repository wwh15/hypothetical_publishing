"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  saveBranding,
  resetBranding as resetBrandingInDb,
  sanitizeBrandingInput,
  updateLogoPath,
  BRANDING_DEFAULTS,
} from "@/lib/data/branding";
import {
  uploadBrandingLogo,
  deleteBrandingLogo,
  getBrandingLogoSignedUrl,
} from "@/lib/supabase/storage";

/** Update branding text fields + color. Logo handled separately via updateLogo. */
export async function updateBranding(formData: FormData): Promise<
  { success: true } | { success: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const companyName = formData.get("companyName") as string ?? "";
  const tagline = formData.get("tagline") as string ?? "";
  const primaryColor = formData.get("primaryColor") as string ?? "";

  try {
    const sanitized = sanitizeBrandingInput({ companyName, tagline, primaryColor });
    await saveBranding(sanitized);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Validation failed" };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/** Upload or replace the branding logo. Returns the new signed URL. */
export async function updateLogo(formData: FormData): Promise<
  { success: true; logoUrl: string } | { success: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const file = formData.get("logo") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false, error: "No file selected." };
  }

  const result = await uploadBrandingLogo(file);
  if ("error" in result) {
    return { success: false, error: result.error };
  }

  await updateLogoPath(result.path);

  // Return the new signed URL so the client can update without reloading
  const { url } = await getBrandingLogoSignedUrl(result.path);

  revalidatePath("/", "layout");
  return { success: true, logoUrl: url ?? "" };
}

/** Remove the branding logo (revert to text). */
export async function removeLogo(): Promise<
  { success: true } | { success: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { error } = await deleteBrandingLogo();
  if (error) return { success: false, error };

  await updateLogoPath(null);

  revalidatePath("/", "layout");
  return { success: true };
}

/** Reset all branding to defaults. */
export async function resetBranding(): Promise<
  { success: true } | { success: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  await deleteBrandingLogo();
  await resetBrandingInDb();

  revalidatePath("/", "layout");
  return { success: true };
}
