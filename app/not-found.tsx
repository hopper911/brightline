import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">
        404 · Not Found
      </p>
      <h1 className="font-display mt-4 text-4xl text-white">
        This page slipped out of frame.
      </h1>
      <p className="mt-3 text-base text-white/70">
        The page you’re looking for doesn’t exist or has moved.
      </p>
      <Link href="/work" className="btn btn-solid mt-8">
        Back to work
      </Link>
    </div>
  );
}
