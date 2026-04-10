# White Label Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a white-label settings page that lets the user customize company name, tagline, logo, and primary color — applied globally across navbar, auth pages, PDFs, and page title.

**Architecture:** Singleton Prisma model stores branding config. A `getBranding()` server function (wrapped in React `cache()` for request deduplication) provides defaults when no row exists. CSS custom properties (`--brand-primary` and derived variants) are set on `<html>` via React style prop with type assertion. Logo uploaded to Supabase Storage with magic-byte validation (reusing existing `coverArtExtFromMagicBytes`, filtering out GIF). Settings page at `/settings/branding` with server action for persistence. Data layer includes `updateLogoPath()` to avoid fetch-then-save duplication in actions.

**Tech Stack:** Next.js 16, React 19, Prisma (PostgreSQL), Supabase Storage, Tailwind CSS, shadcn/ui

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/prisma/migrations/<timestamp>_add_white_label_config/migration.sql` | DB migration for `white_label_config` table |
| Modify | `src/prisma/schema.prisma` | Add `WhiteLabelConfig` model |
| Create | `src/lib/data/branding.ts` | `getBranding()`, `saveBranding()`, types, color derivation |
| Create | `src/lib/branding-colors.ts` | Pure color utility: hex→HSL, derive hover/light/text variants |
| Modify | `src/lib/supabase/storage.ts` | Add `uploadBrandingLogo()`, `deleteBrandingLogo()`, `getBrandingLogoSignedUrl()` |
| Create | `src/app/(main)/settings/branding/page.tsx` | Settings page (server component, fetches current branding) |
| Create | `src/app/(main)/settings/branding/BrandingForm.tsx` | Client component: form with inputs, upload, color picker |
| Create | `src/app/(main)/settings/branding/action.ts` | Server actions: `updateBranding()`, `removeLogo()`, `resetBranding()` |
| Modify | `src/app/layout.tsx` | Call `getBranding()`, set CSS vars on `<html>`, dynamic `<title>` |
| Modify | `src/components/auth/Navbar.tsx` | Use branding name/logo, apply `--brand-primary` for link colors |
| Modify | `src/components/auth/AuthLogo.tsx` | Use branding name/tagline/logo |
| Modify | `src/app/(auth)/setup/page.tsx` | Replace hardcoded "Hypothetical Publishing" |
| Modify | `src/app/(main)/reports/author-royalty/components/AuthorRoyaltyReportPDF.tsx` | Replace hardcoded company name in PDF header |
| Create | `src/lib/branding-colors.test.ts` | Tests for color derivation utilities |
| Create | `src/lib/data/branding.test.ts` | Tests for getBranding/saveBranding |
| Create | `src/app/(main)/settings/branding/action.test.ts` | Tests for server actions (validation) |

---

### Task 1: Prisma Model & Migration

**Files:**
- Modify: `src/prisma/schema.prisma`
- Create: migration via `prisma migrate dev`

- [ ] **Step 1: Add WhiteLabelConfig model to schema**

Add at the end of `src/prisma/schema.prisma`:

```prisma
model WhiteLabelConfig {
  id           Int      @id @default(1)
  companyName  String   @default("Hypothetical Publishing") @map("company_name")
  tagline      String   @default("Book publishing & royalty management")
  logoPath     String?  @map("logo_path")
  primaryColor String   @default("#2563eb") @map("primary_color")
  createdAt    DateTime @default(now()) @db.Timestamptz @map("created_at")
  updatedAt    DateTime @updatedAt @db.Timestamptz @map("updated_at")

  @@map("white_label_config")
}
```

- [ ] **Step 2: Generate migration**

Run: `npx prisma migrate dev --name add_white_label_config`
Expected: Migration created successfully, `prisma generate` runs automatically.

- [ ] **Step 3: Verify migration**

Run: `npx prisma migrate status`
Expected: All migrations applied, no pending.

- [ ] **Step 4: Commit**

```bash
git add src/prisma/schema.prisma src/prisma/migrations/
git commit -m "feat: add WhiteLabelConfig prisma model and migration"
```

---

### Task 2: Color Derivation Utilities

**Files:**
- Create: `src/lib/branding-colors.ts`
- Create: `src/lib/branding-colors.test.ts`

- [ ] **Step 1: Write failing tests for color utilities**

Create `src/lib/branding-colors.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  hexToHsl,
  hslToHex,
  deriveBrandColors,
} from "./branding-colors";

