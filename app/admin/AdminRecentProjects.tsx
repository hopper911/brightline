"use client";

import Link from "next/link";
import { useState } from "react";
import { PILLARS, SECTION_TO_PILLAR } from "@/lib/portfolioPillars";
import type { WorkSection } from "@prisma/client";

type Project = {
  id: string;
  section: WorkSection;
  title: string;
  slug: string;
  published: boolean;
  _count: { media: number };
};

export default function AdminRecentProjects({
  projects,
  totalWork,
}: {
  projects: Project[];
  totalWork: number;
}) {
  const [optimistic, setOptimistic] = useState<Map<string, boolean>>(new Map());
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleTogglePublish(project: Project) {
    setTogglingId(project.id);
    const prev = project.published;
    setOptimistic((m) => new Map(m).set(project.id, !prev));
    try {
      const res = await fetch(`/api/admin/work-projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !prev }),
      });
      if (!res.ok) {
        setOptimistic((m) => {
          const next = new Map(m);
          next.delete(project.id);
          return next;
        });
      }
    } catch {
      setOptimistic((m) => {
        const next = new Map(m);
        next.delete(project.id);
        return next;
      });
    } finally {
      setTogglingId(null);
    }
  }

  if (projects.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-8 text-center">
        <p className="text-sm text-black/50">
          No work projects yet. Create one to get started.
        </p>
        <Link href="/admin/work/new" className="btn btn-primary mt-4">
          New Work Project
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {projects.map((project) => {
        const published = optimistic.has(project.id)
          ? optimistic.get(project.id)!
          : project.published;
        const pillarSlug = SECTION_TO_PILLAR[project.section];
        const pillarLabel = PILLARS.find((p) => p.slug === pillarSlug)?.label ?? pillarSlug;

        return (
          <div
            key={project.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/70 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-black/50">{pillarLabel}</p>
              <p className="font-medium text-black truncate">{project.title}</p>
              <p className="text-xs text-black/50">
                /{pillarSlug}/{project.slug} · {project._count.media} media
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => handleTogglePublish(project)}
                disabled={togglingId === project.id}
                className="btn btn-ghost text-xs disabled:opacity-50"
              >
                {togglingId === project.id ? "…" : published ? "Unpublish" : "Publish"}
              </button>
              <Link href={`/admin/work/${project.id}`} className="btn btn-ghost text-xs">
                Edit
              </Link>
            </div>
          </div>
        );
      })}
      {totalWork > projects.length && (
        <Link href="/admin/work" className="block text-center text-sm text-black/60 hover:text-black">
          View all {totalWork} projects →
        </Link>
      )}
    </div>
  );
}
