import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#05060a] flex flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold text-white">
        Bright Line Studio OS
      </h1>
      <p className="text-white/60 text-center max-w-md">
        Mission control for your photography studio.
      </p>
      <Link
        href="/studio"
        className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
      >
        Open Studio
      </Link>
    </main>
  );
}
