"use client";

/* TODO: deeper publishing workflow (draft → review → live) when Studio OS phase expands. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { PILLARS, PILLAR_SLUGS } from "@/lib/portfolioPillars";
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

type ProjectTemplate = {
  id: string;
  name: string;
  pillar: string;
  defaultFields: Record<string, unknown>;
  defaultTags: string[];
  defaultDeliveryStructure: Record<string, unknown>;
  defaultAISettings: Record<string, unknown>;
};

function safeJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

export default function AdminWorkPage() {
  const [projects, setProjects] = useState<WorkProject[]>([]);
  const [sectionToPillar, setSectionToPillar] = useState<Record<string, string>>({});
  const [pillarOptions, setPillarOptions] = useState<{ slug: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [pillarFilter, setPillarFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);
  const [templateFieldsJson, setTemplateFieldsJson] = useState("{}");
  const [templateDeliveryJson, setTemplateDeliveryJson] = useState("{}");
  const [templateAIJson, setTemplateAIJson] = useState("{}");
  const [templateTagsRaw, setTemplateTagsRaw] = useState("");

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
        } else {
          setPillarOptions(PILLAR_SLUGS.map((s) => ({ slug: s, label: PILLARS.find((p) => p.slug === s)?.label ?? s })));
        }
      } catch {
        setPillarOptions(PILLAR_SLUGS.map((s) => ({ slug: s, label: PILLARS.find((p) => p.slug === s)?.label ?? s })));
      }
    }
    void loadPillars();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (pillarFilter) params.set("pillar", pillarFilter);
        if (search) params.set("search", search);
        const url = `/api/admin/work-projects${params.toString() ? `?${params}` : ""}`;
        const res = await fetch(url, { credentials: "include" });
        const data = (await res.json()) as {
          ok: boolean;
          projects?: WorkProject[];
          sectionToPillar?: Record<string, string>;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Failed to load");
        setProjects(data.projects ?? []);
        setSectionToPillar(data.sectionToPillar ?? {});
      } catch (e) {
        console.error(e);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [pillarFilter, search]);

  async function loadTemplates() {
    const res = await fetch("/api/admin/templates", { credentials: "include" });
    const data = (await res.json()) as { ok?: boolean; templates?: ProjectTemplate[]; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to load templates.");
    setTemplates(data.templates ?? []);
    const first = data.templates?.[0];
    if (first && !selectedTemplateId) setSelectedTemplateId(first.id);
  }

  async function openTemplateModal() {
    setTemplateError("");
    setTemplateModalOpen(true);
    try {
      await loadTemplates();
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : "Failed to load templates.");
    }
  }

  function startEditTemplate(template: ProjectTemplate) {
    setEditingTemplate(template);
    setTemplateFieldsJson(safeJson(template.defaultFields));
    setTemplateDeliveryJson(safeJson(template.defaultDeliveryStructure));
    setTemplateAIJson(safeJson(template.defaultAISettings));
    setTemplateTagsRaw(template.defaultTags.join(", "));
  }

  async function saveTemplate() {
    if (!editingTemplate) return;
    setTemplateSaving(true);
    setTemplateError("");
    try {
      const defaultFields = JSON.parse(templateFieldsJson) as Record<string, unknown>;
      const defaultDeliveryStructure = JSON.parse(templateDeliveryJson) as Record<string, unknown>;
      const defaultAISettings = JSON.parse(templateAIJson) as Record<string, unknown>;
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: editingTemplate.id,
          name: editingTemplate.name,
          pillar: editingTemplate.pillar,
          defaultFields,
          defaultTags: templateTagsRaw.split(/[,;]/).map((tag) => tag.trim()).filter(Boolean),
          defaultDeliveryStructure,
          defaultAISettings,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save template.");
      await loadTemplates();
      setEditingTemplate(null);
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : "Template save failed.");
    } finally {
      setTemplateSaving(false);
    }
  }

  async function createFromTemplate() {
    if (!selectedTemplateId) return;
    setTemplateSaving(true);
    setTemplateError("");
    try {
      const res = await fetch("/api/admin/projects/create-from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ templateId: selectedTemplateId, title: templateTitle.trim() || undefined }),
      });
      const data = (await res.json()) as { ok?: boolean; project?: { id: string }; error?: string };
      if (!res.ok || !data.project?.id) throw new Error(data.error ?? "Failed to create project.");
      window.location.href = `/admin/work/${data.project.id}`;
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : "Failed to create project.");
    } finally {
      setTemplateSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">
          Public Work
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-3xl text-black">Work</h1>
          <div className="flex items-center gap-2">
            <Link href="/admin/work" className="btn btn-primary text-sm">
              Projects
            </Link>
            <Link href="/admin/work-pillars" className="btn btn-ghost text-sm">
              Pillars
            </Link>
          </div>
        </div>
        <p className="text-sm text-black/70">
          Manage projects on /work (Architecture & Real Estate, Advertising & Campaign, Corporate &
          Executive). R2-backed media and hero images are edited here.
        </p>
        <p className="text-xs text-black/55">
          Work = pillar case studies on the public site. Portfolio admin is a separate visual feed (see
          Portfolio).
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <input
          type="search"
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[180px] rounded border border-black/20 bg-white px-3 py-1.5 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-black/70">
          Pillar:
          <select
            value={pillarFilter}
            onChange={(e) => setPillarFilter(e.target.value)}
            className="rounded border border-black/20 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">All pillars</option>
            {pillarOptions.map((opt) => (
              <option key={opt.slug} value={opt.slug}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <Link href="/admin/work-pillars" className="btn btn-ghost">
          Edit pillars
        </Link>
        <Link href="/admin/work/new" className="btn btn-primary">
          New project
        </Link>
        <button type="button" className="btn btn-primary" onClick={() => void openTemplateModal()}>
          Create Project from Template
        </button>
        <Link href="/admin/projects" className="btn btn-ghost">
          Studio project pages
        </Link>
      </div>

      {templateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl text-black">Create Project from Template</h2>
                <p className="mt-1 text-sm text-black/60">
                  Templates prefill project fields, tags, delivery structure, and AI defaults. Drafts remain editable.
                </p>
              </div>
              <button type="button" className="btn btn-ghost text-sm" onClick={() => setTemplateModalOpen(false)}>
                Close
              </button>
            </div>
            {templateError ? <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{templateError}</p> : null}
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
              <section className="rounded-xl border border-black/10 p-4">
                <h3 className="text-sm font-semibold text-black">Create draft</h3>
                <label className="mt-4 block text-xs uppercase tracking-wide text-black/55">Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(event) => setSelectedTemplateId(event.target.value)}
                  className="mt-1 w-full rounded border border-black/20 bg-white px-3 py-2 text-sm"
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} · {template.pillar}
                    </option>
                  ))}
                </select>
                <label className="mt-4 block text-xs uppercase tracking-wide text-black/55">Project title override</label>
                <input
                  value={templateTitle}
                  onChange={(event) => setTemplateTitle(event.target.value)}
                  placeholder="Optional custom title"
                  className="mt-1 w-full rounded border border-black/20 bg-white px-3 py-2 text-sm"
                />
                <button type="button" className="btn btn-primary mt-4" disabled={templateSaving || !selectedTemplateId} onClick={() => void createFromTemplate()}>
                  {templateSaving ? "Creating..." : "Create draft"}
                </button>
                <div className="mt-5 space-y-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className="block w-full rounded border border-black/10 p-3 text-left text-sm hover:bg-black/[0.03]"
                      onClick={() => startEditTemplate(template)}
                    >
                      <span className="font-medium text-black">{template.name}</span>
                      <span className="ml-2 text-xs text-black/45">{template.pillar}</span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="rounded-xl border border-black/10 p-4">
                <h3 className="text-sm font-semibold text-black">Edit/save template</h3>
                {editingTemplate ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-black/70">{editingTemplate.name} · {editingTemplate.pillar}</p>
                    <label className="block text-xs uppercase tracking-wide text-black/55">Tags</label>
                    <input
                      value={templateTagsRaw}
                      onChange={(event) => setTemplateTagsRaw(event.target.value)}
                      className="w-full rounded border border-black/20 bg-white px-3 py-2 text-sm"
                    />
                    <label className="block text-xs uppercase tracking-wide text-black/55">Default fields JSON</label>
                    <textarea value={templateFieldsJson} onChange={(event) => setTemplateFieldsJson(event.target.value)} rows={7} className="w-full rounded border border-black/20 bg-white p-3 font-mono text-xs" />
                    <label className="block text-xs uppercase tracking-wide text-black/55">Delivery structure JSON</label>
                    <textarea value={templateDeliveryJson} onChange={(event) => setTemplateDeliveryJson(event.target.value)} rows={5} className="w-full rounded border border-black/20 bg-white p-3 font-mono text-xs" />
                    <label className="block text-xs uppercase tracking-wide text-black/55">AI settings JSON</label>
                    <textarea value={templateAIJson} onChange={(event) => setTemplateAIJson(event.target.value)} rows={5} className="w-full rounded border border-black/20 bg-white p-3 font-mono text-xs" />
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-primary" disabled={templateSaving} onClick={() => void saveTemplate()}>
                        Save template
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => setEditingTemplate(null)}>
                        Cancel edit
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-black/50">Choose a template on the left to edit fields, delivery structure, tags, and AI defaults.</p>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-8 text-sm text-black/50">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="mt-8 text-sm text-black/50">
          No work projects. Create one or run the seed endpoint to add demos.
        </p>
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
                    {PILLARS.find((p) => p.slug === sectionToPillar[project.section])?.label ??
                      sectionToPillar[project.section] ??
                      project.section}
                  </p>
                  <h2 className="mt-1 font-semibold text-black truncate">{project.title}</h2>
                  <p className="mt-0.5 text-xs text-black/60">
                    /{sectionToPillar[project.section] ?? "?"}/{project.slug}
                  </p>
                  <p className="mt-2 text-xs text-black/50">
                    {project.published ? "Published" : "Draft"} · {project.media?.length ?? 0} media
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={`/admin/work/preview/${project.id}`}
                    className="btn btn-ghost text-xs"
                  >
                    Preview
                  </Link>
                  <Link
                    href={`/admin/work/${project.id}`}
                    className="btn btn-ghost text-xs"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
