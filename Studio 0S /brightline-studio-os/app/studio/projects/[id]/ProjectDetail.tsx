"use client";

import Link from "next/link";
import { Panel } from "@/components/studio/Panel";

type Project = {
  id: string;
  name: string;
  status: string;
  shootDate: string | null;
  notes: string | null;
  client?: { id: string; name: string } | null;
  tasks?: Array<{ id: string; title: string; status: string }>;
};

export function ProjectDetail({ project }: { project: Project }) {
  function formatDate(s: string | null) {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleDateString(undefined, { dateStyle: "medium" });
    } catch {
      return s;
    }
  }

  return (
    <div className="space-y-6">
      <Panel padding="base" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">Status</p>
            <p className="mt-1 text-sm text-white/95">{project.status}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">Shoot date</p>
            <p className="mt-1 text-sm text-white/95">{formatDate(project.shootDate)}</p>
          </div>
          {project.client && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">Client</p>
              <Link
                href={`/studio/crm/clients/${project.client.id}`}
                className="mt-1 block text-sm text-accent hover:underline"
              >
                {project.client.name}
              </Link>
            </div>
          )}
        </div>
        {project.notes && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">Notes</p>
            <p className="mt-1 text-sm text-white/80 whitespace-pre-wrap">{project.notes}</p>
          </div>
        )}
      </Panel>
    </div>
  );
}
