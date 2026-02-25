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
export const COVER_ART_BUCKET = "Cover-Art";

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
  if (!COVER_ART_ALLOWED_TYPES.includes(file.type as (typeof COVER_ART_ALLOWED_TYPES)[number])) {
    return { error: "Invalid file type. Use JPEG, PNG, GIF, or WebP." };
  }
  if (file.size > COVER_ART_MAX_BYTES) {
    return { error: "File too large. Maximum size is 5MB." };
  }

  const ext = coverArtExtFromMime(file.type);
  if (!ext) {
    return { error: "Unsupported image type." };
  }

  const path = `${bookId}/cover.${ext}`;
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(COVER_ART_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    return { error: error.message };
  }

  return { path: data.path };
}

/** Create a signed URL for a cover art path (private bucket). Use supabaseAdmin so it works regardless of Storage RLS. */
export async function getCoverArtSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabaseAdmin.storage
    .from(COVER_ART_BUCKET)
    .createSignedUrl(path, expiresIn);

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
