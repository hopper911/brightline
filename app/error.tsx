"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (error?.message) {
      console.error("[Error boundary]", error.message, error.digest ?? "");
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl text-white">Something went wrong</h1>
        <p className="mt-4 text-sm text-white/70">
          We encountered an error loading this page. Please try again.
        </p>
        {process.env.NODE_ENV === "development" && error?.message ? (
          <p className="mt-2 font-mono text-xs text-red-600">
            {error.message}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="btn btn-primary"
          >
            Try again
          </button>
          <Link href="/" className="btn btn-ghost">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
