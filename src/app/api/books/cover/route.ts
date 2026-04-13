import { NextResponse } from "next/server";
import {
  coverThumbObjectExists,
  getCoverArtSignedUrl,
} from "@/lib/supabase/storage";
import {
  COVER_STORAGE_PATH_REGEX,
  COVER_THUMB_STORAGE_PATH_REGEX,
  getCoverThumbStoragePath,
} from "@/lib/supabase/coverPaths";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  const variant = searchParams.get("variant");
  const sizeParam = searchParams.get("size") ?? "full";

  if (!path) {
    return NextResponse.json({ error: "Invalid path" }, { status: 404 });
  }

  const isFullCover = COVER_STORAGE_PATH_REGEX.test(path);
  const isThumbPath = COVER_THUMB_STORAGE_PATH_REGEX.test(path);
  if (!isFullCover && !isThumbPath) {
    return NextResponse.json({ error: "Invalid path" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let pathToSign = path;

  if (isFullCover) {
    const listOrLegacyThumb =
      variant === "list" || sizeParam === "thumb";
    if (listOrLegacyThumb) {
      const bookId = path.split("/")[0] ?? "";
      const thumbExists = bookId ? await coverThumbObjectExists(bookId) : false;
      const thumbPath = getCoverThumbStoragePath(path);
      if (thumbExists && thumbPath) {
        pathToSign = thumbPath;
      }
    }
  }

  const { url, error } = await getCoverArtSignedUrl(pathToSign, 3600);
  if (error || !url) {
    return NextResponse.json({ error: error ?? "Not found" }, { status: 404 });
  }

  return NextResponse.redirect(url, 302);
}
