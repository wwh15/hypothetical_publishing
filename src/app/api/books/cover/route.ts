import { NextResponse } from "next/server";
import { getCoverArtSignedUrl } from "@/lib/supabase/storage";
import { createClient } from "@/lib/supabase/server";

/** Valid storage path: bookId/cover.ext (jpeg, png, gif, webp) to avoid path traversal */
const COVER_PATH_REGEX = /^\d+\/cover\.(jpe?g|png|gif|webp)$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path || !COVER_PATH_REGEX.test(path)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url, error } = await getCoverArtSignedUrl(path, 3600);
  if (error || !url) {
    return NextResponse.json({ error: error ?? "Not found" }, { status: 404 });
  }

  return NextResponse.redirect(url, 302);
}
