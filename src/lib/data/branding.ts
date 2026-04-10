import { cache } from "react";
import { prisma } from "../prisma";

export interface Branding {
  companyName: string;
  tagline: string;
  logoPath: string | null;
  primaryColor: string;
}

export const BRANDING_DEFAULTS: Branding = {
  companyName: "Hypothetical Publishing",
  tagline: "Book publishing & royalty management",
  logoPath: null,
  primaryColor: "#2563eb",
};

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(color: string): boolean {
  return HEX_COLOR_REGEX.test(color);
}

export interface BrandingInput {
  companyName: string;
  tagline: string;
  primaryColor: string;
}

/** Validate and sanitize text inputs. Throws on invalid input. */
export function sanitizeBrandingInput(input: BrandingInput): BrandingInput {
  const companyName = input.companyName.trim();
  const tagline = input.tagline.trim();
  const primaryColor = input.primaryColor.trim();

  if (!companyName) throw new Error("Company name is required");
  if (companyName.length > 100) throw new Error("Company name must be 100 characters or fewer");
  if (tagline.length > 200) throw new Error("Tagline must be 200 characters or fewer");
  if (!isValidHexColor(primaryColor)) throw new Error("Invalid color format. Use #RRGGBB hex.");

  return { companyName, tagline, primaryColor };
}

/** Fetch branding from DB, falling back to defaults if no row exists.
 *  Wrapped in React cache() so multiple calls in one request share a single DB query.
 */
export const getBranding = cache(async (): Promise<Branding> => {
  const row = await prisma.whiteLabelConfig.findUnique({ where: { id: 1 } });
  if (!row) return { ...BRANDING_DEFAULTS };
  return {
    companyName: row.companyName,
    tagline: row.tagline,
    logoPath: row.logoPath,
    primaryColor: row.primaryColor,
  };
});

/** Upsert branding config (singleton row id=1). */
export async function saveBranding(
  input: BrandingInput & { logoPath?: string | null }
): Promise<Branding> {
  const sanitized = sanitizeBrandingInput(input);
  const data = {
    companyName: sanitized.companyName,
    tagline: sanitized.tagline,
    primaryColor: sanitized.primaryColor,
    ...(input.logoPath !== undefined ? { logoPath: input.logoPath } : {}),
  };

  const row = await prisma.whiteLabelConfig.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });

  return {
    companyName: row.companyName,
    tagline: row.tagline,
    logoPath: row.logoPath,
    primaryColor: row.primaryColor,
  };
}

/** Update only the logo path (used by upload/remove logo actions). */
export async function updateLogoPath(logoPath: string | null): Promise<void> {
  await prisma.whiteLabelConfig.upsert({
    where: { id: 1 },
    update: { logoPath },
    create: { id: 1, logoPath },
  });
}

/** Reset branding to defaults. Deletes the config row. */
export async function resetBranding(): Promise<void> {
  await prisma.whiteLabelConfig.deleteMany({ where: { id: 1 } });
}
