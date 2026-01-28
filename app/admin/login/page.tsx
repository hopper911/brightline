"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">(
    "idle"
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!res.ok) {
      setStatus("error");
      return;
    }

    setStatus("success");
    window.location.href = "/admin/portfolio";
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <p className="text-xs uppercase tracking-[0.35em] text-black/50">
        Admin Access
      </p>
      <h1 className="font-display mt-4 text-4xl text-black">Sign in</h1>
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
          {status === "loading" ? "Checking..." : "Continue"}
        </button>
        {status === "error" && (
          <p className="text-xs uppercase tracking-[0.3em] text-red-500">
            Invalid code
          </p>
        )}
      </form>
    </div>
  );
}
