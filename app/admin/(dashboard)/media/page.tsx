"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PILLARS, PILLAR_SLUGS } from "@/lib/portfolioPillars";

type MediaLibrarySource = "brightline-work" | "mirotech-work" | "mirotech-journal";

type MediaItem = {
  id: string;
  source: MediaLibrarySource;
  kind: string;
  keyFull: string | null;
  keyThumb: string | null;
  posterKey: string | null;
  providerId: string | null;
  alt: string | null;
  previewUrl: string;
  vault: string;
  projectId: string;
  projectTitle: string;
  projectSlug: string;
  pillarSlug: string;
  contextLabel: string;
  editHref: string;
  reviewHref: string | null;
  isHero: boolean;
};

type ProjectOption = {
  id: string;
  title: string;
  slug: string;
  pillarSlug: string;
  source: "brightline-work" | "mirotech";
};

type SourceFilter = "all" | "brightline" | "mirotech";

function sourceLabel(source: MediaLibrarySource): string {
  if (source === "brightline-work") return "Brightline";
  if (source === "mirotech-work") return "Mirotech work";
  return "Mirotech journal";
}

function isExternalHref(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}

export default function AdminMediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pillarOptions, setPillarOptions] = useState<{ slug: string; label: string }[]>(() =>
    PILLAR_SLUGS.map((s) => ({ slug: s, label: PILLARS.find((p) => p.slug === s)?.label ?? s }))
  );
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
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
          const pillars = d.pillars.map((p) => ({ slug: p.slug, label: p.label }));
          if (!pillars.some((p) => p.slug === "journal")) {
            pillars.push({ slug: "journal", label: "Journal" });
          }
          setPillarOptions(pillars);
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
      setError("");
      try {
        const params = new URLSearchParams();
        if (sourceFilter !== "all") params.set("source", sourceFilter);
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
        setError(e instanceof Error ? e.message : "Failed to load media.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [sourceFilter, sectionFilter, typeFilter, projectFilter, search]);

  const filteredProjects = useMemo(() => {
    if (!sectionFilter) return projects;
    return projects.filter((p) => p.pillarSlug === sectionFilter);
  }, [projects, sectionFilter]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Media Library</p>
        <h1 className="mt-2 font-display text-3xl text-white">Media</h1>
        <p className="mt-1 text-sm text-white/70">
          Brightline <code className="text-white/80">/work</code> project media (heroes, galleries,
          backgrounds) plus Mirotech CMS case studies and journal — all R2-backed references in one
          place.
        </p>
        <p className="mt-2 text-xs text-white/45">
          Brightline rows link to <strong className="text-white/60">WorkProject</strong> editor;
          Mirotech rows link to <strong className="text-white/60">Studio CMS</strong> or live
          mirotech.solutions pages.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { id: "all" as const, label: "All sources" },
            { id: "brightline" as const, label: "Brightline /work" },
            { id: "mirotech" as const, label: "Mirotech CMS" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              setSourceFilter(opt.id);
              setProjectFilter("");
            }}
            className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.14em] ${
              sourceFilter === opt.id
                ? "border-white/40 bg-white/10 text-white"
                : "border-white/15 text-white/60 hover:border-white/30 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <Link
          href="/admin/r2?view=mirotech-all-media&vault=mirotech-site"
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-white/60 hover:border-white/30 hover:text-white"
        >
          R2 storage
        </Link>
        <Link
          href="/admin/mirotech-media"
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-white/60 hover:border-white/30 hover:text-white"
        >
          Mirotech command center
        </Link>
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
              onClick={() => {
                setSectionFilter(sectionFilter === opt.slug ? "" : opt.slug);
                setProjectFilter("");
              }}
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
          className="min-w-[220px] rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-white/40 focus:outline-none"
        >
          <option value="">All projects</option>
          {filteredProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.source === "mirotech" ? "[Mirotech] " : ""}
              {p.title} ({p.pillarSlug}/{p.slug})
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-white/50">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/55">
          <p>No media found for the current filters.</p>
          <p className="mt-2 text-xs text-white/40">
            Heroes and gallery videos count here — not only gallery images. Try clearing the video
            filter, switching source to <strong className="text-white/55">All sources</strong>, or
            open the project in{" "}
            <Link href="/admin/work" className="text-white/70 underline hover:text-white">
              Work CMS
            </Link>{" "}
            /{" "}
            <Link href="/admin/studio-cms" className="text-white/70 underline hover:text-white">
              Studio CMS
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {items.map((item) => {
            const previewUrl = item.previewUrl;
            const videoSrc = item.keyFull ? item.previewUrl : "";
            const isVideo = item.kind === "VIDEO";
            const isYoutube = Boolean(item.providerId);
            const editProps = isExternalHref(item.editHref)
              ? { href: item.editHref, target: "_blank", rel: "noopener noreferrer" }
              : { href: item.editHref };

            return (
              <div
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-colors hover:border-white/20 hover:bg-white/10"
              >
                {item.reviewHref ? (
                  <Link href={item.reviewHref} className="block">
                    <MediaThumb
                      previewUrl={previewUrl}
                      videoSrc={videoSrc}
                      isVideo={isVideo}
                      isYoutube={isYoutube}
                      alt={item.alt ?? ""}
                    />
                  </Link>
                ) : (
                  <div className="block">
                    <MediaThumb
                      previewUrl={previewUrl}
                      videoSrc={videoSrc}
                      isVideo={isVideo}
                      isYoutube={isYoutube}
                      alt={item.alt ?? ""}
                    />
                  </div>
                )}
                <div className="p-2">
                  <p className="truncate text-xs text-white/80">{item.projectTitle}</p>
                  <p className="truncate text-[10px] text-white/50">
                    {item.pillarSlug}/{item.projectSlug}
                  </p>
                  <p className="mt-1 truncate text-[10px] text-white/40">{item.contextLabel}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/55">
                      {sourceLabel(item.source)}
                    </span>
                    {item.isHero ? (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-100/90">
                        Hero
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.reviewHref ? (
                      <Link
                        href={item.reviewHref}
                        className="text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-white"
                      >
                        Review
                      </Link>
                    ) : null}
                    <Link
                      {...editProps}
                      className="text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-white/80"
                    >
                      Edit project
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

function MediaThumb({
  previewUrl,
  videoSrc,
  isVideo,
  isYoutube,
  alt,
}: {
  previewUrl: string;
  videoSrc: string;
  isVideo: boolean;
  isYoutube: boolean;
  alt: string;
}) {
  return (
    <div className="relative aspect-square overflow-hidden bg-black/40">
      {previewUrl ? (
        isVideo && !isYoutube && videoSrc ? (
          <>
            <video
              src={videoSrc}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <svg className="h-10 w-10 text-white/90" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- admin grid thumbs from R2 / YouTube
          <img
            src={previewUrl}
            alt={alt}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
          No preview
        </div>
      )}
      {isVideo ? (
        <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] uppercase text-white/80">
          {isYoutube ? "YouTube" : "Video"}
        </span>
      ) : null}
    </div>
  );
}
