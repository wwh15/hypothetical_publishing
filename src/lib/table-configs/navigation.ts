/**
 * Simple navigation helpers
 *
 * Tables use `getRowHref` on `BaseDataTable` for real `<a href>` row links
 * (native new tab / middle-click / context menu); `onRowClick` is a fallback
 * when a custom handler is needed instead of URLs.
 */

/**
 * Create a navigation path for sales records
 * Used by default getRowHref implementations
 */
export function createSalesRecordPath(
  saleId: number,
  basePath: string = '/sales/records',
  params?: Record<string, string>
): string {
  const path = `${basePath}/${saleId}`;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    return `${path}?${searchParams.toString()}`;
  }
  return path;
}
