"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Panel } from "@/components/studio/Panel";

type Lead = {
  id: string;
  name: string;
  email: string;
  status: string;
  source?: string | null;
  createdAt: string;
};

export function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/leads");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setLeads(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-studio-xl border border-white/[0.05] bg-white/[0.02]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Panel padding="base" className="border-rose-500/20 bg-rose-500/5">
        <p className="text-sm text-rose-300/90">{error}</p>
      </Panel>
    );
  }

  if (leads.length === 0) {
    return (
      <Panel padding="base">
        <p className="text-sm text-white/50">No leads yet.</p>
        <Link href="/studio/crm/leads/new" className="mt-2 inline-block text-sm text-accent hover:underline">
          Create your first lead
        </Link>
      </Panel>
    );
  }

  return (
    <ul className="space-y-2">
      {leads.map((l) => (
        <li key={l.id}>
          <Link href={`/studio/crm/leads/${l.id}`}>
            <Panel padding="base" className="transition-colors hover:bg-white/[0.04]">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white/95">{l.name}</span>
                <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/60 bg-white/10">
                  {l.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-white/50">{l.email}</p>
              {l.source && (
                <p className="mt-1 text-xs text-white/40">Source: {l.source}</p>
              )}
            </Panel>
          </Link>
        </li>
      ))}
    </ul>
  );
}