describe("hexToHsl", () => {
  it("converts pure blue #2563eb", () => {
    const hsl = hexToHsl("#2563eb");
    // Blue-600 ≈ hue 217, sat 89%, light 53%
    expect(hsl.h).toBeCloseTo(217, -1);
    expect(hsl.s).toBeGreaterThan(0.8);
    expect(hsl.l).toBeCloseTo(0.53, 1);
  });

  it("converts pure white #ffffff", () => {
    const hsl = hexToHsl("#ffffff");
    expect(hsl.l).toBeCloseTo(1, 2);
  });

  it("converts pure black #000000", () => {
    const hsl = hexToHsl("#000000");
    expect(hsl.l).toBeCloseTo(0, 2);
  });
});

describe("hslToHex", () => {
  it("round-trips through hexToHsl", () => {
    const original = "#2563eb";
    const hsl = hexToHsl(original);
    const result = hslToHex(hsl.h, hsl.s, hsl.l);
    expect(result.toLowerCase()).toBe(original.toLowerCase());
  });
});

describe("deriveBrandColors", () => {
  it("returns all four CSS variable values", () => {
    const colors = deriveBrandColors("#2563eb");
    expect(colors).toHaveProperty("--brand-primary", "#2563eb");
    expect(colors).toHaveProperty("--brand-primary-hover");
    expect(colors).toHaveProperty("--brand-primary-light");
    expect(colors).toHaveProperty("--brand-primary-text");
  });

  it("derives white text for dark primary", () => {
    const colors = deriveBrandColors("#1e3a5f"); // dark blue
    expect(colors["--brand-primary-text"]).toBe("#ffffff");
  });

  it("derives black text for light primary", () => {
    const colors = deriveBrandColors("#f0e68c"); // khaki/light yellow
    expect(colors["--brand-primary-text"]).toBe("#000000");
  });

  it("hover is darker than primary", () => {
    const colors = deriveBrandColors("#2563eb");
    const primaryL = hexToHsl(colors["--brand-primary"]).l;
    const hoverL = hexToHsl(colors["--brand-primary-hover"]).l;
    expect(hoverL).toBeLessThan(primaryL);
  });

  it("light variant has high lightness", () => {
    const colors = deriveBrandColors("#2563eb");
    const lightL = hexToHsl(colors["--brand-primary-light"]).l;
    expect(lightL).toBeGreaterThan(0.85);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/branding-colors.test.ts`
Expected: FAIL — module `./branding-colors` not found.

- [ ] **Step 3: Implement color utilities**

Create `src/lib/branding-colors.ts`:

```typescript
/**
 * Pure color utilities for brand theming.
 * Converts hex ↔ HSL and derives CSS custom property values from a primary color.
 */

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return { h: h * 360, s, l };
}

export function hslToHex(h: number, s: number, l: number): string {
  const hNorm = h / 360;

  const hue2rgb = (p: number, q: number, t: number): number => {
    let tNorm = t;
    if (tNorm < 0) tNorm += 1;
    if (tNorm > 1) tNorm -= 1;
    if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
    if (tNorm < 1 / 2) return q;
    if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
    return p;
  };

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }

  const toHex = (c: number) =>
    Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Relative luminance for WCAG contrast (simplified). */
function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const linearize = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export interface BrandColors {
  "--brand-primary": string;
  "--brand-primary-hover": string;
  "--brand-primary-light": string;
  "--brand-primary-text": string;
}

/**
 * Derive a full set of brand CSS variables from a single hex color.
 * - hover: 10% darker
 * - light: same hue at 92% lightness (for backgrounds/badges)
 * - text: white or black for WCAG AA contrast
 */
export function deriveBrandColors(primaryHex: string): BrandColors {
  const { h, s, l } = hexToHsl(primaryHex);

  const hoverL = Math.max(0, l - 0.1);
  const lightL = 0.92;

  const lum = relativeLuminance(primaryHex);
  // WCAG AA: contrast ratio ≥ 4.5:1
  // White text on dark bg, black text on light bg
  const textColor = lum > 0.179 ? "#000000" : "#ffffff";

  return {
    "--brand-primary": primaryHex.toLowerCase(),
    "--brand-primary-hover": hslToHex(h, s, hoverL),
    "--brand-primary-light": hslToHex(h, s * 0.3, lightL),
    "--brand-primary-text": textColor,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/branding-colors.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/branding-colors.ts src/lib/branding-colors.test.ts
git commit -m "feat: add color derivation utilities for brand theming"
```

---

### Task 3: Branding Data Layer

**Files:**
- Create: `src/lib/data/branding.ts`
- Create: `src/lib/data/branding.test.ts`

- [ ] **Step 1: Write failing tests for branding data layer**

Create `src/lib/data/branding.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  BRANDING_DEFAULTS,
  isValidHexColor,
  sanitizeBrandingInput,
} from "./branding";

describe("BRANDING_DEFAULTS", () => {
  it("has expected default values", () => {
    expect(BRANDING_DEFAULTS.companyName).toBe("Hypothetical Publishing");
    expect(BRANDING_DEFAULTS.tagline).toBe("Book publishing & royalty management");
    expect(BRANDING_DEFAULTS.logoPath).toBeNull();
    expect(BRANDING_DEFAULTS.primaryColor).toBe("#2563eb");
  });
});

describe("isValidHexColor", () => {
  it("accepts valid 6-digit hex", () => {
    expect(isValidHexColor("#2563eb")).toBe(true);
    expect(isValidHexColor("#FFFFFF")).toBe(true);
    expect(isValidHexColor("#000000")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidHexColor("2563eb")).toBe(false);   // no #
    expect(isValidHexColor("#fff")).toBe(false);      // 3-digit
    expect(isValidHexColor("#gggggg")).toBe(false);   // invalid chars
    expect(isValidHexColor("")).toBe(false);
    expect(isValidHexColor("#2563eb00")).toBe(false); // 8-digit (alpha)
  });
});

describe("sanitizeBrandingInput", () => {
  it("trims whitespace", () => {
    const result = sanitizeBrandingInput({
      companyName: "  My Company  ",
      tagline: "  tagline  ",
      primaryColor: "#2563eb",
    });
    expect(result.companyName).toBe("My Company");
    expect(result.tagline).toBe("tagline");
  });

  it("rejects company name over 100 chars", () => {
    expect(() =>
      sanitizeBrandingInput({
        companyName: "a".repeat(101),
        tagline: "ok",
        primaryColor: "#2563eb",
      })
    ).toThrow("Company name must be 100 characters or fewer");
  });

  it("rejects tagline over 200 chars", () => {
    expect(() =>
      sanitizeBrandingInput({
        companyName: "ok",
        tagline: "a".repeat(201),
        primaryColor: "#2563eb",
      })
    ).toThrow("Tagline must be 200 characters or fewer");
  });

  it("rejects empty company name", () => {
    expect(() =>
      sanitizeBrandingInput({
        companyName: "",
        tagline: "ok",
        primaryColor: "#2563eb",
      })
    ).toThrow("Company name is required");
  });

  it("rejects invalid hex color", () => {
    expect(() =>
      sanitizeBrandingInput({
        companyName: "ok",
        tagline: "ok",
        primaryColor: "not-a-color",
      })
    ).toThrow("Invalid color format");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/data/branding.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement branding data layer**

Create `src/lib/data/branding.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/data/branding.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/branding.ts src/lib/data/branding.test.ts
git commit -m "feat: add branding data layer with validation and DB persistence"
```

---

### Task 4: Branding Logo Storage

**Files:**
- Modify: `src/lib/supabase/storage.ts`

- [ ] **Step 1: Add branding logo functions to storage.ts**

Add below the existing cover-art section in `src/lib/supabase/storage.ts`:

```typescript
// --- Branding Logo (private bucket) ---

const BRANDING_BUCKET = "branding";

const BRANDING_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const BRANDING_MAX_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * Upload a branding logo. Validates magic bytes (not just MIME).
 * Deterministic path: "logo.<ext>" — upserts to replace any existing logo.
 * No SVG allowed (XSS risk).
 */
export async function uploadBrandingLogo(
  file: File
): Promise<{ path: string } | { error: string }> {
  if (file.size > BRANDING_MAX_BYTES) {
    return { error: "File too large. Maximum size is 2MB." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const head = bytes.subarray(0, 12);

  // Reuse existing magic byte detection (covers JPEG, PNG, GIF, WebP)
  const ext = coverArtExtFromMagicBytes(head);
  if (!ext || ext === "gif") {
    return { error: "Invalid image type. Use JPEG, PNG, or WebP. (No GIF or SVG.)" };
  }

  const path = `logo.${ext}`;
  const supabase = await createClient();

  // Delete any existing logo files first (they may have a different extension)
  await supabase.storage.from(BRANDING_BUCKET).remove(["logo.jpg", "logo.png", "logo.webp"]);

  const { data, error } = await supabase.storage
    .from(BRANDING_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    return { error: error.message };
  }

  return { path: data.path };
}

// NOTE: Export the existing `coverArtExtFromMagicBytes` function (currently private).
// Change `function coverArtExtFromMagicBytes` to `export function coverArtExtFromMagicBytes`
// so `uploadBrandingLogo` can reuse it. No duplicate magic byte code needed.

/** Signed URL for branding logo. */
export async function getBrandingLogoSignedUrl(
  path: string,
  expiresIn: number = 360000
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabaseAdmin.storage
    .from(BRANDING_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    return { url: null, error: error.message };
  }

  return { url: data.signedUrl, error: null };
}

/** Delete branding logo from storage. */
export async function deleteBrandingLogo(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(BRANDING_BUCKET)
    .remove(["logo.jpg", "logo.png", "logo.webp"]);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/storage.ts
git commit -m "feat: add branding logo upload/delete with magic byte validation"
```

---

### Task 5: Server Actions for Branding Settings

**Files:**
- Create: `src/app/(main)/settings/branding/action.ts`
- Create: `src/app/(main)/settings/branding/action.test.ts`

- [ ] **Step 1: Write failing tests for server action validation**

Create `src/app/(main)/settings/branding/action.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase auth
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

// Mock data layer
const mockSaveBranding = vi.fn();
const mockUpdateLogoPath = vi.fn();
const mockResetBranding = vi.fn();
vi.mock("@/lib/data/branding", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/branding")>();
  return {
    ...actual,
    saveBranding: (...args: unknown[]) => mockSaveBranding(...args),
    updateLogoPath: (...args: unknown[]) => mockUpdateLogoPath(...args),
    resetBranding: () => mockResetBranding(),
  };
});

// Mock storage
const mockUploadBrandingLogo = vi.fn();
const mockDeleteBrandingLogo = vi.fn();
vi.mock("@/lib/supabase/storage", () => ({
  uploadBrandingLogo: (...args: unknown[]) => mockUploadBrandingLogo(...args),
  deleteBrandingLogo: () => mockDeleteBrandingLogo(),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateBranding, updateLogo, removeLogo, resetBranding } from "./action";

describe("updateBranding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const fd = new FormData();
    fd.set("companyName", "Test");
    fd.set("tagline", "Tag");
    fd.set("primaryColor", "#ff0000");
    const result = await updateBranding(fd);
    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(mockSaveBranding).not.toHaveBeenCalled();
  });

  it("saves branding when authenticated with valid input", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "1" } } });
    mockSaveBranding.mockResolvedValue({
      companyName: "Test", tagline: "Tag", logoPath: null, primaryColor: "#ff0000",
    });
    const fd = new FormData();
    fd.set("companyName", "Test");
    fd.set("tagline", "Tag");
    fd.set("primaryColor", "#ff0000");
    const result = await updateBranding(fd);
    expect(result).toEqual({ success: true });
    expect(mockSaveBranding).toHaveBeenCalledWith({
      companyName: "Test", tagline: "Tag", primaryColor: "#ff0000",
    });
  });

  it("returns validation error for invalid color", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "1" } } });
    const fd = new FormData();
    fd.set("companyName", "Test");
    fd.set("tagline", "Tag");
    fd.set("primaryColor", "not-a-color");
    const result = await updateBranding(fd);
    expect(result.success).toBe(false);
    expect(mockSaveBranding).not.toHaveBeenCalled();
  });
});

describe("updateLogo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when no file provided", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "1" } } });
    const fd = new FormData();
    const result = await updateLogo(fd);
    expect(result).toEqual({ success: false, error: "No file selected." });
  });

  it("calls uploadBrandingLogo and updateLogoPath on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "1" } } });
    mockUploadBrandingLogo.mockResolvedValue({ path: "logo.png" });
    const fd = new FormData();
    fd.set("logo", new File(["data"], "logo.png", { type: "image/png" }));
    const result = await updateLogo(fd);
    expect(result).toEqual({ success: true });
    expect(mockUpdateLogoPath).toHaveBeenCalledWith("logo.png");
  });
});

describe("removeLogo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes logo and sets path to null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "1" } } });
    mockDeleteBrandingLogo.mockResolvedValue({ error: null });
    const result = await removeLogo();
    expect(result).toEqual({ success: true });
    expect(mockUpdateLogoPath).toHaveBeenCalledWith(null);
  });
});

describe("resetBranding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes logo and resets DB", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "1" } } });
    mockDeleteBrandingLogo.mockResolvedValue({ error: null });
    const result = await resetBranding();
    expect(result).toEqual({ success: true });
    expect(mockDeleteBrandingLogo).toHaveBeenCalled();
    expect(mockResetBranding).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail** (server actions not yet created)

Run: `npx vitest run src/app/(main)/settings/branding/action.test.ts`
Expected: FAIL — module `./action` not found.

- [ ] **Step 3: Implement server actions**

Create `src/app/(main)/settings/branding/action.ts`:

```typescript
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
} from "@/lib/supabase/storage";

/** Update branding text fields + color. Logo handled separately via updateLogo. */
export async function updateBranding(formData: FormData): Promise<
  { success: true } | { success: false; error: string }
> {
  // Auth check
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

/** Upload or replace the branding logo. */
export async function updateLogo(formData: FormData): Promise<
  { success: true } | { success: false; error: string }
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

  revalidatePath("/", "layout");
  return { success: true };
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
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(main)/settings/branding/action.ts src/app/(main)/settings/branding/action.test.ts
git commit -m "feat: add server actions for branding settings CRUD"
```

---

### Task 6: Settings Page (Server Component)

**Files:**
- Create: `src/app/(main)/settings/branding/page.tsx`

- [ ] **Step 1: Create the settings page server component**

Create `src/app/(main)/settings/branding/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify the file compiles** (form component not yet created — just check syntax)

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: Error about missing `BrandingForm` — that's fine, created in next task.

- [ ] **Step 3: Commit**

```bash
git add src/app/(main)/settings/branding/page.tsx
git commit -m "feat: add branding settings page server component"
```

---

### Task 7: Branding Form (Client Component)

**Files:**
- Create: `src/app/(main)/settings/branding/BrandingForm.tsx`

- [ ] **Step 1: Create the branding form client component**

Create `src/app/(main)/settings/branding/BrandingForm.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";
import { type Branding, BRANDING_DEFAULTS } from "@/lib/data/branding";
import { deriveBrandColors } from "@/lib/branding-colors";
import { updateBranding, updateLogo, removeLogo, resetBranding } from "./action";

interface BrandingFormProps {
  branding: Branding;
  logoUrl: string | null;
}

export default function BrandingForm({ branding, logoUrl }: BrandingFormProps) {
  const [companyName, setCompanyName] = useState(branding.companyName);
  const [tagline, setTagline] = useState(branding.tagline);
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor);
  const [currentLogoUrl, setCurrentLogoUrl] = useState(logoUrl);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewColors = deriveBrandColors(
    /^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : "#2563eb"
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.set("companyName", companyName);
    formData.set("tagline", tagline);
    formData.set("primaryColor", primaryColor);

    const result = await updateBranding(formData);
    if (!result.success) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  async function handleLogoUpload(file: File) {
    setLogoUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("logo", file);

    const result = await updateLogo(formData);
    if (!result.success) {
      setError(result.error);
    } else {
      // Refresh to get new signed URL
      window.location.reload();
    }
    setLogoUploading(false);
  }

  async function handleLogoRemove() {
    setLogoUploading(true);
    setError(null);

    const result = await removeLogo();
    if (!result.success) {
      setError(result.error);
    } else {
      setCurrentLogoUrl(null);
    }
    setLogoUploading(false);
  }

  async function handleReset() {
    if (!confirm("Reset all branding to defaults? This cannot be undone.")) return;

    setSaving(true);
    setError(null);

    const result = await resetBranding();
    if (!result.success) {
      setError(result.error);
    } else {
      setCompanyName(BRANDING_DEFAULTS.companyName);
      setTagline(BRANDING_DEFAULTS.tagline);
      setPrimaryColor(BRANDING_DEFAULTS.primaryColor);
      setCurrentLogoUrl(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleLogoUpload(file);
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Error banner */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-400">
          Branding updated successfully.
        </div>
      )}

      {/* Company Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Company Name
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          maxLength={100}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Appears in the navbar, login page, and PDF reports.
        </p>
      </div>

      {/* Tagline */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Tagline
        </label>
        <input
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={200}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Shown below the company name on the login page.
        </p>
      </div>

      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Logo
        </label>

        {currentLogoUrl ? (
          <div className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <img
              src={currentLogoUrl}
              alt="Current logo"
              className="h-12 max-w-[200px] object-contain"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={logoUploading}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleLogoRemove}
                disabled={logoUploading}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {logoUploading ? "Uploading..." : "Drop an image here or click to upload"}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              PNG, JPG, or WebP. Max 2MB.
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleLogoUpload(file);
            e.target.value = ""; // Reset so same file can be re-selected
          }}
        />

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Displayed in the navbar and login page. Falls back to company name if not set.
        </p>
      </div>

      {/* Primary Color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Primary Color
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : "#2563eb"}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="w-10 h-10 rounded-md border border-gray-200 dark:border-gray-600 cursor-pointer p-0.5"
          />
          <input
            type="text"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            maxLength={7}
            className="w-28 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Used for buttons, links, and active states. Hover and text colors are derived automatically.
        </p>

        {/* Live preview */}
        <div className="mt-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Preview
          </p>
          <div className="flex gap-2 items-center flex-wrap">
            <button
              type="button"
              style={{
                background: previewColors["--brand-primary"],
                color: previewColors["--brand-primary-text"],
              }}
              className="px-3 py-1.5 rounded-md text-xs font-medium"
            >
              Primary Button
            </button>
            <span
              style={{ color: previewColors["--brand-primary"] }}
              className="text-xs underline"
            >
              Link text
            </span>
            <span
              style={{
                background: previewColors["--brand-primary-light"],
                color: previewColors["--brand-primary"],
              }}
              className="px-2 py-0.5 rounded text-xs"
            >
              Badge
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="px-5 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No type errors (server actions + form component should resolve).

- [ ] **Step 3: Commit**

```bash
git add src/app/(main)/settings/branding/BrandingForm.tsx
git commit -m "feat: add branding form client component with live color preview"
```

---

### Task 8: Wire Branding into Root Layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update root layout to inject branding CSS variables and dynamic title**

Replace the contents of `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getBranding } from "@/lib/data/branding";
import { deriveBrandColors } from "@/lib/branding-colors";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: branding.companyName,
    description: branding.tagline,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getBranding();
  const brandColors = deriveBrandColors(branding.primaryColor);

  return (
    <html lang="en" style={brandColors as React.CSSProperties}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

**Note:** CSS custom properties work in React's `style` prop with a type assertion to `React.CSSProperties`. The `BrandColors` interface keys (`--brand-primary`, etc.) are valid CSS custom properties.

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: inject brand CSS variables and dynamic title in root layout"
```

---

### Task 9: Update Navbar with Branding

**Files:**
- Modify: `src/components/auth/Navbar.tsx`

- [ ] **Step 1: Update Navbar to use branding**

Replace contents of `src/components/auth/Navbar.tsx`:

```tsx
import Link from "next/link";
import { getUser } from "@/lib/supabase/auth";
import LogoutButton from "./LogoutButton";
import { getBranding } from "@/lib/data/branding";
import { getBrandingLogoSignedUrl } from "@/lib/supabase/storage";

export default async function Navbar() {
  const user = await getUser();
  const branding = await getBranding();

  let logoUrl: string | null = null;
  if (branding.logoPath) {
    const { url } = await getBrandingLogoSignedUrl(branding.logoPath);
    logoUrl = url;
  }

  return (
    <nav className="border-b bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 min-h-14 px-4 sm:px-6">
        <Link
          href="/"
          className="font-bold text-lg py-3 -ml-2 pl-2 pr-2 rounded-md focus:outline focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 shrink-0"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={branding.companyName}
              className="h-8 max-w-[200px] object-contain"
            />
          ) : (
            branding.companyName
          )}
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <nav className="flex items-center gap-4">
                <Link
                  href="/books"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-[var(--brand-primary)] transition-colors"
                >
                  Books
                </Link>
                <Link
                  href="/sales/records"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-[var(--brand-primary)] transition-colors"
                >
                  Sales
                </Link>
                <Link
                  href="/authors"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-[var(--brand-primary)] transition-colors"
                >
                  Authors
                </Link>
                <Link
                  href="/sales/payments"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-[var(--brand-primary)] transition-colors"
                >
                  Author Payments
                </Link>
                <Link
                  href="/reports"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-[var(--brand-primary)] transition-colors"
                >
                  Reports
                </Link>
                <Link
                  href="/settings/branding"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-[var(--brand-primary)] transition-colors"
                >
                  Settings
                </Link>
              </nav>
              <div className="group relative flex items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  {user.user_metadata?.username ?? user.email}
                </span>
                <div className="absolute right-0 top-full hidden group-hover:block bg-white dark:bg-gray-800 border rounded-md shadow-md py-1 z-10 whitespace-nowrap">
                  <Link
                    href="/change-password"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Change Password
                  </Link>
                </div>
              </div>
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1 text-sm bg-[var(--brand-primary)] text-[var(--brand-primary-text)] rounded-md hover:bg-[var(--brand-primary-hover)]"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/Navbar.tsx
git commit -m "feat: update navbar to use branding name/logo and brand colors"
```

---

### Task 10: Update AuthLogo with Branding

**Files:**
- Modify: `src/components/auth/AuthLogo.tsx`

- [ ] **Step 1: Update AuthLogo to use branding**

Replace contents of `src/components/auth/AuthLogo.tsx`:

```tsx
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
```

**Note:** `AuthLogo` becomes an async server component. Check that its parent components (login, change-password pages) support this — they already use it as `<AuthLogo />` in server components, so no changes needed.

- [ ] **Step 2: Commit**

```bash
git add src/components/auth/AuthLogo.tsx
git commit -m "feat: update AuthLogo to use branding name/logo/tagline"
```

---

### Task 11: Update Remaining Hardcoded References

**Files:**
- Modify: `src/app/(auth)/setup/page.tsx`
- Modify: `src/app/(main)/reports/author-royalty/components/AuthorRoyaltyReportPDF.tsx`

- [ ] **Step 1: Update setup page**

In `src/app/(auth)/setup/page.tsx`, find the line:
```
Create the admin account for Hypothetical Publishing
```

Replace it with a dynamic reference. Since this is a server component, add at the top:

```tsx
import { getBranding } from "@/lib/data/branding";
```

Inside the component function, add:

```tsx
const branding = await getBranding();
```

Then replace the hardcoded string with:
```tsx
{`Create the admin account for ${branding.companyName}`}
```

- [ ] **Step 2: Update PDF report**

In `src/app/(main)/reports/author-royalty/components/AuthorRoyaltyReportPDF.tsx`, the company name is used inside a `@react-pdf/renderer` `<Text>` element. This component receives props — the simplest approach is to pass the company name as a prop from the parent page.

In the PDF component, change the hardcoded `"Hypothetical Publishing"` (around line 297) to accept it as a prop:

Add to the component's props interface:
```typescript
companyName?: string;
```

Replace line 297:
```tsx
<Text style={styles.title}>{companyName ?? "Hypothetical Publishing"}</Text>
```

In the parent page that renders this PDF component, fetch branding and pass it:
```tsx
const branding = await getBranding();
// ...
<AuthorRoyaltyReportPDF ... companyName={branding.companyName} />
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(auth)/setup/page.tsx src/app/(main)/reports/author-royalty/components/AuthorRoyaltyReportPDF.tsx
git commit -m "feat: replace all hardcoded company name references with branding"
```

---

### Task 12: Create Supabase Branding Bucket

**Files:** None (Supabase Dashboard or migration)

- [ ] **Step 1: Document bucket creation**

The `branding` Supabase Storage bucket must be created before logo upload works. This follows the same pattern as `Cover-Art`.

Create via Supabase Dashboard:
1. Go to Storage > New Bucket
2. Name: `branding`
3. Public: No (private — use signed URLs)
4. File size limit: 2MB
5. Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

Alternatively, add to the seed script or a setup script if automated bucket creation is needed.

- [ ] **Step 2: Verify upload works end-to-end**

Run the dev server: `npm run dev`
Navigate to `/settings/branding`, upload a test image, verify it appears.

- [ ] **Step 3: Commit any setup script changes**

```bash
git add -A
git commit -m "docs: document branding bucket setup for Supabase Storage"
```

---

### Task 13: Integration Test — Full Flow

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All existing tests pass, new tests pass.

- [ ] **Step 2: Manual verification**

1. Navigate to `/settings/branding`
2. Change company name → verify navbar, login page, and page title update
3. Change tagline → verify login page updates
4. Upload a logo → verify navbar shows image, login page shows image
5. Remove logo → verify fallback to text
6. Change primary color → verify navbar links, login button use new color
7. Click "Reset to Defaults" → verify everything reverts
8. Generate an author royalty PDF → verify company name in header

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address integration test findings"
```

---

## Design Review Notes (from /plan-design-review)

### Issue 6 (resolved): Logo upload returns signed URL instead of page reload
- `updateLogo` server action returns `{ success: true, logoUrl: string }` with a fresh signed URL
- `BrandingForm` updates `currentLogoUrl` state client-side, no `window.location.reload()`
- Prevents loss of unsaved text field changes during logo upload

### Issue 7 (resolved): Use shadcn components
- Replace raw `<input>`, `<button>`, `<label>` in `BrandingForm.tsx` with shadcn `Input`, `Button`, `Label` from `@/components/ui/`
- Ensures visual consistency with the rest of the app

### Accessibility fixes
- Add `aria-label="Upload logo"` to the drag-and-drop upload area
- Add `aria-describedby` linking help text to the hidden file input
- Add `sr-only` text for the color preview strip (e.g., "Preview of selected brand color")

### Responsive fix
- Color picker row: add `flex-wrap` so the color swatch and hex input wrap on small screens

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR (PLAN) | 5 issues, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR (FULL) | score: 6/10 → 8/10, 4 decisions |

**VERDICT:** ENG + DESIGN CLEARED — ready to implement.
