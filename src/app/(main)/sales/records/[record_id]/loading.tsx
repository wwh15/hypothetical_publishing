export default function SalesRecordDetailLoading() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <div className="h-5 w-40 bg-muted rounded animate-pulse mb-2" />
        <div className="h-9 w-56 bg-muted rounded animate-pulse" />
      </div>
      {/* Card with field grid */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i}>
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-6 w-full max-w-[200px] bg-muted rounded animate-pulse mt-1" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-4 px-6 py-6 border-t border-border">
          <div className="h-9 w-28 bg-muted rounded animate-pulse" />
          <div className="h-9 w-32 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
