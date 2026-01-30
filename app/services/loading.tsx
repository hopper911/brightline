export default function ServicesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="space-y-4">
        <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
        <div className="h-12 w-full max-w-xl animate-pulse rounded bg-white/10" />
        <div className="h-5 w-full max-w-2xl animate-pulse rounded bg-white/10" />
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[28px] border border-white/10 bg-white/5 p-6"
          >
            <div className="h-6 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-4 w-5/6 animate-pulse rounded bg-white/10" />
            <div className="mt-6 h-4 w-24 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-[32px] border border-white/10 bg-black px-8 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="h-4 w-28 animate-pulse rounded bg-white/20" />
            <div className="h-8 w-64 animate-pulse rounded bg-white/20" />
          </div>
          <div className="h-11 w-36 animate-pulse rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}
