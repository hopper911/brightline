"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">(
    "idle"
  );
  const [message, setMessage] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    const nextParam = searchParams.get("next");
    const redirectTo =
      nextParam && nextParam.startsWith("/admin")
        ? nextParam
        : "/admin/portfolio";

    const res = await signIn("email", {
      email,
      callbackUrl: redirectTo,
      redirect: false,
    });

    if (res?.error) {
      setStatus("error");
      setMessage("Unable to send sign-in link.");
      return;
    }

    setStatus("success");
    setMessage("Check your email for the sign-in link.");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <p className="text-xs uppercase tracking-[0.35em] text-black/50">
        Admin Access
      </p>
      <h1 className="font-display mt-4 text-4xl text-black">Sign in</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="w-full rounded border border-black/20 bg-white/80 px-4 py-3 text-sm"
          required
        />
        <button
          type="submit"
          className="w-full rounded-full bg-black px-6 py-3 text-xs uppercase tracking-[0.32em] text-white"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Checking..." : "Continue"}
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
    </div>
  );
}
