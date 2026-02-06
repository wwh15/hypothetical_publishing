export default function AddSalesRecordLoading() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <div className="h-9 w-52 bg-muted rounded animate-pulse mb-2" />
        <div className="h-5 w-full max-w-md bg-muted rounded animate-pulse" />
      </div>
      {/* Bulk paste + form area skeleton */}
      <div className="space-y-6">
        <div className="rounded-lg border border-border p-4">
          <div className="h-4 w-32 bg-muted rounded animate-pulse mb-3" />
          <div className="h-24 w-full bg-muted rounded animate-pulse" />
        </div>
        <div className="rounded-lg border border-border p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i}>
              <div className="h-4 w-20 bg-muted rounded animate-pulse mb-2" />
              <div className="h-9 w-full bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="flex gap-4">
          <div className="h-9 w-24 bg-muted rounded animate-pulse" />
          <div className="h-9 w-28 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
