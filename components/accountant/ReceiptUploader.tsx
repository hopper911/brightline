"use client";

import { useState } from "react";

export function ReceiptUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [expenseId, setExpenseId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setMsg(null);
    setPending(true);
    try {
      const init = await fetch("/api/accountant/receipts/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });
      const u = (await init.json()) as {
        ok?: boolean;
        error?: string;
        url?: string;
        key?: string;
        headers?: Record<string, string>;
      };
      if (!init.ok || !u.ok || !u.url || !u.key) {
        setMsg(u.error || "Could not start upload.");
        return;
      }

      const put = await fetch(u.url, {
        method: "PUT",
        headers: {
          "content-type": file.type || "application/octet-stream",
          ...u.headers,
        },
        body: file,
      });
      if (!put.ok) {
        setMsg("Upload to storage failed.");
        return;
      }

      const fin = await fetch("/api/accountant/receipts/finalize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: u.key,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          studioExpenseId: expenseId.trim() || null,
        }),
      });
      const f = (await fin.json()) as { ok?: boolean; error?: string };
      if (!fin.ok || !f.ok) {
        setMsg(f.error || "Finalize failed.");
        return;
      }
      setFile(null);
      setExpenseId("");
      window.location.reload();
    } catch {
      setMsg("Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="font-display text-xl text-white">Upload receipt</h2>
      <p className="mt-1 text-sm text-white/55">PDF or image, up to 15MB. Stored privately in R2.</p>
      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-white/45">File</label>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="mt-1 block w-full text-sm text-white/70"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-white/45">Link to expense id (optional)</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            value={expenseId}
            onChange={(e) => setExpenseId(e.target.value)}
            placeholder="Studio expense id"
          />
        </div>
      </div>
      {msg ? <p className="mt-3 text-sm text-red-300/90">{msg}</p> : null}
      <button
        type="submit"
        disabled={pending || !file}
        className="mt-4 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-50"
      >
        {pending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
