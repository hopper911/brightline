"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PILLARS,
  PILLAR_SLUGS,
  SECTION_TO_PILLAR,
} from "@/lib/portfolioPillars";
import type { WorkSection } from "@prisma/client";

type MediaAsset = {
  id: string;
  kind: string;
  keyFull: string | null;
  keyThumb: string | null;
  alt: string | null;
};

type ProjectMedia = {
  mediaId: string;
  sortOrder: number;
  media: MediaAsset;
};

type WorkProject = {
  id: string;
  section: WorkSection;
  title: string;
  slug: string;
  summary: string | null;
  location: string | null;
  year: number | null;
  published: boolean;
  isFeatured: boolean;
  sortOrder: number;
  heroMedia: MediaAsset | null;
  media: ProjectMedia[];
};

export default function AdminWorkPage() {
  const [projects, setProjects] = useState<WorkProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [pillarFilter, setPillarFilter] = useState<string>("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const url = pillarFilter
          ? `/api/admin/work-projects?pillar=${encodeURIComponent(pillarFilter)}`
          : "/api/admin/work-projects";
        const res = await fetch(url);
        const data = (await res.json()) as { ok: boolean; projects?: WorkProject[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to load");
        setProjects(data.projects ?? []);
      } catch (e) {
        console.error(e);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [pillarFilter]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">
          Public Work
        </p>
        <h1 className="font-display text-3xl text-black">Work projects</h1>
        <p className="text-sm text-black/70">
          Manage projects on /work (Architecture & Real Estate, Campaign & Advertising, Corporate & Executive).
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-black/70">
          Pillar:
          <select
            value={pillarFilter}
            onChange={(e) => setPillarFilter(e.target.value)}
            className="rounded border border-black/20 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">All pillars</option>
            {PILLAR_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {PILLARS.find((p) => p.slug === slug)?.label ?? slug}
              </option>
            ))}
          </select>
        </label>
        <Link href="/admin/work/new" className="btn btn-primary">
          New project
        </Link>
        <Link href="/admin" className="btn btn-ghost">
          Back to Admin
        </Link>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-black/50">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="mt-8 text-sm text-black/50">No work projects. Create one or run the seed endpoint to add demos.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-xl border border-black/10 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wide text-black/50">
                    {PILLARS.find((p) => p.slug === SECTION_TO_PILLAR[project.section])?.label ?? project.section}
                  </p>
                  <h2 className="mt-1 font-semibold text-black truncate">{project.title}</h2>
                  <p className="mt-0.5 text-xs text-black/60">/{SECTION_TO_PILLAR[project.section]}/{project.slug}</p>
                  <p className="mt-2 text-xs text-black/50">
                    {project.published ? "Published" : "Draft"} · {project.media?.length ?? 0} media
                  </p>
                </div>
                <Link
                  href={`/admin/work/${project.id}`}
                  className="btn btn-ghost text-xs shrink-0"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
