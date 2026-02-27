export default function ReportsLoading() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="mb-8">
        <div className="h-9 w-24 bg-muted rounded animate-pulse" />
        <div className="h-5 w-72 max-w-full bg-muted rounded animate-pulse mt-2" />
      </div>
      <ul className="space-y-3">
        {[1, 2, 3].map((i) => (
          <li key={i} className="flex items-baseline gap-2">
            <div className="h-5 w-48 bg-muted rounded animate-pulse shrink-0" />
            <div className="h-4 flex-1 max-w-md bg-muted/70 rounded animate-pulse" />
          </li>
        ))}
      </ul>
    </div>
  );
}
