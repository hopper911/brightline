"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type LeadDetail = {
  id: string;
  type: string;
  status: string;
  score: number;
  name?: string | null;
  email: string;
  phone?: string | null;
  company?: string | null;
  service?: string | null;
  budget?: string | null;
  message?: string | null;
  availabilityStart?: string | null;
  availabilityEnd?: string | null;
  location?: string | null;
  shootType?: string | null;
  source?: string | null;
  internalNotes?: string | null;
  contactedAt?: string | null;
  createdAt: string;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

export default function AdminLeadDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "saved">("idle");

  useEffect(() => {
    if (!id) return;
    let active = true;
    async function load() {
      const res = await fetch(`/api/admin/leads/${id}`);
      if (!res.ok || !active) return;
      const data = (await res.json()) as { lead: LeadDetail };
      setLead(data.lead);
      setNotes(data.lead.internalNotes || "");
    }
    load();
    return () => {
      active = false;
    };
  }, [id]);

  const dateRange = useMemo(() => {
    if (!lead) return "";
    if (!lead.availabilityStart && !lead.availabilityEnd) return "";
    return `${formatDate(lead.availabilityStart)} – ${formatDate(lead.availabilityEnd)}`;
  }, [lead]);

  async function handleSave(nextStatus?: "new" | "contacted") {
    if (!lead) return;
    setStatus("saving");
    const res = await fetch(`/api/admin/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        internalNotes: notes,
        status: nextStatus,
      }),
    });

    if (!res.ok) {
      setStatus("error");
      return;
    }

    const data = (await res.json()) as { lead: LeadDetail };
    setLead(data.lead);
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1200);
  }

  async function handleCopyEmail() {
    if (!lead) return;
    await navigator.clipboard.writeText(lead.email);
  }

  if (!lead) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-sm text-black/60">Loading lead...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-black/50">Lead detail</p>
          <h1 className="text-2xl font-semibold text-black">
            {lead.name || lead.email}
          </h1>
        </div>
        <Link href="/admin/leads" className="btn btn-ghost">
          Back to leads
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-black/70">{lead.email}</p>
            {lead.company ? <p className="text-xs text-black/50">{lead.company}</p> : null}
          </div>
          <div className="text-right text-xs uppercase tracking-[0.2em] text-black/50">
            <p>Status: {lead.status}</p>
            <p className="mt-1">Score: {lead.score}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-black/50">
          <span>Type: {lead.type}</span>
          {lead.service ? <span>Service: {lead.service}</span> : null}
          {lead.budget ? <span>Budget: {lead.budget}</span> : null}
          {lead.source ? <span>Source: {lead.source}</span> : null}
        </div>

        {lead.message ? (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.3em] text-black/50">Message</p>
            <p className="mt-2 text-sm text-black/70 whitespace-pre-wrap">{lead.message}</p>
          </div>
        ) : null}

        {lead.type === "availability" && (
          <div className="mt-4 rounded-2xl border border-black/10 bg-white/80 p-4 text-sm text-black/70">
            <p className="text-xs uppercase tracking-[0.3em] text-black/50">Availability details</p>
            <div className="mt-2 space-y-1">
              {dateRange ? <p>Date range: {dateRange}</p> : null}
              {lead.location ? <p>Location: {lead.location}</p> : null}
              {lead.shootType ? <p>Shoot type: {lead.shootType}</p> : null}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={handleCopyEmail} className="btn btn-ghost" type="button">
            Copy email
          </button>
          <button
            onClick={() => handleSave("contacted")}
            className="btn btn-solid"
            type="button"
          >
            Mark as contacted
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white/70 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-black/50">Internal notes</p>
        <textarea
          className="mt-3 w-full rounded border border-black/10 bg-white/90 px-3 py-2 text-sm"
          rows={6}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Add internal notes for this lead"
        />
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => handleSave()}
            className="btn btn-solid"
            type="button"
            disabled={status === "saving"}
          >
            {status === "saving" ? "Saving..." : "Save notes"}
          </button>
          {status === "saved" && (
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-600">Saved</span>
          )}
          {status === "error" && (
            <span className="text-xs uppercase tracking-[0.3em] text-red-600">Save failed</span>
          )}
        </div>
      </div>
    </div>
  );
}
