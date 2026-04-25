"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminStudioLeadNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name")?.toString().trim(),
      email: fd.get("email")?.toString().trim(),
      phone: fd.get("phone")?.toString().trim() || null,
      company: fd.get("company")?.toString().trim() || null,
      inquirySource: fd.get("inquirySource")?.toString().trim() || null,
      serviceType: fd.get("serviceType")?.toString().trim() || null,
      budgetRange: fd.get("budgetRange")?.toString().trim() || null,
      timeline: fd.get("timeline")?.toString().trim() || null,
      message: fd.get("message")?.toString().trim() || null,
      notes: fd.get("notes")?.toString().trim() || null,
    };

    try {
      const res = await fetch("/api/admin/studio-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        lead?: { id: string };
      };
      if (!res.ok) {
        setError(data.error ?? "Failed to create lead.");
        return;
      }
      const id = data.lead?.id;
      router.push(id ? `/admin/studio-leads/${id}` : "/admin/studio-leads");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <Link
        href="/admin/studio-leads"
        className="text-xs uppercase tracking-[0.25em] text-white/50 hover:text-white/80"
      >
        ← Studio leads
      </Link>
      <p className="mt-6 text-xs uppercase tracking-[0.35em] text-white/50">
        Studio OS
      </p>
      <h1 className="mt-2 font-display text-4xl text-white">New lead</h1>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Name *
            </span>
            <input
              name="name"
              required
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Email *
            </span>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Company
            </span>
            <input
              name="company"
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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Source
            </span>
            <input
              name="inquirySource"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Service type
            </span>
            <input
              name="serviceType"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Budget range
            </span>
            <input
              name="budgetRange"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Timeline
            </span>
            <input
              name="timeline"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">
            Message
          </span>
          <textarea
            name="message"
            rows={5}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
          />
        </label>

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

        <button className="btn btn-primary" disabled={saving} type="submit">
          {saving ? "Creating…" : "Create lead"}
        </button>
      </form>
    </div>
  );
}

