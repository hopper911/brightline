"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ConvertedClient = { id: string; companyName: string };
type ConvertedProject = { id: string; title: string; slug: string };

export type StudioLeadRow = {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  inquirySource: string | null;
  serviceType: string | null;
  budgetRange: string | null;
  timeline: string | null;
  message: string | null;
  status: string;
  followUpDate: string | null;
  notes: string | null;
  convertedClientId: string | null;
  convertedProjectId: string | null;
  convertedClient: ConvertedClient | null;
  convertedProject: ConvertedProject | null;
  createdAt: string;
  updatedAt: string;
};

export default function StudioLeadDetail({ initialLead }: { initialLead: StudioLeadRow }) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(payload: Record<string, unknown>) {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/studio-leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; lead?: StudioLeadRow };
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
        return;
      }
      if (data.lead) {
        setLead(data.lead);
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const followUp = fd.get("followUpDate")?.toString().trim() || "";
    await patch({
      name: fd.get("name")?.toString().trim(),
      company: fd.get("company")?.toString().trim() || null,
      email: fd.get("email")?.toString().trim(),
      phone: fd.get("phone")?.toString().trim() || null,
      inquirySource: fd.get("inquirySource")?.toString().trim() || null,
      serviceType: fd.get("serviceType")?.toString().trim() || null,
      budgetRange: fd.get("budgetRange")?.toString().trim() || null,
      timeline: fd.get("timeline")?.toString().trim() || null,
      message: fd.get("message")?.toString().trim() || null,
      notes: fd.get("notes")?.toString().trim() || null,
      status: fd.get("status")?.toString(),
      followUpDate: followUp ? new Date(followUp).toISOString() : null,
    });
  }

  async function onConvert() {
    if (!confirm("Convert this lead into a Studio Client + Studio Project draft?")) return;
    setError(null);
    setConverting(true);
    try {
      const res = await fetch(`/api/admin/studio-leads/${lead.id}/convert`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        convertedClientId?: string;
        convertedProjectId?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Conversion failed.");
        return;
      }
      router.refresh();
      if (data.convertedProjectId) {
        router.push(`/admin/projects/${data.convertedProjectId}/edit`);
      } else if (data.convertedClientId) {
        router.push(`/admin/clients/${data.convertedClientId}`);
      }
    } catch {
      setError("Network error.");
    } finally {
      setConverting(false);
    }
  }

  const followUpDateInput = lead.followUpDate
    ? new Date(lead.followUpDate).toISOString().slice(0, 10)
    : "";

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
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl text-white">{lead.name}</h1>
        <button
          type="button"
          onClick={onConvert}
          disabled={converting || Boolean(lead.convertedProjectId)}
          className="btn btn-primary"
        >
          {lead.convertedProjectId ? "Converted" : converting ? "Converting…" : "Convert"}
        </button>
      </div>
      <p className="mt-1 text-xs text-white/40">
        Created {new Date(lead.createdAt).toLocaleString()}
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {lead.convertedClientId || lead.convertedProjectId ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">
            Conversion
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {lead.convertedClientId ? (
              <Link
                href={`/admin/clients/${lead.convertedClientId}`}
                className="text-white/80 underline"
              >
                View client
              </Link>
            ) : null}
            {lead.convertedProjectId ? (
              <Link
                href={`/admin/projects/${lead.convertedProjectId}`}
                className="text-white/80 underline"
              >
                View project
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Name
            </span>
            <input
              name="name"
              defaultValue={lead.name}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Status
            </span>
            <select
              name="status"
              defaultValue={lead.status}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            >
              <option value="NEW">NEW</option>
              <option value="REVIEWED">REVIEWED</option>
              <option value="QUALIFIED">QUALIFIED</option>
              <option value="FOLLOW_UP_NEEDED">FOLLOW_UP_NEEDED</option>
              <option value="PROPOSAL_PENDING">PROPOSAL_PENDING</option>
              <option value="WON">WON</option>
              <option value="LOST">LOST</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Email
            </span>
            <input
              name="email"
              type="email"
              defaultValue={lead.email}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Phone
            </span>
            <input
              name="phone"
              defaultValue={lead.phone ?? ""}
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
              defaultValue={lead.company ?? ""}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Follow up
            </span>
            <input
              name="followUpDate"
              type="date"
              defaultValue={followUpDateInput}
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
              defaultValue={lead.inquirySource ?? ""}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Service type
            </span>
            <input
              name="serviceType"
              defaultValue={lead.serviceType ?? ""}
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
              defaultValue={lead.budgetRange ?? ""}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Timeline
            </span>
            <input
              name="timeline"
              defaultValue={lead.timeline ?? ""}
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
            defaultValue={lead.message ?? ""}
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
            defaultValue={lead.notes ?? ""}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
          />
        </label>

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

