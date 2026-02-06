/**
 * Simple navigation helpers
 * 
 * Pages control navigation via getRowHref or onRowClick props.
 * These helpers are just convenience functions for common patterns.
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
