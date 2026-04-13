/** Full-resolution cover object in Cover-Art bucket: `{bookId}/cover.{ext}` */
export const COVER_STORAGE_PATH_REGEX = /^\d+\/cover\.(jpe?g|png|gif|webp)$/;

/** Pre-generated list thumbnail (JPEG only): `{bookId}/cover_thumb.jpg` */
export const COVER_THUMB_STORAGE_PATH_REGEX = /^\d+\/cover_thumb\.jpg$/;

export function isFullCoverStoragePath(path: string): boolean {
  return COVER_STORAGE_PATH_REGEX.test(path);
}

export function isCoverThumbStoragePath(path: string): boolean {
  return COVER_THUMB_STORAGE_PATH_REGEX.test(path);
}

/**
 * Given a full cover path, returns the deterministic thumb path, or null if invalid.
 */
export function getCoverThumbStoragePath(coverArtPath: string): string | null {
  const m = coverArtPath.match(/^(\d+)\/cover\.(jpe?g|png|gif|webp)$/);
  if (!m) return null;
  return `${m[1]}/cover_thumb.jpg`;
}
