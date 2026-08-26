"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  type DesignSpecimenBlock,
} from "@/lib/design-section-settings";
import { DESIGN_PORTFOLIO_CATEGORIES } from "@/lib/design/categories";
import {
  DESIGN_PORTFOLIO_STATUSES,
  DESIGN_PORTFOLIO_STATUS_LABEL,
  type DesignPortfolioStatusId,
} from "@/lib/design/status";
import { getPublicR2Url } from "@/lib/r2";
import {
  DESIGN_CASE_STUDY_SECTION_LABEL,
  DESIGN_CASE_STUDY_SECTION_ORDER,
  type DesignCaseStudy,
} from "@/lib/design/case-study";

type CoverMedia = {
  id: string;
  alt: string | null;
  keyFull: string | null;
  keyThumb: string | null;
};

type WorkOption = { id: string; title: string; slug: string };

type DesignProject = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  brief: string | null;
  approach: string | null;
  outcome: string | null;
  problemStatement: string | null;
  year: number | null;
  clientName: string | null;
  role: string | null;
  timelineLabel: string | null;
  teamLabel: string | null;
  platformLabel: string | null;
  toolsLabel: string | null;
  industryLabel: string | null;
  projectTypeLabel: string | null;
  status: DesignPortfolioStatusId;
  disciplines: string[];
  published: boolean;
  featured: boolean;
  sortOrder: number;
  coverMediaId: string | null;
  coverMedia: CoverMedia | null;
  specimenBlocks: unknown;
  caseStudy: unknown;
  relatedWorkProjectId: string | null;
  relatedWorkProject: WorkOption | null;
  relatedServicesEnabled: boolean;
  relatedServicesIntro: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

type Tone = "minimal" | "editorial" | "bold" | "warm";

function mediaUrl(key: string | null | undefined): string {
  if (!key) return "";
  if (/^(https?:|data:|blob:|\/)/i.test(key)) return key;
  return getPublicR2Url(key);
}

function newBlock(): DesignSpecimenBlock {
  return {
    id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    imageKey: "",
    caption: "",
    applicationLabel: "",
    sortOrder: 0,
  };
}

