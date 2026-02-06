export default function BookDetailLoading() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <div className="h-5 w-28 bg-muted rounded animate-pulse mb-2" />
        <div className="h-9 w-64 bg-muted rounded animate-pulse mb-2" />
        <div className="h-5 w-24 bg-muted rounded animate-pulse" />
      </div>
      <div className="rounded-lg border border-border bg-card p-6 space-y-6">
        {/* Basic Information */}
        <section>
          <div className="h-6 w-40 bg-muted rounded animate-pulse mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i}>
                <div className="h-4 w-20 bg-muted rounded animate-pulse mb-1" />
                <div className="h-6 w-full max-w-[200px] bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </section>
        {/* Sales Totals */}
        <section>
          <div className="h-6 w-32 bg-muted rounded animate-pulse mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-muted/50 p-4 rounded-lg animate-pulse"
              >
                <div className="h-4 w-28 bg-muted rounded mb-2" />
                <div className="h-8 w-24 bg-muted rounded" />
              </div>
            ))}
            <div className="bg-muted/50 p-4 rounded-lg md:col-span-2 animate-pulse">
              <div className="h-4 w-36 bg-muted rounded mb-2" />
              <div className="h-8 w-28 bg-muted rounded" />
            </div>
          </div>
        </section>
        {/* Action buttons */}
        <section className="pt-4 border-t border-border">
          <div className="flex gap-4">
            <div className="h-9 w-24 bg-muted rounded animate-pulse" />
            <div className="h-9 w-28 bg-muted rounded animate-pulse" />
          </div>
        </section>
      </div>
    </div>
  );
}
