export default function BookDetailLoading() {
  return (
    <div className="py-8 pb-16">
      <div className="mb-6 h-5 w-28 animate-pulse rounded bg-muted" />
      <header className="mb-10 border-b border-border/80 pb-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          <div className="mx-auto aspect-[2/3] w-full max-w-[260px] shrink-0 animate-pulse rounded-xl bg-muted lg:mx-0" />
          <div className="min-w-0 flex-1 space-y-6">
            <div className="space-y-3">
              <div className="h-10 max-w-xl animate-pulse rounded bg-muted sm:h-12" />
              <div className="h-6 w-48 animate-pulse rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
                <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 xl:grid-cols-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-card p-4 sm:p-5">
                  <div className="mb-2 h-3 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>
      <section className="mb-12">
        <div className="mb-5 h-6 w-56 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i}>
              <div className="mb-1 h-3 w-16 animate-pulse rounded bg-muted" />
              <div className="h-5 max-w-[180px] animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </section>
      <section className="border-t border-border/80 pt-10">
        <div className="mb-5 h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-lg bg-muted/60" />
      </section>
    </div>
  );
}
