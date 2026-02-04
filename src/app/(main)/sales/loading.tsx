export default function SalesLoading() {
  return (
    <div className="container mx-auto py-10">
      <div className="h-9 w-64 bg-muted rounded animate-pulse mb-2" />
      <div className="h-5 w-96 bg-muted rounded animate-pulse mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg border border-border bg-card animate-pulse">
          <div className="h-6 w-40 bg-muted rounded mb-2" />
          <div className="h-4 w-full bg-muted rounded mt-2" />
          <div className="h-4 w-3/4 bg-muted rounded mt-1" />
        </div>
        <div className="p-6 rounded-lg border border-border bg-card animate-pulse">
          <div className="h-6 w-40 bg-muted rounded mb-2" />
          <div className="h-4 w-full bg-muted rounded mt-2" />
          <div className="h-4 w-3/4 bg-muted rounded mt-1" />
        </div>
      </div>
    </div>
  );
}
