import sharp from "sharp";

/** Max dimensions for list thumbnails (~2× typical 28×40 CSS cell, fit inside, no crop). */
const THUMB_MAX_WIDTH = 160;
const THUMB_MAX_HEIGHT = 240;

/**
 * Build a JPEG thumbnail buffer from raw image bytes (full cover).
 * Downscales only; entire image remains visible (fit inside).
 */
export async function generateCoverThumbJpeg(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .rotate()
    .resize(THUMB_MAX_WIDTH, THUMB_MAX_HEIGHT, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}
