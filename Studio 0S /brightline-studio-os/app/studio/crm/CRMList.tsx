"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Panel } from "@/components/studio/Panel";

type Lead = {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
};

type Client = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  _count?: { projects: number };
};

export function CRMList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [leadsRes, clientsRes] = await Promise.all([
          fetch("/api/leads?limit=10"),
          fetch("/api/clients?limit=10"),
        ]);
        if (!leadsRes.ok) throw new Error(await leadsRes.text());
        if (!clientsRes.ok) throw new Error(await clientsRes.text());
        const [l, c] = await Promise.all([leadsRes.json(), clientsRes.json()]);
        setLeads(l);
        setClients(c);
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
      <div className="animate-pulse space-y-4">
        <div className="h-32 rounded-studio-xl border border-white/[0.05] bg-white/[0.02]" />
        <div className="h-32 rounded-studio-xl border border-white/[0.05] bg-white/[0.02]" />
      </div>
    );
  }

  if (error) {
    return (
      <Panel padding="base" className="border-rose-500/20 bg-rose-500/5">
        <p className="text-sm text-rose-300/90">
          Database not configured. Set DATABASE_URL and run <code className="rounded bg-black/30 px-1">npm run db:migrate</code>.
        </p>
        <p className="mt-2 text-xs text-white/50">{error}</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 font-display text-xs font-medium uppercase tracking-[0.15em] text-white/45">
          Recent leads
        </h2>
        {leads.length === 0 ? (
          <Panel padding="base">
            <p className="text-sm text-white/50">No leads yet.</p>
            <Link href="/studio/crm/leads/new" className="mt-2 inline-block text-sm text-accent hover:underline">
              Create your first lead
            </Link>
          </Panel>
        ) : (
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
                  </Panel>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-display text-xs font-medium uppercase tracking-[0.15em] text-white/45">
          Recent clients
        </h2>
        {clients.length === 0 ? (
          <Panel padding="base">
            <p className="text-sm text-white/50">No clients yet.</p>
            <Link href="/studio/crm/clients/new" className="mt-2 inline-block text-sm text-accent hover:underline">
              Create your first client
            </Link>
          </Panel>
        ) : (
          <ul className="space-y-2">
            {clients.map((c) => (
              <li key={c.id}>
                <Link href={`/studio/crm/clients/${c.id}`}>
                  <Panel padding="base" className="transition-colors hover:bg-white/[0.04]">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white/95">{c.name}</span>
                      {c._count?.projects != null && (
                        <span className="text-xs text-white/50">{c._count.projects} projects</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-white/50">{c.email}</p>
                  </Panel>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
