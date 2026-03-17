import Link from "next/link";

export default function LoungePage() {
  return (
    <div className="min-h-screen bg-[#05060a] p-8 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/studio"
          className="text-sm text-white/60 hover:text-white"
        >
          ← Studio
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Client Lounge</h1>
        <p className="mt-2 text-white/60">Client experience.</p>
      </div>
    </div>
  );
}
