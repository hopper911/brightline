"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginClient() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/accountant";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/accountant/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Sign-in failed.");
        return;
      }
      window.location.assign(next.startsWith("/") ? next : "/accountant");
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <p className="font-display text-xs uppercase tracking-[0.2em] text-amber-200/80">Finance</p>
        <h1 className="mt-2 font-display text-3xl text-white">Accountant portal</h1>
        <p className="mt-2 text-sm text-white/55">Sign in with credentials issued by the studio operator.</p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/45" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-200/40"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/45" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-200/40"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-red-300/90">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="btn w-full justify-center border border-white/20 bg-white/10 py-2.5 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