export default function AdminDesignEditClient() {
  const params = useParams();
  const id = String(params.id ?? "");
  const router = useRouter();

  const [project, setProject] = useState<DesignProject | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [brief, setBrief] = useState("");
  const [approach, setApproach] = useState("");
  const [outcome, setOutcome] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [clientName, setClientName] = useState("");
  const [role, setRole] = useState("");
  const [timelineLabel, setTimelineLabel] = useState("");
  const [teamLabel, setTeamLabel] = useState("");
  const [platformLabel, setPlatformLabel] = useState("");
  const [toolsLabel, setToolsLabel] = useState("");
  const [industryLabel, setIndustryLabel] = useState("");
  const [projectTypeLabel, setProjectTypeLabel] = useState("");
  const [portfolioStatus, setPortfolioStatus] = useState<DesignPortfolioStatusId>("PRODUCT_CONCEPT");
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [published, setPublished] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [coverMediaId, setCoverMediaId] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [blocks, setBlocks] = useState<DesignSpecimenBlock[]>([]);
  const [caseStudy, setCaseStudy] = useState<DesignCaseStudy>({});
  const [relatedWorkProjectId, setRelatedWorkProjectId] = useState("");
  const [workOptions, setWorkOptions] = useState<WorkOption[]>([]);
  const [relatedServicesEnabled, setRelatedServicesEnabled] = useState(false);
  const [relatedServicesIntro, setRelatedServicesIntro] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [tone, setTone] = useState<Tone>("minimal");
  const [aiBusy, setAiBusy] = useState<string>("");
  const [aiError, setAiError] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, workRes] = await Promise.all([
        fetch(`/api/admin/design-projects/${id}`, { credentials: "include" }),
        fetch("/api/admin/work-projects", { credentials: "include" }),
      ]);
      const projData = (await projRes.json()) as { ok?: boolean; project?: DesignProject; error?: string };
      if (!projRes.ok || !projData.project) throw new Error(projData.error || "Load failed");
      const p = projData.project;
      setProject(p);
      setTitle(p.title);
      setSlug(p.slug);
      setSummary(p.summary ?? "");
      setBrief(p.brief ?? "");
      setApproach(p.approach ?? "");
      setOutcome(p.outcome ?? "");
      setProblemStatement(p.problemStatement ?? "");
      setYear(p.year ?? "");
      setClientName(p.clientName ?? "");
      setRole(p.role ?? "");
      setTimelineLabel(p.timelineLabel ?? "");
      setTeamLabel(p.teamLabel ?? "");
      setPlatformLabel(p.platformLabel ?? "");
      setToolsLabel(p.toolsLabel ?? "");
      setIndustryLabel(p.industryLabel ?? "");
      setProjectTypeLabel(p.projectTypeLabel ?? "");
      setPortfolioStatus(p.status ?? "PRODUCT_CONCEPT");
      setDisciplines(p.disciplines ?? []);
      setPublished(p.published);
      setFeatured(p.featured);
      setSortOrder(p.sortOrder);
      setCoverMediaId(p.coverMediaId ?? "");
      setCoverPreview(mediaUrl(p.coverMedia?.keyFull ?? p.coverMedia?.keyThumb));
      const rawBlocks = Array.isArray(p.specimenBlocks) ? p.specimenBlocks : [];
      setBlocks(
        rawBlocks.map((b, i) => {
          const o = b as Partial<DesignSpecimenBlock>;
          return {
            id: o.id || `b-${i}`,
            imageKey: o.imageKey || "",
            caption: o.caption || "",
            applicationLabel: o.applicationLabel || "",
            sortOrder: typeof o.sortOrder === "number" ? o.sortOrder : i,
          };
        })
      );
      setCaseStudy(
        p.caseStudy && typeof p.caseStudy === "object" && !Array.isArray(p.caseStudy)
          ? (p.caseStudy as DesignCaseStudy)
          : {}
      );
      setRelatedWorkProjectId(p.relatedWorkProjectId ?? "");
      setRelatedServicesEnabled(p.relatedServicesEnabled);
      setRelatedServicesIntro(p.relatedServicesIntro ?? "");
      setSeoTitle(p.seoTitle ?? "");
      setSeoDescription(p.seoDescription ?? "");

      if (workRes.ok) {
        const w = (await workRes.json()) as { projects?: Array<{ id: string; title: string; slug: string }> };
        setWorkOptions(
          (w.projects ?? []).map((x) => ({ id: x.id, title: x.title, slug: x.slug }))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setStatus("saving");
    setError("");
    try {
      const res = await fetch(`/api/admin/design-projects/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          summary,
          brief,
          approach,
          outcome,
          problemStatement,
          year: year === "" ? null : Number(year),
          clientName,
          role,
          timelineLabel,
          teamLabel,
          platformLabel,
          toolsLabel,
          industryLabel,
          projectTypeLabel,
          status: portfolioStatus,
          disciplines,
          published,
          featured,
          sortOrder,
          coverMediaId: coverMediaId.trim() || null,
          specimenBlocks: blocks.map((b, i) => ({ ...b, sortOrder: i })),
          caseStudy,
          relatedWorkProjectId: relatedWorkProjectId || null,
          relatedServicesEnabled,
          relatedServicesIntro,
          seoTitle,
          seoDescription,
        }),
      });
      const d = (await res.json()) as { ok?: boolean; project?: DesignProject; error?: string };
      if (!res.ok || !d.project) throw new Error(d.error || "Save failed");
      setProject(d.project);
      setCoverPreview(mediaUrl(d.project.coverMedia?.keyFull ?? d.project.coverMedia?.keyThumb));
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setStatus("error");
    }
  }

  async function remove() {
    if (!confirm("Delete this design project?")) return;
    const res = await fetch(`/api/admin/design-projects/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) router.push("/admin/design");
  }

  async function runAi(fieldKey: "summary" | "brief" | "approach" | "outcome", mode: "generate" | "rewrite") {
    setAiError("");
    setAiBusy(`${fieldKey}:${mode}`);
    const existingValue =
      fieldKey === "summary"
        ? summary
        : fieldKey === "brief"
          ? brief
          : fieldKey === "approach"
            ? approach
            : outcome;
    try {
      const res = await fetch("/api/admin/design-projects/generate-copy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldKey,
          mode,
          tonePreset: tone,
          title,
          existingValue,
          context: [clientName, role, disciplines.join(", "), summary].filter(Boolean).join(" · "),
        }),
      });
      const d = (await res.json()) as { value?: string; error?: string; code?: string };
      if (!res.ok || !d.value) {
        if (res.status === 401 || d.code === "admin_session") {
          throw new Error("Admin session expired. Open /admin/login, sign in again, then retry.");
        }
        throw new Error(d.error || "AI failed");
      }
      if (fieldKey === "summary") setSummary(d.value);
      if (fieldKey === "brief") setBrief(d.value);
      if (fieldKey === "approach") setApproach(d.value);
      if (fieldKey === "outcome") setOutcome(d.value);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI failed");
    } finally {
      setAiBusy("");
    }
  }

  function toggleDiscipline(id: string) {
    setDisciplines((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-white/50">Loading…</div>;
  }
  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-red-300">{error || "Not found"}</p>
        <Link href="/admin/design" className="btn btn-ghost mt-4">
          Back
        </Link>
      </div>
    );
  }

  const fieldBox = (
    label: string,
    fieldKey: "summary" | "brief" | "approach" | "outcome",
    value: string,
    setValue: (v: string) => void,
    rows = 3
  ) => (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm text-white/70">{label}</label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg border border-white/10 bg-black/50 px-2 py-1 text-xs text-white"
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
          >
            <option value="minimal">Minimal</option>
            <option value="editorial">Editorial</option>
            <option value="bold">Bold</option>
            <option value="warm">Warm</option>
          </select>
          <button
            type="button"
            className="rounded-lg border border-white/15 px-2 py-1 text-[0.65rem] uppercase tracking-wider text-white/70"
            disabled={!!aiBusy}
            onClick={() => void runAi(fieldKey, "generate")}
          >
            {aiBusy === `${fieldKey}:generate` ? "…" : "Regenerate"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/15 px-2 py-1 text-[0.65rem] uppercase tracking-wider text-white/70"
            disabled={!!aiBusy}
            onClick={() => void runAi(fieldKey, "rewrite")}
          >
            {aiBusy === `${fieldKey}:rewrite` ? "…" : "Rewrite with tone"}
          </button>
        </div>
      </div>
      <textarea
        rows={rows}
        className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/design" className="text-xs uppercase tracking-[0.2em] text-white/45">
            ← Design
          </Link>
          <h1 className="mt-2 font-display text-2xl text-white">{title || "Untitled"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/design/${slug}`}
            className="btn btn-ghost"
          >
            View public
          </a>
          <button type="button" className="btn btn-primary" onClick={() => void save()}>
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save"}
          </button>
          <button type="button" className="btn btn-ghost text-red-300" onClick={() => void remove()}>
            Delete
          </button>
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}
      {aiError ? <p className="mb-4 text-sm text-red-300">{aiError}</p> : null}

      <div className="space-y-6">
        <label className="block text-sm text-white/70">
          Title
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm text-white/70">
          Slug
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-4 text-sm text-white/70">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Published
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            Featured
          </label>
          <label className="flex items-center gap-2">
            Sort
            <input
              type="number"
              className="w-20 rounded-lg border border-white/10 bg-black/50 px-2 py-1 text-white"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            />
          </label>
        </div>

        <div>
          <p className="text-sm text-white/70">Categories</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {DESIGN_PORTFOLIO_CATEGORIES.map((d) => (
              <label key={d.id} className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={disciplines.includes(d.id)}
                  onChange={() => toggleDiscipline(d.id)}
                />
                {d.label}
              </label>
            ))}
          </div>
        </div>

        <label className="block text-sm text-white/70">
          Portfolio status
          <select
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
            value={portfolioStatus}
            onChange={(e) => setPortfolioStatus(e.target.value as DesignPortfolioStatusId)}
          >
            {DESIGN_PORTFOLIO_STATUSES.map((s) => (
              <option key={s} value={s}>
                {DESIGN_PORTFOLIO_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-white/70">
            Client
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </label>
          <label className="block text-sm text-white/70">
            Role
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </label>
          <label className="block text-sm text-white/70">
            Year
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
              value={year}
              onChange={(e) => setYear(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </label>
          <label className="block text-sm text-white/70">
            Timeline
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
              value={timelineLabel}
              onChange={(e) => setTimelineLabel(e.target.value)}
            />
          </label>
          <label className="block text-sm text-white/70">
            Platform
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
              value={platformLabel}
              onChange={(e) => setPlatformLabel(e.target.value)}
            />
          </label>
          <label className="block text-sm text-white/70">
            Tools
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
              value={toolsLabel}
              onChange={(e) => setToolsLabel(e.target.value)}
            />
          </label>
          <label className="block text-sm text-white/70">
            Team
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
              value={teamLabel}
              onChange={(e) => setTeamLabel(e.target.value)}
            />
          </label>
          <label className="block text-sm text-white/70">
            Industry
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
              value={industryLabel}
              onChange={(e) => setIndustryLabel(e.target.value)}
            />
          </label>
          <label className="block text-sm text-white/70 sm:col-span-2">
            Project type
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
              value={projectTypeLabel}
              onChange={(e) => setProjectTypeLabel(e.target.value)}
            />
          </label>
          <label className="block text-sm text-white/70 sm:col-span-2">
            Cover media ID
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
              value={coverMediaId}
              onChange={(e) => setCoverMediaId(e.target.value)}
              placeholder="Paste MediaAsset id from Media library"
            />
          </label>
        </div>
        {coverPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverPreview} alt="" className="h-40 w-40 rounded-xl object-cover" />
        ) : null}

        <label className="block text-sm text-white/70">
          Problem statement
          <textarea
            rows={3}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
          />
        </label>

        {fieldBox("Summary", "summary", summary, setSummary, 2)}
        {fieldBox("Brief", "brief", brief, setBrief)}
        {fieldBox("Approach", "approach", approach, setApproach)}
        {fieldBox("Outcome", "outcome", outcome, setOutcome)}

        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-white/70">Case study sections</p>
          <p className="text-xs text-white/45">
            Lines starting with TODO are stripped from public pages. Keep drafts unpublished until ready.
          </p>
          {DESIGN_CASE_STUDY_SECTION_ORDER.map((key) => {
            const value = caseStudy[key];
            const text = Array.isArray(value) ? value.join("\n") : value ?? "";
            return (
              <label key={key} className="block text-xs text-white/60">
                {DESIGN_CASE_STUDY_SECTION_LABEL[key]}
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                  value={text}
                  onChange={(e) =>
                    setCaseStudy((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                />
              </label>
            );
          })}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-white/70">Specimen blocks</p>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setBlocks((prev) => [...prev, newBlock()])}
            >
              Add block
            </button>
          </div>
          <div className="mt-3 space-y-4">
            {blocks.map((b, index) => (
              <div key={b.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs text-white/60 sm:col-span-2">
                    Image key or URL
                    <input
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                      value={b.imageKey}
                      onChange={(e) =>
                        setBlocks((prev) =>
                          prev.map((x, i) => (i === index ? { ...x, imageKey: e.target.value } : x))
                        )
                      }
                    />
                  </label>
                  <label className="block text-xs text-white/60">
                    Application label
                    <input
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                      value={b.applicationLabel}
                      onChange={(e) =>
                        setBlocks((prev) =>
                          prev.map((x, i) =>
                            i === index ? { ...x, applicationLabel: e.target.value } : x
                          )
                        )
                      }
                      placeholder="Stationery, packaging…"
                    />
                  </label>
                  <label className="block text-xs text-white/60">
                    Caption
                    <input
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                      value={b.caption}
                      onChange={(e) =>
                        setBlocks((prev) =>
                          prev.map((x, i) => (i === index ? { ...x, caption: e.target.value } : x))
                        )
                      }
                    />
                  </label>
                </div>
                {b.imageKey ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(b.imageKey)}
                    alt=""
                    className="mt-3 h-28 rounded-lg object-cover"
                  />
                ) : null}
                <button
                  type="button"
                  className="mt-3 text-xs text-red-300"
                  onClick={() => setBlocks((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <label className="block text-sm text-white/70">
          Related photography project
          <select
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
            value={relatedWorkProjectId}
            onChange={(e) => setRelatedWorkProjectId(e.target.value)}
          >
            <option value="">None</option>
            {workOptions.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={relatedServicesEnabled}
            onChange={(e) => setRelatedServicesEnabled(e.target.checked)}
          />
          Show related services CTA
        </label>
        {relatedServicesEnabled ? (
          <label className="block text-sm text-white/70">
            Services intro
            <textarea
              rows={2}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
              value={relatedServicesIntro}
              onChange={(e) => setRelatedServicesIntro(e.target.value)}
            />
          </label>
        ) : null}

        <label className="block text-sm text-white/70">
          SEO title
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm text-white/70">
          SEO description
          <textarea
            rows={2}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
          />
        </label>

        <button type="button" className="btn btn-primary" onClick={() => void save()}>
          Save project
        </button>
      </div>
    </div>
  );
}
