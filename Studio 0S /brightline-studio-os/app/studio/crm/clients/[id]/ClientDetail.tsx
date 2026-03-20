"use client";

import Link from "next/link";
import { Panel } from "@/components/studio/Panel";

type Client = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  notes?: string | null;
  projects?: Array<{ id: string; name: string; status: string }>;
};

export function ClientDetail({ client }: { client: Client }) {
  return (
    <div className="space-y-6">
      <Panel padding="base" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">Email</p>
            <p className="mt-1 text-sm text-white/95">{client.email}</p>
          </div>
          {client.phone && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">Phone</p>
              <p className="mt-1 text-sm text-white/95">{client.phone}</p>
            </div>
          )}
          {client.company && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">Company</p>
              <p className="mt-1 text-sm text-white/95">{client.company}</p>
            </div>
          )}
        </div>
        {client.notes && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">Notes</p>
            <p className="mt-1 text-sm text-white/80 whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}
      </Panel>

      {client.projects && client.projects.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-xs font-medium uppercase tracking-[0.15em] text-white/45">
            Projects
          </h2>
          <ul className="space-y-2">
            {client.projects.map((p) => (
              <li key={p.id}>
                <Link href={`/studio/projects/${p.id}`}>
                  <Panel padding="base" className="transition-colors hover:bg-white/[0.04]">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white/95">{p.name}</span>
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/60 bg-white/10">
                        {p.status}
                      </span>
                    </div>
                  </Panel>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
