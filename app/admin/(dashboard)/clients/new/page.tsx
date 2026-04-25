"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function AdminClientNewPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      companyName: fd.get("companyName")?.toString().trim(),
      primaryContactName: fd.get("primaryContactName")?.toString().trim() || null,
      email: fd.get("email")?.toString().trim() || null,
      phone: fd.get("phone")?.toString().trim() || null,
      website: fd.get("website")?.toString().trim() || null,
      industry: fd.get("industry")?.toString().trim() || null,
      addressLine1: fd.get("addressLine1")?.toString().trim() || null,
      addressLine2: fd.get("addressLine2")?.toString().trim() || null,
      city: fd.get("city")?.toString().trim() || null,
      state: fd.get("state")?.toString().trim() || null,
      postalCode: fd.get("postalCode")?.toString().trim() || null,
      country: fd.get("country")?.toString().trim() || null,
      notes: fd.get("notes")?.toString().trim() || null,
      isActive: fd.get("isActive") === "on",
    };

    try {
      const res = await fetch("/api/admin/studio-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; client?: { id: string } };
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
        return;
      }
      if (data.client?.id) {
        router.push(`/admin/clients/${data.client.id}`);
        router.refresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Link
        href="/admin/clients"
        className="text-xs uppercase tracking-[0.25em] text-white/50 hover:text-white/80"
      >
        ← Clients
      </Link>
      <p className="mt-6 text-xs uppercase tracking-[0.35em] text-white/50">
        Studio OS
      </p>
      <h1 className="font-display text-4xl text-white">New client</h1>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6"
      >
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">
            Company name *
          </span>
          <input
            name="companyName"
            required
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">
            Primary contact
          </span>
          <input
            name="primaryContactName"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Email
            </span>
            <input
              name="email"
              type="email"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Phone
            </span>
            <input
              name="phone"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">
            Website
          </span>
          <input
            name="website"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">
            Industry
          </span>
          <input
            name="industry"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">
            Address line 1
          </span>
          <input
            name="addressLine1"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">
            Address line 2
          </span>
          <input
            name="addressLine2"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              City
            </span>
            <input
              name="city"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              State
            </span>
            <input
              name="state"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Postal code
            </span>
            <input
              name="postalCode"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Country
            </span>
            <input
              name="country"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">
            Notes
          </span>
          <textarea
            name="notes"
            rows={4}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input name="isActive" type="checkbox" defaultChecked className="rounded border-white/20" />
          Active
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Create client"}
        </button>
      </form>
    </div>
  );
}
