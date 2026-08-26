"use client";

import { useState } from "react";

type Props = { invoiceId: string; disabled?: boolean };

export function AccountingNoteComposer({ invoiceId, disabled }: Props) {
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setPending(true);
    try {
      const res = await fetch("/api/accountant/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, studioInvoiceId: invoiceId }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setMsg(data.error || "Could not save note.");
        return;
      }
      setBody("");
      window.location.reload();
    } catch {
      setMsg("Network error.");
    } finally {
      setPending(false);
    }
  }

  if (disabled) return null;

  return (
    <form onSubmit={submit} className="mt-4 space-y-2 rounded-xl border border-white/10 bg-black/20 p-4">
      <label className="block text-xs uppercase tracking-wider text-white/45" htmlFor="note-body">
        Add accounting note
      </label>
      <textarea
        id="note-body"
        className="min-h-[88px] w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-amber-200/40"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
      />
      {msg ? <p className="text-sm text-red-300/90">{msg}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs uppercase tracking-wider text-white hover:bg-white/15 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save note"}
      </button>
    </form>
  );
}
