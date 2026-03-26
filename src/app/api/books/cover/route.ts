import { NextResponse } from "next/server";
import { getCoverArtSignedUrl } from "@/lib/supabase/storage";
import { createClient } from "@/lib/supabase/server";

/** Valid storage path: bookId/cover.ext (jpeg, png, gif, webp) to avoid path traversal */
const COVER_PATH_REGEX = /^\d+\/cover\.(jpe?g|png|gif|webp)$/;
const COVER_SIZE_VALUES = new Set(["full", "thumb"] as const);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  const sizeParam = searchParams.get("size") ?? "full";
  const size = COVER_SIZE_VALUES.has(sizeParam as "full" | "thumb")
    ? (sizeParam as "full" | "thumb")
    : "full";

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

  const transform =
    size === "thumb"
      ? {
          width: 56,
          height: 80,
          resize: "cover" as const,
        }
      : undefined;

  const { url, error } = await getCoverArtSignedUrl(path, 3600, transform);
  if (error || !url) {
    return NextResponse.json({ error: error ?? "Not found" }, { status: 404 });
  }

  return NextResponse.redirect(url, 302);
}
