export default function AboutLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div>
        <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
        <div className="mt-3 h-12 w-full max-w-md animate-pulse rounded bg-white/10" />
        <div className="mt-6 h-5 w-full max-w-2xl animate-pulse rounded bg-white/10" />
        <div className="mt-2 h-5 w-full max-w-xl animate-pulse rounded bg-white/10" />
      </div>

      <div className="mt-16">
        <div className="h-8 w-64 animate-pulse rounded bg-white/10" />
        <div className="mt-4 h-5 w-full max-w-2xl animate-pulse rounded bg-white/10" />
        <div className="mt-2 h-5 w-4/5 max-w-xl animate-pulse rounded bg-white/10" />
        <div className="mt-8 flex flex-wrap gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 w-36 animate-pulse rounded-full bg-white/10"
            />
          ))}
        </div>
      </div>

      <div className="mt-20 rounded-[28px] border border-black/10 bg-black px-8 py-12">
        <div className="h-4 w-32 animate-pulse rounded bg-white/20" />
        <div className="mt-3 h-8 w-72 animate-pulse rounded bg-white/20" />
        <div className="mt-4 h-5 w-full max-w-xl animate-pulse rounded bg-white/20" />
        <div className="mt-8 flex flex-wrap gap-3">
          <div className="h-11 w-36 animate-pulse rounded-full bg-white/20" />
          <div className="h-11 w-32 animate-pulse rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}
