export interface SortColumn {
  field: string;
  direction: "asc" | "desc";
}

export const DEFAULT_BOOK_SORT: SortColumn[] = [
  { field: "author", direction: "asc" },
  { field: "series", direction: "asc" },
  { field: "title", direction: "asc" },
];

/** Parse "author:asc,title:desc" into SortColumn[] */
export function parseSortParam(sort: string): SortColumn[] {
  if (!sort.trim()) return [];
  return sort
    .split(",")
    .map((part) => {
      const [field, dir] = part.split(":");
      if (!field) return null;
      const direction = dir === "desc" ? "desc" : "asc";
      return { field, direction } as SortColumn;
    })
    .filter((x): x is SortColumn => x !== null);
}

/** Serialize SortColumn[] into "author:asc,title:desc" */
export function serializeSortParam(sorts: SortColumn[]): string {
  return sorts.map((s) => `${s.field}:${s.direction}`).join(",");
}
