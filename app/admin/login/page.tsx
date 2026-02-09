"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const nextParam = searchParams.get("next");
    const redirectTo =
      nextParam && nextParam.startsWith("/admin")
        ? nextParam
        : "/admin";

    const res = await signIn("credentials", {
      code,
      callbackUrl: redirectTo,
      redirect: false,
    });

    if (res?.error) {
      setStatus("error");
      setMessage("Invalid access code.");
      return;
    }

    if (res?.url) {
      window.location.href = res.url;
      return;
    }

    setStatus("error");
    setMessage("Sign-in failed. Check NEXTAUTH_SECRET.");
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <input
        type="password"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Access code"
        className="w-full rounded border border-black/20 bg-white/80 px-4 py-3 text-sm"
        required
      />
      <button
        type="submit"
        className="w-full rounded-full bg-black px-6 py-3 text-xs uppercase tracking-[0.32em] text-white"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Checking..." : "Sign in"}
      </button>
      {message ? (
        <p
          className={`text-xs uppercase tracking-[0.3em] ${
            status === "error" ? "text-red-500" : "text-black/60"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <p className="text-xs uppercase tracking-[0.35em] text-black/50">
        Admin Access
      </p>
      <h1 className="font-display mt-4 text-4xl text-black">Sign in</h1>
      <Suspense fallback={<div className="mt-8 h-24 animate-pulse rounded bg-white/10" />}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
