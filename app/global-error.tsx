"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-white antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-6">
          <div className="max-w-md text-center">
            <h1 className="font-display text-2xl text-black">Something went wrong</h1>
            <p className="mt-4 text-sm text-black/70">
              We encountered an error. Please try again or return home.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-black/80"
              >
                Try again
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full reload needed to recover from global error */}
              <a
                href="/"
                className="rounded-lg border border-black/20 px-4 py-2 text-sm text-black hover:bg-black/5"
              >
                Go home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
