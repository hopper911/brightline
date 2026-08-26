"use client";

import { useState } from "react";

export default function AccountantReportsClient() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [title, setTitle] = useState("Ledger export");
  const [persist, setPersist] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setPending(true);
    try {
      const res = await fetch("/api/accountant/reports/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          from: from || undefined,
          to: to || undefined,
          persist,
        }),
      });
      if (persist) {
        const data = (await res.json()) as { ok?: boolean; documentId?: string; error?: string };
        if (!res.ok || !data.ok) {
          setMsg(data.error || "Could not persist report.");
          return;
        }
        setMsg(`Saved document ${data.documentId}. See Documents.`);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setMsg(data.error || "Export failed.");
        return;
      }
      const blob = await res.blob();
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = `brightline-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(u);
    } catch {
      setMsg("Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={run} className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="font-display text-xl text-white">Ledger report</h2>
      <p className="mt-1 text-sm text-white/55">
        Download a merged CSV or persist a copy to R2 (appears under Documents).
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-wider text-white/45">From (ISO date)</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="2026-01-01"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-white/45">To (ISO date)</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="2026-12-31"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs uppercase tracking-wider text-white/45">Title (when saving)</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-white/70 sm:col-span-2">
          <input type="checkbox" checked={persist} onChange={(e) => setPersist(e.target.checked)} />
          Save copy to secure storage (AccountingDocument)
        </label>
      </div>
      {msg ? <p className="mt-3 text-sm text-amber-100/90">{msg}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-50"
      >
        {pending ? "Working…" : persist ? "Save report" : "Download CSV"}
      </button>
    </form>
  );
}
