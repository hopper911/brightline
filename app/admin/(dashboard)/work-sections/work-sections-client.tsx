"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Service } from "@/app/services/data";
import type { RelatedServiceLink } from "@/lib/work-project-related-services";
import { parseRelatedServiceLinks } from "@/lib/work-project-related-services";

type WorkProjectRow = {
  id: string;
  title: string;
  slug: string;
  section: string;
  published: boolean;
  relatedServicesEnabled: boolean;
  relatedServicesIntro: string | null;
  relatedServicesLinks: unknown;
  showRelatedContactButton: boolean;
};

export default function WorkSectionsClient({ initialServices }: { initialServices: Service[] }) {
  const [projects, setProjects] = useState<WorkProjectRow[]>([]);
  const [sectionToPillar, setSectionToPillar] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/work-projects", { credentials: "include" });
      const data = (await res.json()) as {
        ok?: boolean;
        projects?: WorkProjectRow[];
        sectionToPillar?: Record<string, string>;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.projects) {
        throw new Error(data.error ?? "Could not load work projects.");
      }
      setProjects(data.projects);
      setSectionToPillar(data.sectionToPillar ?? {});
      setSelectedId((current) => current || data.projects?.[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load work projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter(
      (project) =>
        project.title.toLowerCase().includes(query) ||
        project.slug.toLowerCase().includes(query) ||
        project.section.toLowerCase().includes(query)
    );
  }, [projects, search]);

  const selected = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? filteredProjects[0],
    [projects, selectedId, filteredProjects]
  );

  const selectedLinks = useMemo(
    () => parseRelatedServiceLinks(selected?.relatedServicesLinks),
    [selected?.relatedServicesLinks]
  );

  const pillarSlug = selected ? sectionToPillar[selected.section] ?? selected.section.toLowerCase() : "";
  const liveHref = selected ? `/work/${pillarSlug}/${selected.slug}` : "/work";

  function setDirty() {
    setStatus("idle");
  }

  function updateSelected(patch: Partial<WorkProjectRow>) {
    if (!selected) return;
    setProjects((current) =>
      current.map((project) => (project.id === selected.id ? { ...project, ...patch } : project))
    );
    setDirty();
  }

  function addRelatedLink(slug: string) {
    if (!selected) return;
    const target = initialServices.find((service) => service.slug === slug);
    if (!target) return;
    const existing = parseRelatedServiceLinks(selected.relatedServicesLinks);
    if (existing.some((link) => link.slug === slug)) return;
    const next: RelatedServiceLink[] = [...existing, { slug: target.slug, title: target.title }];
    updateSelected({ relatedServicesLinks: next });
  }

  function removeRelatedLink(slug: string) {
    if (!selected) return;
    const next = parseRelatedServiceLinks(selected.relatedServicesLinks).filter(
      (link) => link.slug !== slug
    );
    updateSelected({ relatedServicesLinks: next.length > 0 ? next : null });
  }

  async function save() {
    if (!selected) return;
    setStatus("saving");
    setError("");
    try {
      const links = parseRelatedServiceLinks(selected.relatedServicesLinks);
      const res = await fetch(`/api/admin/work-projects/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          relatedServicesEnabled: selected.relatedServicesEnabled,
          relatedServicesIntro: selected.relatedServicesIntro?.trim() || null,
          relatedServicesLinks: links.length > 0 ? links : null,
          showRelatedContactButton: selected.showRelatedContactButton,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; project?: WorkProjectRow; error?: string };
      if (!res.ok || !json.ok || !json.project) {
        throw new Error(json.error ?? "Save failed.");
      }
      setProjects((current) =>
        current.map((project) => (project.id === json.project!.id ? { ...project, ...json.project! } : project))
      );
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setStatus("error");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-white/70">Loading work projects…</div>
    );
  }

  if (!selected) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-white/70">
        No work projects found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Work projects</p>
          <h1 className="mt-2 font-display text-4xl text-white">Work sections</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Edit the related services block at the bottom of each{" "}
            <code className="text-white/80">/work/…</code> project page. Turn it off per project or
            customize the copy and service links.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={liveHref} className="btn btn-ghost" target="_blank">
            View live
          </Link>
          <Link href={`/admin/work/${selected.id}`} className="btn btn-ghost">
            Full project editor
          </Link>
          <button
            className="btn btn-primary"
            type="button"
            disabled={status === "saving"}
            onClick={() => void save()}
          >
            {status === "saving" ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      {status === "saved" ? <p className="mt-4 text-sm text-emerald-300">Saved.</p> : null}

      <label className="mt-8 block text-sm text-white/70">
        Search projects
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Title, slug, or section"
          className="mt-2 w-full max-w-md rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
        />
      </label>

      <div className="mt-4 flex max-h-48 flex-wrap gap-2 overflow-y-auto border-b border-white/10 pb-4">
        {filteredProjects.map((project) => {
          const pillar = sectionToPillar[project.section] ?? project.section.toLowerCase();
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => setSelectedId(project.id)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                project.id === selectedId
                  ? "border-white bg-white text-black"
                  : "border-white/15 text-white/70 hover:border-white/35 hover:text-white"
              }`}
            >
              {project.title}
              {!project.published ? (
                <span className="ml-2 text-[10px] uppercase tracking-[0.2em] opacity-60">Draft</span>
              ) : null}
              <span className="ml-2 text-[10px] uppercase tracking-[0.2em] opacity-50">{pillar}</span>
            </button>
          );
        })}
      </div>

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">Selected project</p>
          <h2 className="mt-2 font-display text-2xl text-white">{selected.title}</h2>
          <p className="mt-1 font-mono text-xs text-white/50">
            /work/{pillarSlug}/{selected.slug}
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={selected.relatedServicesEnabled !== false}
            onChange={(event) => updateSelected({ relatedServicesEnabled: event.target.checked })}
          />
          <span>
            <strong className="text-white">Show related services section</strong>
            <span className="mt-1 block text-sm text-white/60">
              Displays the cross-link block above the &ldquo;Next step&rdquo; CTA on this project page.
            </span>
          </span>
        </label>

        {selected.relatedServicesEnabled !== false ? (
          <div className="mt-6 space-y-4">
            <label className="block text-sm text-white/70">
              Intro copy (optional override)
              <textarea
                value={selected.relatedServicesIntro ?? ""}
                onChange={(event) => updateSelected({ relatedServicesIntro: event.target.value })}
                rows={3}
                placeholder="Leave blank to use the default line with your pillar service link."
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
              />
            </label>

            <label className="flex items-center gap-3 text-sm text-white/70">
              <input
                type="checkbox"
                checked={selected.showRelatedContactButton !== false}
                onChange={(event) => updateSelected({ showRelatedContactButton: event.target.checked })}
              />
              Show Contact button in this block
            </label>

            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-white/50">Linked services</p>
              <p className="mt-1 text-sm text-white/55">
                Leave empty to use automatic links from this project&apos;s work pillar.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedLinks.map((link) => (
                  <span
                    key={link.slug}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-white/80"
                  >
                    {link.title}
                    <button
                      type="button"
                      className="text-white/45 hover:text-white"
                      onClick={() => removeRelatedLink(link.slug)}
                      aria-label={`Remove ${link.title}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {selectedLinks.length === 0 ? (
                  <p className="text-sm text-white/50">Using pillar defaults — add a service to override.</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {initialServices.map((service) => (
                <button
                  key={service.slug}
                  type="button"
                  className="btn btn-ghost text-xs"
                  disabled={selectedLinks.some((link) => link.slug === service.slug)}
                  onClick={() => addRelatedLink(service.slug)}
                >
                  + {service.title}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
