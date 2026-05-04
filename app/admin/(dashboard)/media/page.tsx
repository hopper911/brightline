"use client";

/**
 * Work media library: `projectId` from /api/admin/media is WorkProject.id (public /work CMS).
 * Studio CMS uses StudioProject — do not confuse with this route's projectId.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { PILLARS, PILLAR_SLUGS } from "@/lib/portfolioPillars";
import { getPublicR2Url } from "@/lib/r2";

type MediaItem = {
  id: string;
  kind: string;
  keyFull: string | null;
  keyThumb: string | null;
  alt: string | null;
  projectId: string;
  projectTitle: string;
  projectSlug: string;
  pillarSlug: string;
};

type ProjectOption = {
  id: string;
  title: string;
  slug: string;
  pillarSlug: string;
};

export default function AdminMediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pillarOptions, setPillarOptions] = useState<{ slug: string; label: string }[]>(() =>
    PILLAR_SLUGS.map((s) => ({ slug: s, label: PILLARS.find((p) => p.slug === s)?.label ?? s }))
  );
  const [sectionFilter, setSectionFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    async function loadPillars() {
      try {
        const res = await fetch("/api/admin/work-pillars", { credentials: "include" });
        const d = (await res.json()) as {
          ok?: boolean;
          pillars?: { slug: string; label: string }[];
        };
        if (d.ok && d.pillars?.length) {
          setPillarOptions(d.pillars.map((p) => ({ slug: p.slug, label: p.label })));
        }
      } catch {
        /* keep defaults */
      }
    }
    void loadPillars();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (sectionFilter) params.set("section", sectionFilter);
        if (typeFilter) params.set("type", typeFilter);
        if (projectFilter) params.set("projectId", projectFilter);
        if (search) params.set("search", search);
        const res = await fetch(`/api/admin/media?${params}`, {
          credentials: "include",
        });
        const data = (await res.json()) as {
          ok: boolean;
          items?: MediaItem[];
          projects?: ProjectOption[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Failed to load");
        setItems(data.items ?? []);
        setProjects(data.projects ?? []);
      } catch (e) {
        console.error(e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [sectionFilter, typeFilter, projectFilter, search]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Media Library</p>
        <h1 className="mt-2 font-display text-3xl text-white">Media</h1>
        <p className="mt-1 text-sm text-white/70">
          View all work project media (R2-backed /work). Filter by section, type, or project.
        </p>
        <p className="mt-2 text-xs text-white/45">
          Links to edit use <strong className="text-white/60">WorkProject</strong> ids — not Studio CMS
          (StudioProject).
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <input
          type="search"
          placeholder="Search by filename…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[180px] rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
        />
        <div className="flex gap-1 rounded-lg bg-white/5 p-1">
          {pillarOptions.map((opt) => (
            <button
              key={opt.slug}
              type="button"
              onClick={() => setSectionFilter(sectionFilter === opt.slug ? "" : opt.slug)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                sectionFilter === opt.slug
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTypeFilter(typeFilter === "image" ? "" : "image")}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              typeFilter === "image"
                ? "border-white/40 bg-white/10 text-white"
                : "border-white/20 text-white/70 hover:border-white/30 hover:text-white"
            }`}
          >
            Images
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter(typeFilter === "video" ? "" : "video")}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              typeFilter === "video"
                ? "border-white/40 bg-white/10 text-white"
                : "border-white/20 text-white/70 hover:border-white/30 hover:text-white"
            }`}
          >
            Videos
          </button>
        </div>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-white/40 focus:outline-none"
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({p.pillarSlug}/{p.slug})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-white/50">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-white/50">No media found.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {items.map((item) => {
            /** Prefer web_full like WorkProjectGallery — bad/missing thumb keys are common on legacy rows. */
            const previewKey = item.keyFull ?? item.keyThumb;
            const thumbUrl = previewKey ? getPublicR2Url(previewKey) : "";
            const isVideo = item.kind === "VIDEO";
            return (
              <div
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-colors hover:border-white/20 hover:bg-white/10"
              >
                <Link href={`/admin/media/${item.id}`} className="block">
                  <div className="relative aspect-square overflow-hidden bg-black/40">
                    {thumbUrl ? (
                      isVideo ? (
                        <>
                          <video
                            src={item.keyFull ? getPublicR2Url(item.keyFull) : ""}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <svg
                              className="h-10 w-10 text-white/90"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </>
                      ) : (
                        <img
                          src={thumbUrl}
                          alt={item.alt ?? ""}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      )
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                        No preview
                      </div>
                    )}
                    {isVideo && (
                      <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] uppercase text-white/80">
                        Video
                      </span>
                    )}
                  </div>
                </Link>
                <div className="p-2">
                  <p className="truncate text-xs text-white/80">{item.projectTitle}</p>
                  <p className="truncate text-[10px] text-white/50">
                    {item.pillarSlug}/{item.projectSlug}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                      href={`/admin/media/${item.id}`}
                      className="text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-white"
                    >
                      Review
                    </Link>
                    <Link
                      href={`/admin/work/${item.projectId}`}
                      className="text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-white/80"
                      title={`Edit Work project: ${item.projectTitle}`}
                    >
                      Edit Work project
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
