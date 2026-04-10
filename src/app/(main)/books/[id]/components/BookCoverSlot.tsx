"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookCoverSlotProps {
  title: string;
  coverArtPath: string | null | undefined;
  className?: string;
}

/**
 * Cover image with standard book aspect ratio, or a dashed “frame” when there is
 * no file or the image fails to load (common in local dev without assets).
 */
export function BookCoverSlot({
  title,
  coverArtPath,
  className,
}: BookCoverSlotProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  const path = coverArtPath?.trim() ?? "";
  const showImage = Boolean(path) && !loadFailed;
  const src = showImage ? `/api/books/cover?path=${encodeURIComponent(path)}` : null;

  if (!src) {
    return (
      <div
        className={cn(
          "flex aspect-[2/3] w-full max-w-[260px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/35 bg-muted/25 px-5 text-center text-muted-foreground shadow-inner",
          className
        )}
        aria-label="Cover art placeholder"
      >
        <div className="rounded-lg border border-dashed border-muted-foreground/25 p-4">
          <ImageIcon className="mx-auto h-12 w-12 opacity-45" strokeWidth={1.15} />
        </div>
        <div className="space-y-1 px-1">
          <p className="text-sm font-semibold text-foreground/85">Cover art</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {loadFailed
              ? "Cover file is missing or could not be loaded."
              : "No cover on file yet. Add one from Edit book."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Cover for ${title}`}
      onError={() => setLoadFailed(true)}
      className={cn(
        "aspect-[2/3] h-auto w-full max-w-[260px] rounded-xl object-cover shadow-md ring-1 ring-black/8 dark:ring-white/10",
        className
      )}
    />
  );
}
