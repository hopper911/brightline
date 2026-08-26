"use client";

import { useState } from "react";

export function ExpenseCreateForm() {
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [vendor, setVendor] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setPending(true);
    try {
      const res = await fetch("/api/accountant/expenses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category,
          amount,
          title: title || undefined,
          vendor: vendor || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setMsg(data.error || "Could not create expense.");
        return;
      }
      window.location.reload();
    } catch {
      setMsg("Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="font-display text-xl text-white">New expense</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs uppercase tracking-wider text-white/45">Category</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-white/45">Amount (USD)</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-white/45">Vendor</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs uppercase tracking-wider text-white/45">Title</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </div>
      {msg ? <p className="mt-3 text-sm text-red-300/90">{msg}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Create expense"}
      </button>
    </form>
  );
}
