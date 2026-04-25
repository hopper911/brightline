"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Lead = {
  id: string;
  type?: string | null;
  status?: string | null;
  score?: number | null;
  name?: string | null;
  email: string;
  phone?: string | null;
  company?: string | null;
  service?: string | null;
  budget?: string | null;
  message?: string | null;
  source?: string | null;
  internalNotes?: string | null;
  createdAt: string;
};

export default function AdminLeadDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [lead, setLead] = useState<Lead | null | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let active = true;
    async function load() {
      setError("");
      const res = await fetch(`/api/admin/leads/${id}`, { credentials: "include" });
      const data = (await res.json()) as { ok?: boolean; lead?: Lead; error?: string };
      if (!active) return;
      if (!res.ok) {
        setLead(null);
        setError(data.error ?? "Failed to load lead.");
        return;
      }
      setLead(data.lead ?? null);
    }
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  if (lead === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm text-black/60">Loading…</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm text-red-600">{error || "Lead not found."}</p>
        <Link href="/admin/leads" className="btn btn-ghost mt-4">
          Back to leads
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Link href="/admin/leads" className="text-sm text-black/50 hover:text-black">
        ← Leads
      </Link>
      <h1 className="section-title mt-4">{lead.name || "Lead"}</h1>
      <p className="section-subtitle">{lead.email}</p>
      <div className="mt-8 space-y-4 rounded-2xl border border-black/10 bg-white/70 px-6 py-6 text-sm">
        {lead.company ? (
          <p>
            <span className="text-black/50">Company:</span> {lead.company}
          </p>
        ) : null}
        {lead.phone ? (
          <p>
            <span className="text-black/50">Phone:</span> {lead.phone}
          </p>
        ) : null}
        {lead.service ? (
          <p>
            <span className="text-black/50">Service:</span> {lead.service}
          </p>
        ) : null}
        {lead.message ? (
          <p className="whitespace-pre-wrap">
            <span className="text-black/50">Message:</span>
            <br />
            {lead.message}
          </p>
        ) : null}
        <p className="text-xs text-black/40">
          {new Date(lead.createdAt).toLocaleString()} · {lead.status || "new"} · score{" "}
          {lead.score ?? 0}
        </p>
      </div>
    </div>
  );
}
