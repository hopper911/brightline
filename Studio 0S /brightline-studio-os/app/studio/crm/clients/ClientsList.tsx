"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Panel } from "@/components/studio/Panel";

type Client = {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  createdAt: string;
  _count?: { projects: number };
};

export function ClientsList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/clients");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setClients(data);
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

  if (clients.length === 0) {
    return (
      <Panel padding="base">
        <p className="text-sm text-white/50">No clients yet.</p>
        <Link href="/studio/crm/clients/new" className="mt-2 inline-block text-sm text-accent hover:underline">
          Create your first client
        </Link>
      </Panel>
    );
  }

  return (
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
              {c.company && (
                <p className="mt-1 text-xs text-white/40">{c.company}</p>
              )}
            </Panel>
          </Link>
        </li>
      ))}
    </ul>
  );
}
