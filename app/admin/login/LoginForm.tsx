"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

type LoginFormProps = {
  className?: string;
};

export default function LoginForm({ className = "" }: LoginFormProps) {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Invalid code.");
      }

      window.location.href = next;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-4 ${className}`}
      aria-describedby={error ? "login-error" : undefined}
    >
      <label className="block text-xs uppercase tracking-widest text-white/70" htmlFor="code">
        Access code
      </label>
      <input
        id="code"
        name="code"
        type="password"
        autoComplete="one-time-code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter access code"
        required
        disabled={status === "submitting"}
        className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-60"
        aria-invalid={status === "error"}
        aria-describedby={error ? "login-error" : undefined}
      />
      {error && (
        <p id="login-error" className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="btn btn-primary w-full disabled:opacity-60"
      >
        {status === "submitting" ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
