"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormTemplateType } from "@prisma/client";

const TYPES = Object.values(FormTemplateType);

export default function NewFormTemplatePageClient() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<FormTemplateType>(FormTemplateType.OTHER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/forms/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, type }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; template?: { id: string } };
    setBusy(false);
    if (!res.ok || !data.ok || !data.template?.id) {
      setError(data.error ?? "Failed");
      return;
    }
    router.push(`/admin/contracts/forms/${data.template.id}`);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-white">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">
        <Link href="/admin/contracts/forms" className="hover:text-white">
          Forms
        </Link>{" "}
        / New
      </p>
      <h1 className="mt-2 font-display text-3xl">New form template</h1>
      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      <label className="mt-8 block space-y-2 text-sm">
        <span className="text-white/60">Title</span>
        <input
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="mt-4 block space-y-2 text-sm">
        <span className="text-white/60">Type</span>
        <select
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2"
          value={type}
          onChange={(e) => setType(e.target.value as FormTemplateType)}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="btn btn-primary mt-6" disabled={busy || !title.trim()} onClick={create}>
        Create
      </button>
    </div>
  );
}
