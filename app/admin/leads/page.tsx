"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  createdAt: string;
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await fetch("/api/admin/leads");
      if (!res.ok || !active) return;
      const data = (await res.json()) as { leads: Lead[] };
      setLeads(data.leads || []);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="section-title">Admin · Leads</h1>
      <p className="section-subtitle">Read-only inbound inquiries.</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href="/api/admin/leads/export"
          className="btn btn-ghost"
          download
        >
          Export CSV
        </a>
      </div>

      <div className="mt-10 space-y-4">
        {leads.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white/70 px-6 py-10 text-center text-sm text-black/60">
            No leads yet.
          </div>
        ) : (
          leads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-2xl border border-black/10 bg-white/70 px-6 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-black/50">
                    {lead.name || "Lead"}
                  </p>
                  <p className="text-sm text-black/80">{lead.email}</p>
                  {lead.company ? (
                    <p className="text-xs text-black/50">{lead.company}</p>
                  ) : null}
                </div>
                <div className="text-right text-xs text-black/40">
                  <p>{new Date(lead.createdAt).toLocaleString()}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-black/50">
                    {lead.status || "new"} · score {lead.score ?? 0}
                  </p>
                </div>
              </div>
              {lead.message ? (
                <p className="mt-3 text-sm text-black/70">{lead.message}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-black/50">
                {lead.type ? <span>Type: {lead.type}</span> : null}
                {lead.service ? <span>Service: {lead.service}</span> : null}
                {lead.budget ? <span>Budget: {lead.budget}</span> : null}
                {lead.phone ? <span>Phone: {lead.phone}</span> : null}
                {lead.source ? <span>Source: {lead.source}</span> : null}
                <Link href={`/admin/leads/${lead.id}`} className="text-black underline">
                  View details
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
