export default function SalesRecordDetailLoading() {
  return (
    <div className="py-8 pb-16">
      <div className="mb-6 h-5 w-40 animate-pulse rounded bg-muted" />
      <header className="mb-8 flex flex-col gap-4 border-b border-border/80 pb-6 sm:flex-row sm:justify-between">
        <div>
          <div className="h-8 w-40 animate-pulse rounded bg-muted sm:h-9" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
        </div>
      </header>
      <section className="mb-10">
        <div className="mb-4 h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="rounded-xl border border-border bg-card p-6 lg:col-span-5">
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-12 w-48 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="h-3 w-36 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-8 w-32 animate-pulse rounded bg-muted" />
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="h-3 w-36 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-8 w-28 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      </section>
      <section className="mb-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-muted/25 p-6">
          <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-4 flex gap-2">
            <div className="h-8 w-20 animate-pulse rounded-full bg-muted" />
            <div className="h-8 w-28 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="mt-6 space-y-2">
            <div className="h-10 animate-pulse rounded bg-muted/60" />
            <div className="h-10 animate-pulse rounded bg-muted/60" />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-muted/25 p-6">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="mt-4 flex gap-2">
            <div className="h-8 w-24 animate-pulse rounded-full bg-muted" />
            <div className="h-8 w-28 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      </section>
      <div className="mb-10 rounded-xl border border-border/80 bg-card/40 p-6">
        <div className="h-3 w-12 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-6 w-2/3 max-w-md animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-40 animate-pulse rounded bg-muted" />
      </div>
      <section className="border-t border-border/80 pt-8">
        <div className="mb-3 h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="h-12 max-w-xl animate-pulse rounded bg-muted/50" />
      </section>
    </div>
  );
}
