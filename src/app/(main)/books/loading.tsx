export default function BooksLoading() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <div className="h-9 w-32 bg-muted rounded animate-pulse" />
          <div className="h-5 w-48 bg-muted rounded animate-pulse mt-2" />
        </div>
        <div className="h-9 w-28 bg-muted rounded animate-pulse" />
      </div>
      {/* Search + table skeleton */}
      <div className="space-y-4">
        <div className="h-9 w-full max-w-sm bg-muted rounded animate-pulse" />
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="border-b border-border bg-muted/50 px-4 py-3 flex gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-4 flex-1 min-w-[60px] bg-muted rounded animate-pulse"
              />
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
            <div
              key={row}
              className="border-b border-border px-4 py-3 flex gap-4 items-center"
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-4 flex-1 min-w-[60px] bg-muted rounded animate-pulse"
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center">
          <div className="h-4 w-40 bg-muted rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
