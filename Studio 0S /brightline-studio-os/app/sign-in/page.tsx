import type { Metadata } from "next";
import Link from "next/link";

import { requestMagicLink } from "./actions";

export const metadata: Metadata = {
  title: "Sign in | Bright Line Studio OS",
  description: "Sign in to your Studio OS workspace",
};

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[#05060a] px-4 py-16 text-white">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="text-xs font-medium uppercase tracking-[0.1em] text-white/45 hover:text-white/70">
          ← Home
        </Link>
        <h1 className="mt-6 font-display text-3xl font-medium tracking-tight text-white/95">Sign in</h1>
        <p className="mt-2 text-sm text-white/55">We’ll email you a magic link. No password.</p>

        <form action={requestMagicLink} className="mt-8 space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-medium uppercase tracking-[0.1em] text-white/55">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="you@studio.com"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            Email me a sign-in link
          </button>
        </form>

        <p className="mt-6 text-xs text-white/40">
          By continuing, you agree to receive a sign-in email. If you don’t have an account yet, we’ll create a workspace
          for you automatically.
        </p>
      </div>
    </main>
  );
}

