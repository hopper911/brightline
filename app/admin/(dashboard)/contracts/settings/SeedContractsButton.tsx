"use client";

import { useState } from "react";

export function SeedContractsButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/contracts/seed", { method: "POST" });
    const data = (await res.json()) as { ok?: boolean; error?: string; created?: number; skipped?: number };
    setBusy(false);
    if (!res.ok || !data.ok) {
      setMsg(data.error ?? "Failed");
      return;
    }
    setMsg(`Created ${data.created ?? 0}, skipped ${data.skipped ?? 0}.`);
  }

  return (
    <div className="space-y-2">
      <button type="button" className="btn btn-primary" disabled={busy} onClick={run}>
        {busy ? "Seeding…" : "Seed starter templates"}
      </button>
      {msg && <p className="text-white/70">{msg}</p>}
    </div>
  );
}
