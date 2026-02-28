// src/hooks/useSeriesSelection.ts
import { SeriesListItem } from "@/lib/data/books";
import { useState } from "react";

export function useSeriesSelection(
  series: SeriesListItem[],
  selectedSeriesId: number | null,
  onSeriesChange: (seriesId: number | null) => void
) {
  const [open, setOpen] = useState(false);

  const selectedSeries = series.find((s) => s.id === selectedSeriesId);
  const seriesDisplayValue = selectedSeries ? selectedSeries.name : "";

  const handleSeriesSelect = (seriesId: number | null) => {
    onSeriesChange(seriesId);
    setOpen(false);
  };

  return {
    open,
    setOpen,
    seriesDisplayValue,
    handleSeriesSelect,
  };
}
