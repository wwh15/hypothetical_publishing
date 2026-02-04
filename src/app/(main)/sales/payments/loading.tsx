export default function AuthorPaymentsLoading() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 space-y-6">
        <div className="flex flex-col gap-3">
          <div className="h-8 w-24 bg-muted rounded animate-pulse" />
          <div className="h-8 w-36 bg-muted rounded animate-pulse" />
        </div>
        <div>
          <div className="h-9 w-44 bg-muted rounded animate-pulse" />
          <div className="h-5 w-64 bg-muted rounded animate-pulse mt-2" />
        </div>
      </div>
      {/* Table / grouped content skeleton */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="border-b border-border bg-muted/50 px-4 py-3 flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 flex-1 min-w-[80px] bg-muted rounded animate-pulse" />
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
          <div
            key={row}
            className="border-b border-border px-4 py-3 flex gap-4 items-center"
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-4 flex-1 min-w-[80px] bg-muted rounded animate-pulse"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
