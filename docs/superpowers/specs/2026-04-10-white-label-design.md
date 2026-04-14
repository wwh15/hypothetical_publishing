# White Label Branding — Design Spec

## Overview

Add white-label support so the system can be rebranded with a custom company name, logo, tagline, and primary color. A new settings page at `/settings/branding` lets the user edit these values. Changes apply globally across the navbar, auth pages, PDF reports, and page title.

## Data Model

Singleton Prisma model — one row, upserted on save:

```prisma
model WhiteLabelConfig {
  id           Int      @id @default(1)
  companyName  String   @default("Hypothetical Publishing")
  tagline      String   @default("Book publishing & royalty management")
  logoPath     String?  // Supabase Storage path in "branding" bucket; null = text fallback
  primaryColor String   @default("#2563eb") // Hex color
  createdAt    DateTime @default(now()) @db.Timestamptz
  updatedAt    DateTime @updatedAt @db.Timestamptz

  @@map("white_label_config")
}
```

A `getBranding()` server function fetches the row or returns hardcoded defaults if no row exists. Called in the root layout and passed to consumers.

## Theming — CSS Custom Properties

The root layout injects CSS custom properties on `<html>` based on the primary color:

| Variable | Derivation |
|---|---|
| `--brand-primary` | The chosen hex color |
| `--brand-primary-hover` | HSL shift: -10% lightness |
| `--brand-primary-light` | Same hue, 90% lightness (for backgrounds/badges) |
| `--brand-primary-text` | White or black, auto-chosen for WCAG AA contrast |

Existing blue-600/700 Tailwind classes in themed components (navbar, auth pages, buttons, links) are replaced with `var(--brand-primary)` equivalents.

## Consumers — Where Branding Appears

| Location | File | Change |
|---|---|---|
| Navbar | `src/components/auth/Navbar.tsx` | Text becomes `branding.companyName`; if logo exists, show `<img>` instead of text. Primary color styles nav links. |
| Auth logo | `src/components/auth/AuthLogo.tsx` | Name + tagline from branding. Logo shown if set. |
| PDF reports | `src/app/(main)/reports/author-royalty/components/AuthorRoyaltyReportPDF.tsx` | Header text uses `branding.companyName`. |
| Setup page | `src/app/(auth)/setup/page.tsx` | "Hypothetical Publishing" replaced with `branding.companyName`. |
| Page title | `src/app/layout.tsx` | `<title>` uses `branding.companyName`. |

## Settings Page

**Route:** `/settings/branding` (inside `(main)` route group, gets the Navbar).

**Navigation:** "Settings" link added to the Navbar after "Reports".

**Form fields:**
1. Company Name — text input, max 100 chars
2. Tagline — text input, max 200 chars
3. Logo — drag-and-drop file upload with preview. Shows current logo if set, with a "Remove" option to revert to text.
4. Primary Color — color swatch + hex input. Live preview strip shows button, link, and badge in the chosen color.

**Actions:**
- "Save Changes" — calls `POST /api/branding`, then `revalidatePath('/')` to refresh layout
- "Reset to Defaults" — restores original hardcoded values (Hypothetical Publishing, default blue, etc.)

## API Route — `/api/branding`

### `GET /api/branding`
Returns current branding config (or defaults). Requires authentication.

### `POST /api/branding`
Updates branding. Requires authentication.

**Content types:**
- `multipart/form-data` when a logo file is included
- `application/json` for text-only updates (name, tagline, color)

**Text field validation:**
- `companyName`: required, trimmed, max 100 chars
- `tagline`: required, trimmed, max 200 chars
- `primaryColor`: required, must match `/^#[0-9a-fA-F]{6}$/`

## Security — File Upload

### Magic byte validation (primary check)
Read the first bytes of the uploaded file and verify the signature matches an allowed image type. Reject everything else regardless of extension or MIME header.

| Format | Magic bytes |
|---|---|
| PNG | `89 50 4E 47` |
| JPEG | `FF D8 FF` |
| WebP | `52 49 46 46 .. .. .. .. 57 45 42 50` |

### Additional upload security
- **Max file size:** 2MB enforced server-side (read stream, abort if exceeded; do not trust `Content-Length`)
- **Content-Type header:** checked against allowlist (`image/png`, `image/jpeg`, `image/webp`) as secondary validation; magic bytes are authoritative
- **No SVG:** SVGs can contain embedded JavaScript/XSS — only raster formats allowed
- **Filename sanitization:** generate deterministic filename server-side (`logo.<detected-extension>`); never use client-provided filename (prevents path traversal)
- **Dedicated Supabase bucket:** `branding` bucket with restrictive policy, separate from `Cover-Art`
- **Overwrite on re-upload:** since there is only ever one logo, new uploads replace the old file — no orphaned files

### Authentication
All endpoints require a valid Supabase session. Unauthenticated requests receive 401.

## Logo Storage

Uses Supabase Storage (same pattern as existing cover art):
- Bucket: `branding`
- Path: `logo.png` / `logo.jpg` / `logo.webp` (deterministic, based on detected format)
- Public URL fetched via Supabase client for display in navbar/auth pages
- `logoPath` in the DB stores the storage path; null means no logo (fall back to company name text)

## Defaults

When no `WhiteLabelConfig` row exists (fresh install), the system uses:
- Company name: "Hypothetical Publishing"
- Tagline: "Book publishing & royalty management"
- Logo: none (text fallback)
- Primary color: `#2563eb` (current blue)

These are hardcoded constants in the `getBranding()` function, not env vars.
