"use server";

import { createClient } from "./server";
import { supabaseAdmin } from "./admin";

/**
 * Server Actions for storage operations
 *
 * Bucket setup (do this in Supabase Dashboard):
 * 1. Create a bucket (e.g., "documents", "avatars")
 * 2. Set bucket policies for who can read/write
 *
 * Cover-Art bucket: Private bucket for book cover images. Authenticated users
 * upload via server createClient() (RLS applies). Signed URLs for display are
 * created with supabaseAdmin so any logged-in user can view covers.
 */
const COVER_ART_BUCKET = "Cover-Art";

const COVER_ART_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

const COVER_ART_MAX_BYTES = 5 * 1024 * 1024; // 5MB

/** Extension for cover art from MIME type (jpeg -> jpg). */
function coverArtExtFromMime(mime: string): string | null {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

/**
 * Detect cover art extension by checking magic bytes (file contents).
 * This is more reliable than trusting `file.type`, which the browser can spoof.
 */
function coverArtExtFromMagicBytes(head: Uint8Array): string | null {
  // JPEG: FF D8 FF
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return "jpg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    head.length >= 8 &&
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47 &&
    head[4] === 0x0d &&
    head[5] === 0x0a &&
    head[6] === 0x1a &&
    head[7] === 0x0a
  ) {
    return "png";
  }

  // GIF: "GIF87a" or "GIF89a"
  if (head.length >= 6) {
    const isGIF87a =
      head[0] === 0x47 && // G
      head[1] === 0x49 && // I
      head[2] === 0x46 && // F
      head[3] === 0x38 && // 8
      head[4] === 0x37 && // 7
      head[5] === 0x61; // a
    const isGIF89a =
      head[0] === 0x47 && // G
      head[1] === 0x49 && // I
      head[2] === 0x46 && // F
      head[3] === 0x38 && // 8
      head[4] === 0x39 && // 9
      head[5] === 0x61; // a
    if (isGIF87a || isGIF89a) return "gif";
  }

  // WebP: "RIFF....WEBP"
  if (head.length >= 12) {
    const isRIFF =
      head[0] === 0x52 && // R
      head[1] === 0x49 && // I
      head[2] === 0x46 && // F
      head[3] === 0x46; // F
    const isWEBP =
      head[8] === 0x57 && // W
      head[9] === 0x45 && // E
      head[10] === 0x42 && // B
      head[11] === 0x50; // P
    if (isRIFF && isWEBP) return "webp";
  }

  return null;
}

// Upload file from server (e.g., from form submission)
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    return { url: null, error: error.message };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return { url: publicUrl, error: null };
}

// Delete file
export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// Get signed URL for private files (temporary access)
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    return { url: null, error: error.message };
  }

  return { url: data.signedUrl, error: null };
}

// Admin: Upload on behalf of system (bypasses RLS)
export async function adminUploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    return { url: null, error: error.message };
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path);

  return { url: publicUrl, error: null };
}

// --- Cover-Art (private bucket) ---

/** Upload a cover image to Cover-Art bucket. Returns storage path (not URL). */
export async function uploadCoverArt(
  bookId: number,
  file: File
): Promise<{ path: string } | { error: string }> {
  if (file.size > COVER_ART_MAX_BYTES) {
    return { error: "File too large. Maximum size is 5MB." };
  }

  // Read the first bytes so we can verify the actual file contents.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const head = bytes.subarray(0, 12);

  const extFromMagic = coverArtExtFromMagicBytes(head);

  // Fallback to MIME if magic detection fails (e.g., if bytes are truncated for some reason).
  const mime = file.type;
  const extFromMime =
    mime &&
    COVER_ART_ALLOWED_TYPES.includes(mime as (typeof COVER_ART_ALLOWED_TYPES)[number])
      ? coverArtExtFromMime(mime)
      : null;

  const ext = extFromMagic ?? extFromMime;
  if (!ext) return { error: "Invalid image type. Use JPEG, PNG, GIF, or WebP." };

  const path = `${bookId}/cover.${ext}`;
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(COVER_ART_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    return { error: error.message };
  }

  return { path: data.path };
}

/** Create a signed URL for a cover art path (private bucket). Use supabaseAdmin so it works regardless of Storage RLS. */
type CoverArtTransformOptions = {
  width?: number;
  height?: number;
  resize?: "cover" | "contain" | "fill";
};

export async function getCoverArtSignedUrl(
  path: string,
  expiresIn: number = 360000,
  transform?: CoverArtTransformOptions
): Promise<{ url: string | null; error: string | null }> {
  const options = transform ? { transform } : undefined;
  const { data, error } = await supabaseAdmin.storage
    .from(COVER_ART_BUCKET)
    .createSignedUrl(path, expiresIn, options);

  if (error) {
    return { url: null, error: error.message };
  }

  return { url: data.signedUrl, error: null };
}

/** Remove a cover image from the Cover-Art bucket. */
export async function deleteCoverArt(
  path: string
): Promise<{ error: string | null }> {
  return deleteFile(COVER_ART_BUCKET, path);
}
