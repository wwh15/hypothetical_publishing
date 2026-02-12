// src/hooks/useSeriesSearch.ts
import { SeriesListItem } from "@/lib/data/books";
import { useState, useMemo } from "react";

/** Pure filter: same logic the hook uses. Exported for tests. */
export function filterSeriesBySearch(
  series: SeriesListItem[],
  searchQuery: string
): SeriesListItem[] {
  if (!searchQuery.trim()) {
    return series;
  }
  const q = searchQuery.toLowerCase().trim();

  return series.filter((s) => {
    const nameMatch = s.name.toLowerCase().includes(q);
    const descriptionMatch = s.description?.toLowerCase().includes(q);
    return nameMatch || descriptionMatch;
  });
}

export function useSeriesSearch(series: SeriesListItem[]) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSeries = useMemo(
    () => filterSeriesBySearch(series, searchQuery),
    [series, searchQuery]
  );

  return {
    searchQuery,
    setSearchQuery,
    filteredSeries,
  };
}
