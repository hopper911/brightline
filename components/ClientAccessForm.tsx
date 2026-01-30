"use client";

import { useState } from "react";

export default function ClientAccessForm() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/client/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        token?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.token) {
        throw new Error(data.error || "Invalid code.");
      }

      window.location.href = `/client/${data.token}`;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Invalid code.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 flex w-full max-w-md flex-col gap-3"
    >
      <input
        className="w-full rounded-full border border-black/20 bg-white/70 px-6 py-3 text-sm text-black/80"
        placeholder="Access code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button
        className="btn btn-primary"
        type="submit"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Checking..." : "Enter gallery"}
      </button>
      {status === "error" && (
        <p className="text-xs uppercase tracking-[0.3em] text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
