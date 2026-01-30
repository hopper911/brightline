export default function PortfolioLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="h-10 w-48 animate-pulse rounded bg-white/10" />
      <div className="mt-3 h-6 max-w-xl animate-pulse rounded bg-white/10" />
      <div className="card-grid mt-10">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
          >
            <div className="h-[340px] w-full animate-pulse bg-white/10" />
            <div className="p-5">
              <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
              <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-white/10" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-10 w-24 animate-pulse rounded-full bg-white/10"
          />
        ))}
      </div>
    </div>
  );
}
