"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConvertButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleConvert() {
    setPending(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/convert`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Convert failed");
      }
      const client = await res.json();
      router.push(`/studio/crm/clients/${client.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Convert failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleConvert}
      disabled={pending}
      className="rounded-studio-base border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-500/15 disabled:opacity-50"
    >
      {pending ? "Converting…" : "Convert to client"}
    </button>
  );
}
