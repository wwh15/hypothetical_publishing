import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Local date + time for report download filenames (not UTC).
 * Example: 2026-04-12_17_30_45 with timeSeparator "_".
 */
export function formatLocalReportFilenameStamp(
  d: Date = new Date(),
  timeSeparator: "_" | "-" = "_"
): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const h = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  const s = String(d.getSeconds()).padStart(2, "0")
  const date = `${y}-${mo}-${day}`
  const time = [h, min, s].join(timeSeparator)
  return `${date}_${time}`
}
