"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Panel } from "@/components/studio/Panel";

type Project = {
  id: string;
  name: string;
  status: string;
  shootDate: string | null;
  client?: { name: string } | null;
  createdAt: string;
};

export function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/projects");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setProjects(data);
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
        <p className="text-sm text-rose-300/90">
          Database not configured. Set DATABASE_URL and run{" "}
          <code className="rounded bg-black/30 px-1">npm run db:migrate</code>.
        </p>
        <p className="mt-2 text-xs text-white/50">{error}</p>
      </Panel>
    );
  }

  if (projects.length === 0) {
    return (
      <Panel padding="base">
        <p className="text-sm text-white/50">No projects yet.</p>
        <Link href="/studio/projects/new" className="mt-2 inline-block text-sm text-accent hover:underline">
          Create your first project
        </Link>
      </Panel>
    );
  }

  function formatDate(s: string | null) {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleDateString(undefined, { dateStyle: "medium" });
    } catch {
      return s;
    }
  }

  return (
    <ul className="space-y-2">
      {projects.map((p) => (
        <li key={p.id}>
          <Link href={`/studio/projects/${p.id}`}>
            <Panel padding="base" className="transition-colors hover:bg-white/[0.04]">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white/95">{p.name}</span>
                <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/60 bg-white/10">
                  {p.status}
                </span>
              </div>
              <div className="mt-1 flex gap-4 text-xs text-white/50">
                {p.client && <span>Client: {p.client.name}</span>}
                <span>Shoot: {formatDate(p.shootDate)}</span>
              </div>
            </Panel>
          </Link>
        </li>
      ))}
    </ul>
  );
}
