"use server";

import { createClient } from "./server";
import { supabaseAdmin } from "./admin";

/**
 * Server Actions for storage operations
 *
 * Bucket setup (do this in Supabase Dashboard):
 * 1. Create a bucket (e.g., "documents", "avatars")
 * 2. Set bucket policies for who can read/write
 */

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
