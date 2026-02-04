export default function AddBookLoading() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <div className="h-5 w-28 bg-muted rounded animate-pulse mb-2" />
        <div className="h-9 w-44 bg-muted rounded animate-pulse mb-2" />
        <div className="h-5 w-72 bg-muted rounded animate-pulse" />
      </div>
      {/* Form skeleton */}
      <div className="rounded-lg border border-border p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i}>
              <div className="h-4 w-24 bg-muted rounded animate-pulse mb-2" />
              <div className="h-9 w-full bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="flex gap-4 pt-4 border-t border-border">
          <div className="h-9 w-28 bg-muted rounded animate-pulse" />
          <div className="h-9 w-24 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
