"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import HubCaseStudySectionsEditor, {
  normalizeHubSections,
  type HubCaseStudySectionsEditorHandle,
} from "@/components/admin/HubCaseStudySectionsEditor";
import R2BrowserModal from "@/components/admin/R2BrowserModal";
import {
  caseStudyModeFromCategories,
  extractPrototypeUrl,
  isLivePrototypeUrl,
  labelForCaseStudyMode,
  mergePrototypeIntoPlatforms,
  normalizePrototypeUrl,
  prototypeDisplayHost,
  syncCategoriesWithCaseStudyMode,
  type CaseStudyMode,
  type HubSectionDraft,
} from "@/lib/dual-brand/case-study-template";
import type { HubJournalPost, HubProject } from "@/lib/dual-brand/studio-hub";
import { distributionStatus } from "@/lib/dual-brand/studio-hub";
import {
  SECTION_TONE_OPTIONS,
  readStoredAiVoice,
  writeStoredAiVoice,
  type SectionCopyTone,
} from "@/lib/dual-brand/section-copy-tone";
import { preferPortfolioWebFullKey } from "@/lib/portfolio-web-full";
import { normalizePortfolioVideoKey } from "@/lib/video-port/keys";
import { getPublicR2Url } from "@/lib/r2";

type Props = {
  initial?: HubProject | null;
};

function splitCsv(value: string) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function slugifyLocal(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function StatusChip({
  label,
  state,
}: {
  label: string;
  state: "off" | "draft" | "live";
}) {
  const tone =
    state === "live"
      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
      : state === "draft"
        ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
        : "border-white/15 bg-white/5 text-white/45";
  const text = state === "live" ? "Live" : state === "draft" ? "Draft" : "Off";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] ${tone}`}
    >
      {label}
      <span className="tracking-normal opacity-90">{text}</span>
    </span>
  );
}

const STATUSES = ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"];

type ProjectCopyFieldKey =
  | "summary"
  | "seoTitle"
  | "metaDescription"
  | "overviewExtended"
  | "approach"
  | "description"
  | "locationContext";

const AI_BTN =
  "inline-flex items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-emerald-100 hover:bg-emerald-500/25 hover:border-emerald-300/60 disabled:opacity-40";

const AI_BTN_FIELD =
  "inline-flex items-center justify-center rounded-md border border-white/20 bg-white/5 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-40";

/** Stable module-level — must NOT be defined inside StudioHubEditor (remounts steal focus). */
function AiFieldLabel({
  label,
  busy,
  disabled,
  onRegenerate,
  buttonLabel = "AI",
}: {
  label: string;
  busy: boolean;
  disabled: boolean;
  onRegenerate: () => void;
  buttonLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span>{label}</span>
      <button
        type="button"
        className={AI_BTN_FIELD}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRegenerate();
        }}
      >
        {busy ? "…" : buttonLabel}
      </button>
    </div>
  );
}

function AiNotesBox({
  value,
  onChange,
  onApply,
  busy,
  disabled,
  placeholder = "Add guidance, then Apply notes to update the field above.",
  buttonLabel = "Apply notes",
}: {
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  busy: boolean;
  disabled: boolean;
  placeholder?: string;
  buttonLabel?: string;
}) {
  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[0.7rem] uppercase tracking-[0.16em] text-white/45">AI notes</span>
        <button
          type="button"
          className={AI_BTN_FIELD}
          disabled={disabled || busy}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onApply();
          }}
        >
          {busy ? "…" : buttonLabel}
        </button>
      </div>
      <textarea
        className="mt-1.5 min-h-[56px] w-full rounded-lg border border-dashed border-white/20 bg-black/30 px-3 py-2 text-[0.85rem] text-white/85 placeholder:text-white/35"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function PrototypeLinkField({
  value,
  onChange,
  placement,
}: {
  value: string;
  onChange: (next: string) => void;
  placement: "top" | "bottom";
}) {
  const live = isLivePrototypeUrl(value);
  const host = prototypeDisplayHost(value);
  return (
    <div
      className={
        placement === "top"
          ? "mt-5 rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 shadow-[0_0_40px_rgba(255,248,235,0.04)]"
          : "mt-5 rounded-2xl border border-white/12 bg-white/[0.03] p-4"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/50">
            Live prototype
          </p>
          <p className="mt-1 text-sm text-white/70">
            {placement === "top"
              ? "Canonical URL for the working prototype."
              : "Same URL — insert a Live prototype section in the case study to place it in the post."}
          </p>
        </div>
        <span
          className={
            live
              ? "inline-flex items-center rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-emerald-100"
              : "inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-white/45"
          }
        >
          {live ? "Linked" : "Not set"}
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="w-full flex-1 rounded-lg border border-white/15 bg-black/50 px-3 py-2.5 font-mono text-sm text-white placeholder:text-white/30"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onChange(normalizePrototypeUrl(value))}
          placeholder="https://www.figma.com/proto/… or your staging URL"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
        />
        {live ? (
          <a
            href={normalizePrototypeUrl(value)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white px-4 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-black no-underline hover:bg-white/90"
          >
            Open →
          </a>
        ) : (
          <span className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white/10 px-4 py-2.5 text-[0.68rem] uppercase tracking-[0.16em] text-white/30">
            Open →
          </span>
        )}
      </div>
      <p className="mt-2 text-[0.7rem] leading-relaxed text-white/40">
        {live
          ? `${host} is the default destination. Place it in the post with Insert prototype, then move that section.`
          : "Paste a full URL, then insert a Live prototype section where it should appear in the case study."}
      </p>
    </div>
  );
}

function mediaPreviewSrc(value: string) {
  const v = value.trim();
  if (!v) return "";
  if (/^(https?:|data:|blob:)/i.test(v) || v.startsWith("/")) return v;
  return getPublicR2Url(v.replace(/^\/+/, ""));
}

export default function StudioHubEditor({ initial }: Props) {
  const router = useRouter();
  const [id, setId] = useState(initial?.id || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [summary, setSummary] = useState(initial?.summary || "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle || "");
  const [year, setYear] = useState(initial?.year || new Date().getFullYear());
  const [status, setStatus] = useState(initial?.status || "DRAFT");
  const [categories, setCategories] = useState((initial?.categories || []).join(", "));
  const [caseStudyMode, setCaseStudyMode] = useState<CaseStudyMode>(() =>
    caseStudyModeFromCategories(initial?.categories)
  );
  const [disciplines, setDisciplines] = useState((initial?.disciplines || []).join(", "));
  const [tools, setTools] = useState((initial?.tools || []).join(", "));
  const [heroImage, setHeroImage] = useState(initial?.heroImage || "");
  const [thumbnailImage, setThumbnailImage] = useState(initial?.thumbnailImage || "");
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription || "");

  const [publishBrightline, setPublishBrightline] = useState(
    initial?.publishBrightline ?? false
  );
  const [publishMirotech, setPublishMirotech] = useState(initial?.publishMirotech ?? true);
  const [featuredBrightline, setFeaturedBrightline] = useState(
    initial?.featuredBrightline ?? false
  );
  const [featuredMirotech, setFeaturedMirotech] = useState(initial?.featuredMirotech ?? false);
  const [brightlineExternalId, setBrightlineExternalId] = useState(
    initial?.brightlineExternalId || ""
  );
  const [brightlineSection, setBrightlineSection] = useState(initial?.brightlineSection || "");

  const photo = (initial?.photoNarrative || {}) as {
    overview?: string;
    approach?: string;
    location?: string;
    notes?: string;
  };
  const [photoOverview, setPhotoOverview] = useState(photo.overview || "");
  const [photoApproach, setPhotoApproach] = useState(photo.approach || "");
  const [photoLocation, setPhotoLocation] = useState(photo.location || "");
  const [photoNotes, setPhotoNotes] = useState(photo.notes || "");

  const [challenge, setChallenge] = useState(initial?.challenge || "");
  const [outcome, setOutcome] = useState(initial?.outcome || "");
  const [projectDisclaimer, setProjectDisclaimer] = useState(
    initial?.projectDisclaimer || ""
  );
  const [role, setRole] = useState(initial?.role || "");
  const [duration, setDuration] = useState(initial?.duration || "");
  const [whatsNext, setWhatsNext] = useState(initial?.whatsNext || "");

  const [aiVoice, setAiVoice] = useState<SectionCopyTone>("product");
  const sectionsEditorRef = useRef<HubCaseStudySectionsEditorHandle>(null);

  useEffect(() => {
    setAiVoice(readStoredAiVoice());
  }, []);

  type CoreMetaFieldKey =
    | "subtitle"
    | "categories"
    | "disciplines"
    | "tools"
    | "challenge"
    | "outcome"
    | "projectDisclaimer"
    | "role"
    | "duration"
    | "whatsNext";

  function metaFieldContext() {
    return [
      summary.trim() && `Summary: ${summary}`,
      subtitle.trim() && `Subtitle: ${subtitle}`,
      categories.trim() && `Categories: ${categories}`,
      disciplines.trim() && `Disciplines: ${disciplines}`,
      tools.trim() && `Tools: ${tools}`,
      role.trim() && `Role: ${role}`,
      projectDisclaimer.trim() && `Disclaimer: ${projectDisclaimer}`,
      duration.trim() && `Duration: ${duration}`,
      challenge.trim() && `Challenge: ${challenge}`,
      outcome.trim() && `Outcome: ${outcome}`,
      whatsNext.trim() && `What's next (existing): ${whatsNext}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function fetchCoreMetaField(
    fieldKey: CoreMetaFieldKey,
    existingValue: string,
    contextOverride?: string,
    opts?: { composeFromNotes?: boolean; mergeMode?: boolean }
  ): Promise<string> {
    const res = await fetch("/api/admin/studio-hub/generate-section-copy", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "core-field",
        fieldKey,
        title,
        caseStudyMode,
        tone: aiVoice,
        existingValue,
        context: contextOverride ?? metaFieldContext(),
        composeFromNotes: opts?.composeFromNotes || undefined,
        mergeMode: opts?.mergeMode || undefined,
      }),
    });
    const data = (await res.json()) as { value?: string; error?: string; code?: string };
    if (!res.ok || !data.value) {
      if (res.status === 401 || data.code === "admin_session") {
        throw new Error("Admin session expired. Open /admin/login, sign in again, then retry.");
      }
      throw new Error(data.error || "AI generation failed.");
    }
    return data.value;
  }

  const initialBlog =
    initial?.journalPostsFull?.[0] ||
    (null as HubJournalPost | null);
  const [blog, setBlog] = useState<HubJournalPost | null>(initialBlog);
  const [blogTitle, setBlogTitle] = useState(initialBlog?.title || "");
  const [blogSlug, setBlogSlug] = useState(initialBlog?.slug || "");
  const [blogExcerpt, setBlogExcerpt] = useState(initialBlog?.excerpt || "");
  const [blogBody, setBlogBody] = useState(initialBlog?.body || "");
  const [blogStatus, setBlogStatus] = useState(initialBlog?.status || "DRAFT");
  const [blogPrimarySite, setBlogPrimarySite] = useState(initialBlog?.primarySite || "BOTH");
  const [blogTitleBl, setBlogTitleBl] = useState(initialBlog?.titleBrightline || "");
  const [blogExcerptBl, setBlogExcerptBl] = useState(initialBlog?.excerptBrightline || "");
  const [blogBodyBl, setBlogBodyBl] = useState(initialBlog?.bodyBrightline || "");
  const [blogHero, setBlogHero] = useState(initialBlog?.heroImage || "");
  const [blogHeroBl, setBlogHeroBl] = useState(initialBlog?.heroImageBrightline || "");
  const [sections, setSections] = useState<HubSectionDraft[]>(() =>
    normalizeHubSections(initial?.sections)
  );
  const [prototypeUrl, setPrototypeUrl] = useState(
    () => extractPrototypeUrl(initial?.platforms)
  );
  const [platformsCsv, setPlatformsCsv] = useState(() =>
    (initial?.platforms || []).filter((p) => !/^https?:\/\//i.test(p)).join(", ")
  );
  const [r2PickTarget, setR2PickTarget] = useState<
    | "hero"
    | "thumb"
    | "blogHero"
    | "blogHeroBl"
    | {
        kind: "section-image" | "section-gallery" | "section-video" | "section-video-poster";
        index: number;
      }
    | null
  >(null);

  const [saving, setSaving] = useState(false);
  const [blogBusy, setBlogBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  /** Per-field AI notes — regenerated copy must ingest these as requirements. */
  const [aiNotes, setAiNotes] = useState<Record<string, string>>({});

  function noteFor(key: string) {
    return aiNotes[key] || "";
  }

  function setNoteFor(key: string, value: string) {
    setAiNotes((prev) => ({ ...prev, [key]: value }));
  }

  function projectCopyBrief() {
    return {
      projectTitle: title.trim() || undefined,
      projectType: splitCsv(categories)[0] || undefined,
      location: photoLocation.trim() || undefined,
      whatWasPhotographed: photoOverview.trim() || undefined,
      visualApproach: photoApproach.trim() || undefined,
      notes: [
        summary.trim(),
        photoNotes.trim(),
        disciplines.trim() ? `Disciplines: ${disciplines}` : "",
        tools.trim() ? `Tools: ${tools}` : "",
        year ? `Year: ${year}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      projectGoal: challenge.trim() || undefined,
    };
  }

  function projectExistingCopyValues() {
    return {
      summary,
      seoTitle,
      metaDescription: seoDescription,
      overviewExtended: photoOverview,
      approach: photoApproach,
      description: photoNotes,
      locationContext: photoLocation,
      opening: summary,
    };
  }

  async function fetchProjectCopyField(
    fieldKey: ProjectCopyFieldKey,
    opts?: { sourceText?: string; editorNotes?: string; mergeMode?: boolean }
  ): Promise<string> {
    const editorNotes = opts?.editorNotes?.trim() || "";
    const sourceText = opts?.sourceText?.trim() || "";
    const mergeMode = Boolean(opts?.mergeMode && editorNotes);
    const composeFromNotes = Boolean(editorNotes);
    const useRewrite = !composeFromNotes && Boolean(sourceText);
    const brief = projectCopyBrief();
    if (editorNotes) {
      brief.notes = [
        mergeMode
          ? `MERGE editor notes into ${fieldKey} (every note must appear in the result):\n${editorNotes}`
          : `MANDATORY editor notes for ${fieldKey} (must be reflected in the new copy):\n${editorNotes}`,
        brief.notes ? `Other project context:\n${brief.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    }
    const res = await fetch("/api/admin/projects/generate-copy", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(brightlineExternalId.trim()
          ? { projectId: brightlineExternalId.trim() }
          : {}),
        // Notes → compose (single_field + mandatory notes). Draft-only → rewrite. Empty → generate.
        mode: useRewrite ? "rewrite_field" : "single_field",
        fieldKey,
        tonePreset: "Quiet luxury",
        brief,
        existingValues: projectExistingCopyValues(),
        composeFromNotes: composeFromNotes || undefined,
        mergeMode: mergeMode || undefined,
        ...(useRewrite
          ? { sourceText }
          : composeFromNotes
            ? {
                sourceText: [
                  mergeMode
                    ? `MERGE these editor notes into the prior draft for ${fieldKey}. Preserve useful substance from the draft; every note must be explicitly reflected (e.g. case-study-only framing):\n${editorNotes}`
                    : `MANDATORY editor notes (compose a brand-new ${fieldKey} that fully reflects these):\n${editorNotes}`,
                  sourceText
                    ? mergeMode
                      ? `Prior draft to merge into:\n${sourceText}`
                      : `Prior draft (optional reference only — do not lightly polish; write new copy):\n${sourceText}`
                    : "",
                ]
                  .filter(Boolean)
                  .join("\n\n"),
              }
            : {}),
      }),
    });
    const data = (await res.json()) as {
      value?: string;
      error?: string;
      code?: string;
    };
    if (!res.ok || !data.value) {
      if (res.status === 401 || data.code === "admin_session") {
        throw new Error("Admin session expired. Open /admin/login, sign in again, then retry.");
      }
      throw new Error(data.error || "AI generation failed.");
    }
    return data.value;
  }

  async function applyNotesToProjectField(
    fieldKey: ProjectCopyFieldKey,
    noteKey: string,
    existing: string,
    apply: (value: string) => void
  ) {
    const editorNotes = noteFor(noteKey).trim();
    if (!editorNotes) {
      setError("Add AI notes before applying them to this field.");
      return;
    }
    if (!title.trim()) {
      setError("Add a project title before generating AI copy.");
      return;
    }
    if (!confirm("Apply notes into this field? The field above will be updated to include your notes.")) {
      return;
    }
    const busyKey = `${noteKey}:notes`;
    setAiBusy(busyKey);
    setError("");
    setMessage("");
    try {
      const value = await fetchProjectCopyField(fieldKey, {
        sourceText: existing,
        editorNotes,
        mergeMode: true,
      });
      apply(value);
      setMessage(`Applied notes into ${fieldKey}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI generation failed.");
    } finally {
      setAiBusy("");
    }
  }

  async function applyNotesToCoreField(
    fieldKey: CoreMetaFieldKey,
    noteKey: string,
    existing: string,
    apply: (value: string) => void
  ) {
    const editorNotes = noteFor(noteKey).trim();
    if (!editorNotes) {
      setError("Add AI notes before applying them to this field.");
      return;
    }
    if (!title.trim()) {
      setError("Add a project title before generating AI copy.");
      return;
    }
    if (!confirm("Apply notes into this field? The field above will be updated to include your notes.")) {
      return;
    }
    const busyKey = `${noteKey}:notes`;
    setAiBusy(busyKey);
    setError("");
    setMessage("");
    try {
      const sectionHints = sections
        .map((s) => s.title?.trim())
        .filter(Boolean)
        .slice(0, 12)
        .join(" · ");
      const context = [
        metaFieldContext(),
        sectionHints ? `Case study sections: ${sectionHints}` : "",
        caseStudyMode ? `Case study mode: ${caseStudyMode}` : "",
        prototypeUrl.trim() ? `Prototype URL: ${prototypeUrl.trim()}` : "",
        `MERGE editor notes into ${fieldKey} — preserve useful substance from Existing; every note must be explicitly reflected:\n${editorNotes}`,
      ]
        .filter(Boolean)
        .join("\n");
      apply(
        await fetchCoreMetaField(fieldKey, existing, context, {
          composeFromNotes: true,
          mergeMode: true,
        })
      );
      setMessage(`Applied notes into ${fieldKey}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI generation failed.");
    } finally {
      setAiBusy("");
    }
  }

  async function applyNotesToBlogBody() {
    const editorNotes = noteFor("blog:bodyBl").trim();
    const source = blogBodyBl.trim() || blogBody.trim() || summary.trim();
    if (!editorNotes) {
      setError("Add AI notes before applying them to Brightline body.");
      return;
    }
    if (!source) {
      setError("Add a body draft or project summary before applying notes.");
      return;
    }
    if (!confirm("Apply notes into Brightline body?")) return;
    setAiBusy("blog:bodyBl:notes");
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/blog-posts/assist", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "polish",
          draft: {
            title: blogTitleBl.trim() || blogTitle || title,
            excerpt: blogExcerptBl.trim() || blogExcerpt,
            body: [
              `MERGE these editor notes into the prior draft. Preserve useful substance; every note must be explicitly reflected:\n${editorNotes}`,
              `Prior draft to merge into:\n${source}`,
            ].join("\n\n"),
          },
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        result?: { body?: string };
        error?: string;
      };
      if (!res.ok || !data.result?.body) {
        throw new Error(data.error || "AI generation failed.");
      }
      setBlogBodyBl(data.result.body);
      setMessage("Applied notes into Brightline body");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI generation failed.");
    } finally {
      setAiBusy("");
    }
  }

  async function runCoreMetaFieldAi(
    fieldKey: CoreMetaFieldKey,
    busyKey: string,
    existing: string,
    apply: (value: string) => void,
    opts?: { skipConfirm?: boolean; editorNotes?: string }
  ) {
    const editorNotes = (opts?.editorNotes ?? noteFor(busyKey)).trim();
    const regenerating = Boolean(existing.trim() || editorNotes);
    if (!opts?.skipConfirm && regenerating) {
      const msg = editorNotes
        ? "Compose a brand-new value that incorporates your AI notes?"
        : "This field already has content. Replace it with AI-generated copy?";
      if (!confirm(msg)) {
        return;
      }
    }
    if (!title.trim()) {
      setError("Add a project title before generating AI copy.");
      return;
    }
    setAiBusy(busyKey);
    setError("");
    setMessage("");
    try {
      const sectionHints = sections
        .map((s) => s.title?.trim())
        .filter(Boolean)
        .slice(0, 12)
        .join(" · ");
      const context = [
        metaFieldContext(),
        sectionHints ? `Case study sections: ${sectionHints}` : "",
        caseStudyMode ? `Case study mode: ${caseStudyMode}` : "",
        prototypeUrl.trim() ? `Prototype URL: ${prototypeUrl.trim()}` : "",
        editorNotes
          ? `MANDATORY editor notes for ${fieldKey} (compose brand-new copy that reflects these):\n${editorNotes}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      apply(await fetchCoreMetaField(fieldKey, existing, context, { composeFromNotes: Boolean(editorNotes) }));
      setMessage(
        editorNotes
          ? `Composed new ${fieldKey} from your notes`
          : regenerating
            ? `Regenerated ${fieldKey}`
            : `Generated ${fieldKey}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI generation failed.");
    } finally {
      setAiBusy("");
    }
  }

  async function runProjectFieldAi(
    fieldKey: ProjectCopyFieldKey,
    busyKey: string,
    existing: string,
    apply: (value: string) => void,
    opts?: { skipConfirm?: boolean; emptyOnly?: boolean; editorNotes?: string }
  ) {
    if (opts?.emptyOnly && existing.trim()) return false;
    const editorNotes = (opts?.editorNotes ?? noteFor(busyKey)).trim();
    const regenerating = Boolean(existing.trim() || editorNotes);
    if (!opts?.skipConfirm && !opts?.emptyOnly && regenerating) {
      const msg = editorNotes
        ? "Compose a brand-new value that incorporates your AI notes?"
        : "This field already has content. Rewrite it from the current draft?";
      if (!confirm(msg)) {
        return false;
      }
    }
    if (!title.trim()) {
      setError("Add a project title before generating AI copy.");
      return false;
    }
    setAiBusy(busyKey);
    setError("");
    setMessage("");
    try {
      const value = await fetchProjectCopyField(fieldKey, {
        sourceText: regenerating ? existing : undefined,
        editorNotes: editorNotes || undefined,
      });
      apply(value);
      if (!opts?.skipConfirm) {
        setMessage(
          editorNotes
            ? `Composed new ${fieldKey} from your notes`
            : regenerating
              ? `Regenerated ${fieldKey} from draft`
              : `Generated ${fieldKey}`
        );
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI generation failed.");
      return false;
    } finally {
      setAiBusy("");
    }
  }

  async function regenerateSummary() {
    await runProjectFieldAi("summary", "core:summary", summary, setSummary);
  }

  async function regenerateTools() {
    await runCoreMetaFieldAi("tools", "core:tools", tools, setTools);
  }

  async function generateCoreSection() {
    if (!title.trim()) {
      setError("Add a project title before generating AI copy.");
      return;
    }
    const targets: Array<{
      key: ProjectCopyFieldKey;
      existing: string;
      apply: (v: string) => void;
    }> = [
      { key: "summary", existing: summary, apply: setSummary },
      { key: "seoTitle", existing: seoTitle, apply: setSeoTitle },
      { key: "metaDescription", existing: seoDescription, apply: setSeoDescription },
    ];
    const empty = targets.filter((t) => !t.existing.trim());
    const replaceAll = empty.length === 0;
    if (
      replaceAll &&
      !confirm("Replace all Project core narrative fields (summary + SEO) with AI-generated copy?")
    ) {
      return;
    }
    const run = replaceAll ? targets : empty;
    setAiBusy("core:section");
    setError("");
    setMessage("");
    try {
      let filled = 0;
      for (const t of run) {
        const value = await fetchProjectCopyField(t.key);
        t.apply(value);
        filled += 1;
      }
      setMessage(
        replaceAll
          ? `Regenerated ${filled} core field${filled === 1 ? "" : "s"}`
          : `Filled ${filled} empty core field${filled === 1 ? "" : "s"}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI generation failed.");
    } finally {
      setAiBusy("");
    }
  }

  async function generateBrightlineSection() {
    if (!title.trim()) {
      setError("Add a project title before generating AI copy.");
      return;
    }
    const targets: Array<{
      key: ProjectCopyFieldKey;
      existing: string;
      apply: (v: string) => void;
    }> = [
      { key: "overviewExtended", existing: photoOverview, apply: setPhotoOverview },
      { key: "approach", existing: photoApproach, apply: setPhotoApproach },
      { key: "description", existing: photoNotes, apply: setPhotoNotes },
      { key: "locationContext", existing: photoLocation, apply: setPhotoLocation },
    ];
    const empty = targets.filter((t) => !t.existing.trim());
    const replaceAll = empty.length === 0;
    if (
      replaceAll &&
      !confirm(
        "Replace all Brightline narrative fields (overview, approach, location, notes) with AI-generated copy?"
      )
    ) {
      return;
    }
    const run = replaceAll ? targets : empty;
    setAiBusy("brightline:section");
    setError("");
    setMessage("");
    try {
      let filled = 0;
      for (const t of run) {
        const value = await fetchProjectCopyField(t.key);
        t.apply(value);
        filled += 1;
      }
      setMessage(
        replaceAll
          ? `Regenerated ${filled} Brightline field${filled === 1 ? "" : "s"}`
          : `Filled ${filled} empty Brightline field${filled === 1 ? "" : "s"}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI generation failed.");
    } finally {
      setAiBusy("");
    }
  }

  async function runDesignFieldAi(
    fieldKey: "challenge" | "outcome",
    busyKey: string,
    existing: string,
    apply: (value: string) => void,
    opts?: { skipConfirm?: boolean }
  ) {
    await runCoreMetaFieldAi(fieldKey, busyKey, existing, apply, opts);
  }

  async function generateMirotechSection() {
    if (!title.trim()) {
      setError("Add a project title before generating AI copy.");
      return;
    }

    const metaTargets: Array<{
      key: CoreMetaFieldKey;
      existing: string;
      apply: (value: string) => void;
    }> = [
      { key: "challenge", existing: challenge, apply: setChallenge },
      { key: "outcome", existing: outcome, apply: setOutcome },
      { key: "projectDisclaimer", existing: projectDisclaimer, apply: setProjectDisclaimer },
      { key: "role", existing: role, apply: setRole },
      { key: "duration", existing: duration, apply: setDuration },
      { key: "whatsNext", existing: whatsNext, apply: setWhatsNext },
    ];

    const emptyMeta = metaTargets.filter((t) => !t.existing.trim());
    const emptySectionBodies = sectionsEditorRef.current?.countEmptyBodies() ?? 0;
    const replaceAll = emptyMeta.length === 0 && emptySectionBodies === 0;

    if (
      replaceAll &&
      !confirm(
        `Replace all Mirotech copy (challenge, outcome, meta fields, and case study sections) using the ${aiVoice} AI voice?`
      )
    ) {
      return;
    }

    setAiBusy("mirotech:section");
    setError("");
    setMessage("");
    try {
      let filled = 0;
      const metaRun = replaceAll ? metaTargets : emptyMeta;
      const workingMeta = {
        challenge,
        outcome,
        projectDisclaimer,
        role,
        duration,
        whatsNext,
      };
      const workingContext = () =>
        [
          summary.trim() && `Summary: ${summary}`,
          subtitle.trim() && `Subtitle: ${subtitle}`,
          categories.trim() && `Categories: ${categories}`,
          disciplines.trim() && `Disciplines: ${disciplines}`,
          tools.trim() && `Tools: ${tools}`,
          workingMeta.role.trim() && `Role: ${workingMeta.role}`,
          workingMeta.projectDisclaimer.trim() &&
            `Disclaimer: ${workingMeta.projectDisclaimer}`,
          workingMeta.duration.trim() && `Duration: ${workingMeta.duration}`,
          workingMeta.challenge.trim() && `Challenge: ${workingMeta.challenge}`,
          workingMeta.outcome.trim() && `Outcome: ${workingMeta.outcome}`,
          workingMeta.whatsNext.trim() &&
            `What's next (existing): ${workingMeta.whatsNext}`,
        ]
          .filter(Boolean)
          .join("\n");

      for (const target of metaRun) {
        const value = await fetchCoreMetaField(
          target.key,
          replaceAll ? target.existing : "",
          workingContext()
        );
        if (target.key in workingMeta) {
          workingMeta[target.key as keyof typeof workingMeta] = value;
        }
        target.apply(value);
        filled += 1;
      }

      const sectionFilled =
        (await sectionsEditorRef.current?.generateAllBodies({
          replaceAll,
          tone: aiVoice,
        })) ?? 0;
      filled += sectionFilled;

      const toneLabel =
        SECTION_TONE_OPTIONS.find((option) => option.id === aiVoice)?.label || aiVoice;
      setMessage(
        replaceAll
          ? `Regenerated ${filled} Mirotech field${filled === 1 ? "" : "s"} (${toneLabel}).`
          : `Filled ${filled} empty Mirotech field${filled === 1 ? "" : "s"} (${toneLabel}).`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI generation failed.");
    } finally {
      setAiBusy("");
    }
  }

  async function polishBlogDraft(opts: {
    draftTitle: string;
    draftExcerpt: string;
    draftBody: string;
    skipConfirm?: boolean;
  }) {
    const { draftTitle, draftExcerpt, draftBody, skipConfirm } = opts;
    if (!draftBody.trim() && !draftExcerpt.trim() && !summary.trim()) {
      setError("Add blog excerpt or body text before polishing.");
      return false;
    }
    if (
      !skipConfirm &&
      (draftBody.trim() || draftExcerpt.trim()) &&
      !confirm("Replace blog excerpt/body with AI-polished versions?")
    ) {
      return false;
    }
    let polishedBody = draftBody.trim() || summary.trim();
    if (polishedBody) {
      const polishRes = await fetch("/api/admin/blog-posts/assist", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "polish",
          draft: {
            title: draftTitle || title,
            excerpt: draftExcerpt,
            body: polishedBody,
          },
        }),
      });
      const polishData = (await polishRes.json()) as {
        ok?: boolean;
        result?: { body?: string };
        error?: string;
      };
      if (!polishRes.ok || !polishData.result?.body) {
        throw new Error(polishData.error || "AI polish failed.");
      }
      polishedBody = polishData.result.body;
      setBlogBody(polishedBody);
    }
    const excerptRes = await fetch("/api/admin/blog-posts/assist", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "excerpt",
        draft: {
          title: draftTitle || title,
          excerpt: draftExcerpt,
          body: polishedBody || draftBody || summary,
        },
      }),
    });
    const excerptData = (await excerptRes.json()) as {
      ok?: boolean;
      result?: { excerpt?: string };
      error?: string;
    };
    if (excerptRes.ok && excerptData.result?.excerpt) {
      setBlogExcerpt(excerptData.result.excerpt);
    }
    return true;
  }

  async function generateBrightlineBlogBody() {
    const source = blogBodyBl.trim() || blogBody.trim() || summary.trim();
    const editorNotes = noteFor("blog:bodyBl").trim();
    if (!source && !editorNotes) {
      setError("Add Mirotech body, project summary, or AI notes before generating Brightline body.");
      return;
    }
    if ((blogBodyBl.trim() || editorNotes) && !confirm(
      editorNotes
        ? "Compose a brand-new Brightline body that incorporates your AI notes?"
        : "Replace Brightline body with AI-generated copy?"
    )) {
      return;
    }
    setAiBusy("blog:bodyBl");
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/blog-posts/assist", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "polish",
          draft: {
            title: blogTitleBl.trim() || blogTitle || title,
            excerpt: blogExcerptBl.trim() || blogExcerpt,
            body: [
              editorNotes
                ? `MANDATORY editor notes (compose brand-new Brightline body that reflects these):\n${editorNotes}`
                : "",
              source
                ? editorNotes
                  ? `Prior draft (optional reference only):\n${source}`
                  : source
                : "",
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        result?: { body?: string };
        error?: string;
      };
      if (!res.ok || !data.result?.body) {
        throw new Error(data.error || "AI generation failed.");
      }
      setBlogBodyBl(data.result.body);
      setMessage(editorNotes ? "Composed Brightline body from your notes" : "Generated Brightline body");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI generation failed.");
    } finally {
      setAiBusy("");
    }
  }

  async function polishBlogVersion() {
    if (!blog) return;
    setAiBusy("blog:polish");
    setError("");
    setMessage("");
    try {
      const ok = await polishBlogDraft({
        draftTitle: blogTitle || title,
        draftExcerpt: blogExcerpt,
        draftBody: blogBody,
      });
      if (ok) setMessage("Blog version polished");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI polish failed.");
    } finally {
      setAiBusy("");
    }
  }

  async function generateBlogThenPolish() {
    if (!id) {
      setError("Save the project first, then generate a blog version.");
      return;
    }
    if (!title.trim()) {
      setError("Add a project title before generating AI copy.");
      return;
    }
    setAiBusy("blog:generate");
    setBlogBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/studio-hub/${id}/blog`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        post?: HubJournalPost;
        created?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.post) throw new Error(data.error || "Blog create failed");
      setBlog(data.post);
      setBlogTitle(data.post.title);
      setBlogSlug(data.post.slug);
      setBlogExcerpt(data.post.excerpt);
      setBlogBody(data.post.body);
      setBlogStatus(data.post.status);
      setBlogPrimarySite(data.post.primarySite || "BOTH");
      setBlogTitleBl(data.post.titleBrightline || "");
      setBlogExcerptBl(data.post.excerptBrightline || "");
      setBlogBodyBl(data.post.bodyBrightline || "");
      setBlogHero(data.post.heroImage || "");
      setBlogHeroBl(data.post.heroImageBrightline || "");
      setAiBusy("blog:polish");
      await polishBlogDraft({
        draftTitle: data.post.title || title,
        draftExcerpt: data.post.excerpt || "",
        draftBody: data.post.body || "",
        skipConfirm: true,
      });
      setMessage(
        data.created
          ? "Blog version created and polished with AI"
          : "Opened existing blog version and polished with AI"
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Blog AI generation failed");
    } finally {
      setBlogBusy(false);
      setAiBusy("");
    }
  }

  const chips = useMemo(
    () =>
      distributionStatus({
        workStatus: status,
        publishBrightline,
        publishMirotech,
        blogStatus: blog?.status || (blogTitle ? blogStatus : null),
        blogPrimarySite: blog?.primarySite || blogPrimarySite,
      }),
    [status, publishBrightline, publishMirotech, blog, blogTitle, blogStatus, blogPrimarySite]
  );

  function applyCaseStudyMode(mode: CaseStudyMode) {
    setCaseStudyMode(mode);
    setCategories(syncCategoriesWithCaseStudyMode(categories, mode).join(", "));
  }

  function projectPayload() {
    return {
      title,
      slug: slug || slugifyLocal(title),
      subtitle,
      summary,
      year: Number(year) || new Date().getFullYear(),
      status,
      categories: syncCategoriesWithCaseStudyMode(categories, caseStudyMode),
      disciplines: splitCsv(disciplines),
      tools: splitCsv(tools),
      platforms: mergePrototypeIntoPlatforms(platformsCsv, prototypeUrl),
      publishBrightline,
      publishMirotech,
      featuredBrightline,
      featuredMirotech,
      featured: featuredMirotech,
      featuredOrder: 0,
      sortOrderMirotech: 0,
      sortOrderBrightline: 0,
      brightlineExternalId,
      brightlineSection,
      photoNarrative: {
        overview: photoOverview,
        approach: photoApproach,
        location: photoLocation,
        notes: photoNotes,
      },
      challenge,
      outcome,
      projectDisclaimer,
      role,
      duration,
      whatsNext,
      heroImage,
      thumbnailImage,
      seoTitle,
      seoDescription,
      sections: sections.map((section, index) => {
        const type = section.type || "text";
        const data: Record<string, unknown> = {
          ...(section.data && typeof section.data === "object" ? section.data : {}),
        };
        // Prototype sections must carry an href so Mirotech can render the CTA even when
        // the author relies on Project core (platforms) as the canonical URL.
        if (type === "prototype") {
          const override = String(data.href || data.url || "").trim();
          const fallback = normalizePrototypeUrl(prototypeUrl);
          if (!override && fallback && isLivePrototypeUrl(fallback)) {
            data.href = fallback;
          } else if (override) {
            data.href = normalizePrototypeUrl(override);
          }
          if (!String(data.label || "").trim()) {
            data.label = "View prototype";
          }
        }
        return {
          type,
          title: section.title || null,
          body: section.body || null,
          data: Object.keys(data).length > 0 ? data : null,
          sortOrder: index,
        };
      }),
    };
  }

  async function saveProject() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = projectPayload();
      const url = id ? `/api/admin/studio-hub/${id}` : "/api/admin/studio-hub";
      const method = id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; project?: HubProject; error?: string };
      if (!res.ok || !data.ok || !data.project) throw new Error(data.error || "Save failed");
      setMessage("Project saved");
      if (data.project.sections) {
        setSections(normalizeHubSections(data.project.sections));
      }
      if (data.project.platforms) {
        setPrototypeUrl(extractPrototypeUrl(data.project.platforms));
        setPlatformsCsv(
          data.project.platforms.filter((p) => !/^https?:\/\//i.test(p)).join(", ")
        );
      }
      if (!id && data.project.id) {
        setId(data.project.id);
        router.replace(`/admin/studio-cms/${data.project.id}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function generateBlog() {
    if (!id) {
      setError("Save the project first, then generate a blog version.");
      return;
    }
    setBlogBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/studio-hub/${id}/blog`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        post?: HubJournalPost;
        created?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.post) throw new Error(data.error || "Blog create failed");
      setBlog(data.post);
      setBlogTitle(data.post.title);
      setBlogSlug(data.post.slug);
      setBlogExcerpt(data.post.excerpt);
      setBlogBody(data.post.body);
      setBlogStatus(data.post.status);
      setBlogPrimarySite(data.post.primarySite || "BOTH");
      setBlogTitleBl(data.post.titleBrightline || "");
      setBlogExcerptBl(data.post.excerptBrightline || "");
      setBlogBodyBl(data.post.bodyBrightline || "");
      setBlogHero(data.post.heroImage || "");
      setBlogHeroBl(data.post.heroImageBrightline || "");
      setMessage(data.created ? "Blog version created" : "Opened existing blog version");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Blog create failed");
    } finally {
      setBlogBusy(false);
    }
  }

  async function saveBlog() {
    if (!id || !blog) {
      setError("Generate a blog version first.");
      return;
    }
    setBlogBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/studio-hub/${id}/blog`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journalId: blog.id,
          title: blogTitle,
          slug: blogSlug,
          excerpt: blogExcerpt,
          body: blogBody,
          status: blogStatus,
          primarySite: blogPrimarySite,
          titleBrightline: blogTitleBl,
          excerptBrightline: blogExcerptBl,
          bodyBrightline: blogBodyBl,
          heroImage: blogHero,
          heroImageBrightline: blogHeroBl,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        post?: HubJournalPost;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.post) throw new Error(data.error || "Blog save failed");
      setBlog(data.post);
      setMessage("Blog version saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Blog save failed");
    } finally {
      setBlogBusy(false);
    }
  }

  const mirotechPreview = slug
    ? `https://mirotech.solutions/work/${encodeURIComponent(slug)}`
    : "";
  /** Admin preview always works; public shared URL only when Brightline is published. */
  const brightlineAdminPreview = id
    ? `/admin/studio-cms/${encodeURIComponent(id)}/preview`
    : "";
  const brightlinePublicPreview =
    slug && brightlineExternalId.trim() && brightlineSection.trim()
      ? `https://brightlinephotography.com/work/${encodeURIComponent(brightlineSection.trim())}/${encodeURIComponent(slug)}`
      : slug
        ? `https://brightlinephotography.com/work/shared/${encodeURIComponent(slug)}`
        : "";
  const brightlinePreview = brightlineAdminPreview || brightlinePublicPreview;
  const blogAdminPreview = id
    ? `/admin/studio-cms/${encodeURIComponent(id)}/blog-preview`
    : "";
  const blogMirotechLiveOk =
    blogStatus === "PUBLISHED" &&
    (blogPrimarySite === "BOTH" || blogPrimarySite === "MIROTECH");
  const blogBrightlineLiveOk =
    blogStatus === "PUBLISHED" &&
    (blogPrimarySite === "BOTH" || blogPrimarySite === "BRIGHTLINE");
  const blogMirotechPreview = blogMirotechLiveOk && blogSlug
    ? `https://mirotech.solutions/journal/${encodeURIComponent(blogSlug)}`
    : blogAdminPreview
      ? `${blogAdminPreview}?site=mirotech`
      : "";
  const blogBrightlinePreview = blogBrightlineLiveOk && blogSlug
    ? `https://brightlinephotography.com/blog/shared/${encodeURIComponent(blogSlug)}`
    : blogAdminPreview
      ? `${blogAdminPreview}?site=brightline`
      : "";

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/studio-cms" className="text-sm text-white/50 hover:text-white">
            ← Studio CMS
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white">
            {id ? "Project hub" : "New project hub"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/55">
            One draft for Brightline Work, Mirotech Work, and a Blog version — shared media and copy
            in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void saveProject()}
          disabled={saving || !title.trim()}
          className="btn btn-primary"
        >
          {saving ? "Saving…" : id ? "Save project" : "Create project"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusChip label="Brightline Work" state={chips.brightlineWork} />
        <StatusChip label="Mirotech Work" state={chips.mirotechWork} />
        <StatusChip label="Blog" state={chips.blog} />
      </div>

      {message ? <p className="text-sm text-emerald-200/90">{message}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {/* Core */}
      <section className="rounded-2xl border border-white/10 bg-black/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">Project core</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.14em] text-white/50">
              AI voice
              <select
                className="rounded-md border border-white/15 bg-black/50 px-2 py-1 text-[0.7rem] normal-case tracking-normal text-white/85"
                value={aiVoice}
                onChange={(e) => {
                  const next = e.target.value as SectionCopyTone;
                  setAiVoice(next);
                  writeStoredAiVoice(next);
                }}
                disabled={!!aiBusy}
                aria-label="AI voice preference"
              >
                {SECTION_TONE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={AI_BTN}
              disabled={!!aiBusy || !title.trim()}
              onClick={() => void generateCoreSection()}
            >
              {aiBusy === "core:section" ? "Generating…" : "Generate AI"}
            </button>
          </div>
        </div>
        <PrototypeLinkField
          value={prototypeUrl}
          onChange={setPrototypeUrl}
          placement="top"
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-white/70">
            Title
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!id && !slug) setSlug(slugifyLocal(e.target.value));
              }}
            />
          </label>
          <label className="block text-sm text-white/70">
            Slug
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 font-mono text-sm text-white"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </label>
          <label className="block text-sm text-white/70 md:col-span-2">
            <AiFieldLabel
              label="Summary"
              busy={aiBusy === "core:summary"}
              disabled={!!aiBusy || !title.trim()}
              buttonLabel={summary.trim() || noteFor("core:summary").trim() ? "Regenerate" : "AI"}
              onRegenerate={() => void regenerateSummary()}
              />
            <textarea
              className="mt-1 min-h-[88px] w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Edit freely. Use AI notes below + Apply notes to fold guidance into this summary."
            />
            <AiNotesBox
              value={noteFor("core:summary")}
              onChange={(v) => setNoteFor("core:summary", v)}
              busy={aiBusy === "core:summary:notes"}
              disabled={!!aiBusy || !title.trim() || !noteFor("core:summary").trim()}
              onApply={() => void applyNotesToProjectField("summary", "core:summary", summary, setSummary)}
              placeholder="Add guidance, then Apply notes to update the field above — e.g. duplicate of an original site, design for case study only."
              />
          </label>
          <label className="block text-sm text-white/70">
            <AiFieldLabel
              label="Subtitle"
              busy={aiBusy === "core:subtitle"}
              disabled={!!aiBusy || !title.trim()}
              buttonLabel={subtitle.trim() || noteFor("core:subtitle").trim() ? "Regenerate" : "AI"}
              onRegenerate={() =>
                void runCoreMetaFieldAi("subtitle", "core:subtitle", subtitle, setSubtitle)}
              />
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
            <AiNotesBox
            value={noteFor("core:subtitle")}
            onChange={(v) => setNoteFor("core:subtitle", v)}
            busy={aiBusy === "core:subtitle:notes"}
            disabled={!!aiBusy || !title.trim() || !noteFor("core:subtitle").trim()}
            onApply={() => void applyNotesToCoreField("subtitle", "core:subtitle", subtitle, setSubtitle)}
            />
          </label>
          <label className="block text-sm text-white/70">
            Year
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm text-white/70">
            Work status
            <select
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-white/70">
            <AiFieldLabel
              label="Categories (comma)"
              busy={aiBusy === "core:categories"}
              disabled={!!aiBusy || !title.trim()}
              buttonLabel={categories.trim() || noteFor("core:categories").trim() ? "Regenerate" : "AI"}
              onRegenerate={() =>
                void runCoreMetaFieldAi(
                  "categories",
                  "core:categories",
                  categories,
                  setCategories
                )}
              />
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
            />
            <AiNotesBox
            value={noteFor("core:categories")}
            onChange={(v) => setNoteFor("core:categories", v)}
            busy={aiBusy === "core:categories:notes"}
            disabled={!!aiBusy || !title.trim() || !noteFor("core:categories").trim()}
            onApply={() => void applyNotesToCoreField("categories", "core:categories", categories, setCategories)}
            />
          </label>
          <label className="block text-sm text-white/70">
            <AiFieldLabel
              label="Disciplines (comma)"
              busy={aiBusy === "core:disciplines"}
              disabled={!!aiBusy || !title.trim()}
              buttonLabel={disciplines.trim() || noteFor("core:disciplines").trim() ? "Regenerate" : "AI"}
              onRegenerate={() =>
                void runCoreMetaFieldAi(
                  "disciplines",
                  "core:disciplines",
                  disciplines,
                  setDisciplines
                )}
              />
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={disciplines}
              onChange={(e) => setDisciplines(e.target.value)}
            />
            <AiNotesBox
            value={noteFor("core:disciplines")}
            onChange={(v) => setNoteFor("core:disciplines", v)}
            busy={aiBusy === "core:disciplines:notes"}
            disabled={!!aiBusy || !title.trim() || !noteFor("core:disciplines").trim()}
            onApply={() => void applyNotesToCoreField("disciplines", "core:disciplines", disciplines, setDisciplines)}
            />
          </label>
          <label className="block text-sm text-white/70 md:col-span-2">
            <AiFieldLabel
              label="Tools (comma)"
              busy={aiBusy === "core:tools"}
              disabled={!!aiBusy || !title.trim()}
              buttonLabel={tools.trim() || noteFor("core:tools").trim() ? "Regenerate" : "AI"}
              onRegenerate={() => void regenerateTools()}
              />
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={tools}
              onChange={(e) => setTools(e.target.value)}
              placeholder="Extended professional stack — add notes below, then Regenerate"
            />
            <AiNotesBox
              value={noteFor("core:tools")}
              onChange={(v) => setNoteFor("core:tools", v)}
              busy={aiBusy === "core:tools:notes"}
              disabled={!!aiBusy || !title.trim() || !noteFor("core:tools").trim()}
              onApply={() => void applyNotesToCoreField("tools", "core:tools", tools, setTools)}
              placeholder="Add guidance, then Apply notes — tools to include/exclude, e.g. Figma, Next.js, R2, Prisma."
              />
          </label>
          <div className="block text-sm text-white/70 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Hero image</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-[0.65rem] uppercase tracking-wider text-white/80 hover:bg-white/10"
                  onClick={() => setR2PickTarget("hero")}
                >
                  Browse R2
                </button>
                {heroImage.trim() ? (
                  <button
                    type="button"
                    className="rounded-md border border-white/15 px-2 py-1 text-[0.65rem] uppercase tracking-wider text-white/50 hover:text-white"
                    onClick={() => setHeroImage("")}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
            {heroImage.trim() ? (
              <div className="mt-2 flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaPreviewSrc(heroImage)}
                  alt=""
                  className="h-20 w-32 rounded-lg border border-white/10 object-cover"
                />
                <p className="min-w-0 flex-1 break-all font-mono text-[0.7rem] text-white/45">
                  {heroImage}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-white/40">Select from R2 or paste a key / URL below.</p>
            )}
            <input
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 font-mono text-sm text-white"
              value={heroImage}
              onChange={(e) => setHeroImage(e.target.value)}
              placeholder="R2 key or https://…"
            />
          </div>
          <div className="block text-sm text-white/70 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Thumbnail</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-[0.65rem] uppercase tracking-wider text-white/80 hover:bg-white/10"
                  onClick={() => setR2PickTarget("thumb")}
                >
                  Browse R2
                </button>
                {thumbnailImage.trim() ? (
                  <button
                    type="button"
                    className="rounded-md border border-white/15 px-2 py-1 text-[0.65rem] uppercase tracking-wider text-white/50 hover:text-white"
                    onClick={() => setThumbnailImage("")}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
            {thumbnailImage.trim() ? (
              <div className="mt-2 flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaPreviewSrc(thumbnailImage)}
                  alt=""
                  className="h-20 w-32 rounded-lg border border-white/10 object-cover"
                />
                <p className="min-w-0 flex-1 break-all font-mono text-[0.7rem] text-white/45">
                  {thumbnailImage}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-white/40">Used on Work cards when set.</p>
            )}
            <input
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 font-mono text-sm text-white"
              value={thumbnailImage}
              onChange={(e) => setThumbnailImage(e.target.value)}
              placeholder="R2 key or https://…"
            />
          </div>
          <label className="block text-sm text-white/70">
            <AiFieldLabel
              label="SEO title"
              busy={aiBusy === "core:seoTitle"}
              disabled={!!aiBusy || !title.trim()}
              buttonLabel={seoTitle.trim() || noteFor("core:seoTitle").trim() ? "Regenerate" : "AI"}
              onRegenerate={() =>
                void runProjectFieldAi("seoTitle", "core:seoTitle", seoTitle, setSeoTitle)}
              />
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
            />
            <AiNotesBox
            value={noteFor("core:seoTitle")}
            onChange={(v) => setNoteFor("core:seoTitle", v)}
            busy={aiBusy === "core:seoTitle:notes"}
            disabled={!!aiBusy || !title.trim() || !noteFor("core:seoTitle").trim()}
            onApply={() => void applyNotesToProjectField("seoTitle", "core:seoTitle", seoTitle, setSeoTitle)}
            />
          </label>
          <label className="block text-sm text-white/70">
            <AiFieldLabel
              label="SEO description"
              busy={aiBusy === "core:seoDescription"}
              disabled={!!aiBusy || !title.trim()}
              buttonLabel={seoDescription.trim() || noteFor("core:seoDescription").trim() ? "Regenerate" : "AI"}
              onRegenerate={() =>
                void runProjectFieldAi(
                  "metaDescription",
                  "core:seoDescription",
                  seoDescription,
                  setSeoDescription
                )}
              />
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
            />
            <AiNotesBox
            value={noteFor("core:seoDescription")}
            onChange={(v) => setNoteFor("core:seoDescription", v)}
            busy={aiBusy === "core:seoDescription:notes"}
            disabled={!!aiBusy || !title.trim() || !noteFor("core:seoDescription").trim()}
            onApply={() => void applyNotesToProjectField("metaDescription", "core:seoDescription", seoDescription, setSeoDescription)}
            />
          </label>
        </div>
        <PrototypeLinkField
          value={prototypeUrl}
          onChange={setPrototypeUrl}
          placement="bottom"
        />
      </section>

      {/* Three panels */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Brightline */}
        <section className="rounded-2xl border border-white/10 bg-black/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/45">
              Brightline · photography
            </p>
            <button
              type="button"
              className={AI_BTN}
              disabled={!!aiBusy || !title.trim()}
              onClick={() => void generateBrightlineSection()}
            >
              {aiBusy === "brightline:section" ? "Generating…" : "Generate AI"}
            </button>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={publishBrightline}
              onChange={(e) => setPublishBrightline(e.target.checked)}
            />
            Publish on Brightline Work
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={featuredBrightline}
              onChange={(e) => setFeaturedBrightline(e.target.checked)}
            />
            Featured on Brightline
          </label>
          <label className="mt-4 block text-sm text-white/70">
            <AiFieldLabel
              label="Photo overview"
              busy={aiBusy === "bl:overview"}
              disabled={!!aiBusy || !title.trim()}
              buttonLabel={photoOverview.trim() || noteFor("bl:overview").trim() ? "Regenerate" : "AI"}
              onRegenerate={() =>
                void runProjectFieldAi(
                  "overviewExtended",
                  "bl:overview",
                  photoOverview,
                  setPhotoOverview
                )}
              />
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={photoOverview}
              onChange={(e) => setPhotoOverview(e.target.value)}
            />
            <AiNotesBox
            value={noteFor("bl:overview")}
            onChange={(v) => setNoteFor("bl:overview", v)}
            busy={aiBusy === "bl:overview:notes"}
            disabled={!!aiBusy || !title.trim() || !noteFor("bl:overview").trim()}
            onApply={() => void applyNotesToProjectField("overviewExtended", "bl:overview", photoOverview, setPhotoOverview)}
            />
          </label>
          <label className="mt-3 block text-sm text-white/70">
            <AiFieldLabel
              label="Approach"
              busy={aiBusy === "bl:approach"}
              disabled={!!aiBusy || !title.trim()}
              buttonLabel={photoApproach.trim() || noteFor("bl:approach").trim() ? "Regenerate" : "AI"}
              onRegenerate={() =>
                void runProjectFieldAi("approach", "bl:approach", photoApproach, setPhotoApproach)}
              />
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={photoApproach}
              onChange={(e) => setPhotoApproach(e.target.value)}
            />
            <AiNotesBox
            value={noteFor("bl:approach")}
            onChange={(v) => setNoteFor("bl:approach", v)}
            busy={aiBusy === "bl:approach:notes"}
            disabled={!!aiBusy || !title.trim() || !noteFor("bl:approach").trim()}
            onApply={() => void applyNotesToProjectField("approach", "bl:approach", photoApproach, setPhotoApproach)}
            />
          </label>
          <label className="mt-3 block text-sm text-white/70">
            <AiFieldLabel
              label="Location"
              busy={aiBusy === "bl:location"}
              disabled={!!aiBusy || !title.trim()}
              buttonLabel={photoLocation.trim() || noteFor("bl:location").trim() ? "Regenerate" : "AI"}
              onRegenerate={() =>
                void runProjectFieldAi(
                  "locationContext",
                  "bl:location",
                  photoLocation,
                  setPhotoLocation
                )}
              />
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={photoLocation}
              onChange={(e) => setPhotoLocation(e.target.value)}
            />
            <AiNotesBox
            value={noteFor("bl:location")}
            onChange={(v) => setNoteFor("bl:location", v)}
            busy={aiBusy === "bl:location:notes"}
            disabled={!!aiBusy || !title.trim() || !noteFor("bl:location").trim()}
            onApply={() => void applyNotesToProjectField("locationContext", "bl:location", photoLocation, setPhotoLocation)}
            />
          </label>
          <label className="mt-3 block text-sm text-white/70">
            <AiFieldLabel
              label="Notes"
              busy={aiBusy === "bl:notes"}
              disabled={!!aiBusy || !title.trim()}
              buttonLabel={photoNotes.trim() || noteFor("bl:notes").trim() ? "Regenerate" : "AI"}
              onRegenerate={() =>
                void runProjectFieldAi("description", "bl:notes", photoNotes, setPhotoNotes)}
              />
            <textarea
              className="mt-1 min-h-[64px] w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={photoNotes}
              onChange={(e) => setPhotoNotes(e.target.value)}
            />
            <AiNotesBox
            value={noteFor("bl:notes")}
            onChange={(v) => setNoteFor("bl:notes", v)}
            busy={aiBusy === "bl:notes:notes"}
            disabled={!!aiBusy || !title.trim() || !noteFor("bl:notes").trim()}
            onApply={() => void applyNotesToProjectField("description", "bl:notes", photoNotes, setPhotoNotes)}
            />
          </label>
          <label className="mt-3 block text-sm text-white/70">
            Linked WorkProject id (optional)
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 font-mono text-xs text-white"
              value={brightlineExternalId}
              onChange={(e) => setBrightlineExternalId(e.target.value)}
            />
          </label>
          <label className="mt-3 block text-sm text-white/70">
            Pillar section (optional)
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={brightlineSection}
              onChange={(e) => setBrightlineSection(e.target.value)}
            />
          </label>
          {brightlinePreview ? (
            <div className="mt-4 space-y-2">
              <a
                href={brightlinePreview}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs uppercase tracking-[0.18em] text-white/50 hover:text-white"
              >
                Preview Brightline →
              </a>
              <p className="text-[0.7rem] leading-relaxed text-white/40">
                {publishBrightline
                  ? `Also live at ${brightlinePublicPreview || "/work/shared/…"}`
                  : "Draft preview (admin). Turn on “Publish on Brightline Work” + save to make the public page live."}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-[0.7rem] text-white/40">Save the project first to enable preview.</p>
          )}
        </section>

        {/* Blog */}
        <section className="rounded-2xl border border-white/10 bg-black/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/45">Blog version</p>
            <button
              type="button"
              className={AI_BTN}
              disabled={!!aiBusy || blogBusy || (!blog && !id) || !title.trim()}
              onClick={() => {
                if (blog) void polishBlogVersion();
                else void generateBlogThenPolish();
              }}
              title={
                blog
                  ? "Polish excerpt and body with AI"
                  : "Create blog version from this project, then polish with AI"
              }
            >
              {aiBusy === "blog:polish" || aiBusy === "blog:generate"
                ? "Generating…"
                : "Generate AI"}
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/45">
            Independent of Work publish status. Creates a Mirotech journal linked to this project
            (Brightline reads shared blog). Use Generate AI to create and polish copy. Default
            Primary site is BOTH so both publics can show it when Published.
          </p>
          {!blog ? (
            <button
              type="button"
              className="btn btn-ghost mt-4 w-full"
              disabled={blogBusy || !id}
              onClick={() => void generateBlog()}
            >
              {blogBusy ? "Working…" : "Create blog version"}
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              <label className="block text-sm text-white/70">
                Mirotech title
                <input
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                  value={blogTitle}
                  onChange={(e) => setBlogTitle(e.target.value)}
                />
              </label>
              <label className="block text-sm text-white/70">
                Slug
                <input
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 font-mono text-xs text-white"
                  value={blogSlug}
                  onChange={(e) => setBlogSlug(e.target.value)}
                />
              </label>
              <label className="block text-sm text-white/70">
                Status
                <select
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                  value={blogStatus}
                  onChange={(e) => setBlogStatus(e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-white/70">
                Primary site
                <select
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                  value={blogPrimarySite}
                  onChange={(e) => setBlogPrimarySite(e.target.value)}
                >
                  <option value="BOTH">BOTH</option>
                  <option value="MIROTECH">MIROTECH</option>
                  <option value="BRIGHTLINE">BRIGHTLINE</option>
                </select>
              </label>
              <label className="block text-sm text-white/70">
                Excerpt
                <textarea
                  className="mt-1 min-h-[56px] w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                  value={blogExcerpt}
                  onChange={(e) => setBlogExcerpt(e.target.value)}
                />
              </label>
              <label className="block text-sm text-white/70">
                Mirotech body
                <textarea
                  className="mt-1 min-h-[100px] w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                  value={blogBody}
                  onChange={(e) => setBlogBody(e.target.value)}
                />
              </label>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[0.65rem] uppercase tracking-[0.18em] text-white/45">
                    Brightline overrides
                  </p>
                  <button
                    type="button"
                    className="rounded-lg border border-sky-400/35 bg-sky-500/10 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-sky-100 hover:bg-sky-500/20"
                    onClick={() => {
                      const hasBl =
                        Boolean(blogTitleBl.trim()) ||
                        Boolean(blogExcerptBl.trim()) ||
                        Boolean(blogBodyBl.trim()) ||
                        Boolean(blogHeroBl.trim());
                      if (
                        hasBl &&
                        !window.confirm(
                          "Replace Brightline title, excerpt, body, and hero with the Mirotech fields?"
                        )
                      ) {
                        return;
                      }
                      setBlogTitleBl(blogTitle);
                      setBlogExcerptBl(blogExcerpt);
                      setBlogBodyBl(blogBody);
                      setBlogHeroBl(blogHero);
                      setMessage(
                        "Copied Mirotech → Brightline (save blog version to persist)."
                      );
                    }}
                  >
                    Copy Mirotech → Brightline
                  </button>
                </div>
                <p className="mt-2 text-[0.7rem] leading-relaxed text-white/40">
                  Public Brightline uses Brightline fields when set; empty fields fall back to
                  Mirotech via the content API. Use Copy when you want both sites identical.
                </p>
              </div>
              <label className="block text-sm text-white/70">
                Brightline title
                <input
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                  value={blogTitleBl}
                  onChange={(e) => setBlogTitleBl(e.target.value)}
                />
              </label>
              <label className="block text-sm text-white/70">
                Brightline excerpt
                <textarea
                  className="mt-1 min-h-[56px] w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                  value={blogExcerptBl}
                  onChange={(e) => setBlogExcerptBl(e.target.value)}
                />
              </label>
              <label className="block text-sm text-white/70">
                <AiFieldLabel
                  label="Brightline body"
                  busy={aiBusy === "blog:bodyBl"}
                  disabled={!!aiBusy || !title.trim()}
                  buttonLabel={blogBodyBl.trim() || noteFor("blog:bodyBl").trim() ? "Regenerate" : "AI"}
                  onRegenerate={() => void generateBrightlineBlogBody()}
                  />
                <textarea
                  className="mt-1 min-h-[100px] w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                  value={blogBodyBl}
                  onChange={(e) => setBlogBodyBl(e.target.value)}
                />
                <AiNotesBox
            value={noteFor("blog:bodyBl")}
            onChange={(v) => setNoteFor("blog:bodyBl", v)}
            busy={aiBusy === "blog:bodyBl:notes"}
            disabled={!!aiBusy || !title.trim() || !noteFor("blog:bodyBl").trim()}
            onApply={() => void applyNotesToBlogBody()}
            />
              </label>
              <div className="block text-sm text-white/70">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>Hero (Mirotech)</span>
                  <button
                    type="button"
                    className="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-[0.65rem] uppercase tracking-wider text-white/80 hover:bg-white/10"
                    onClick={() => setR2PickTarget("blogHero")}
                  >
                    Browse R2
                  </button>
                </div>
                <input
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 font-mono text-xs text-white"
                  value={blogHero}
                  onChange={(e) => setBlogHero(e.target.value)}
                  placeholder="R2 key or https://…"
            />
              </div>
              <div className="block text-sm text-white/70">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>Hero (Brightline)</span>
                  <button
                    type="button"
                    className="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-[0.65rem] uppercase tracking-wider text-white/80 hover:bg-white/10"
                    onClick={() => setR2PickTarget("blogHeroBl")}
                  >
                    Browse R2
                  </button>
                </div>
                <input
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 font-mono text-xs text-white"
                  value={blogHeroBl}
                  onChange={(e) => setBlogHeroBl(e.target.value)}
                  placeholder="R2 key or https://…"
            />
              </div>
              <button
                type="button"
                className="btn btn-primary w-full"
                disabled={blogBusy}
                onClick={() => void saveBlog()}
              >
                {blogBusy ? "Saving…" : "Save blog version"}
              </button>
              <div className="flex flex-col gap-2 pt-1">
                {blogMirotechPreview ? (
                  <a
                    href={blogMirotechPreview}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs uppercase tracking-[0.18em] text-white/50 hover:text-white"
                  >
                    {blogMirotechLiveOk
                      ? "Preview Mirotech journal →"
                      : "Preview Mirotech (admin) →"}
                  </a>
                ) : null}
                {blogBrightlinePreview ? (
                  <a
                    href={blogBrightlinePreview}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center rounded-lg border border-white/20 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/70 hover:border-white/40 hover:text-white"
                  >
                    {blogBrightlineLiveOk
                      ? "Preview Brightline shared blog →"
                      : "Preview Brightline (admin) →"}
                  </a>
                ) : null}
                <p className="text-[0.7rem] leading-relaxed text-white/40">
                  Public URLs go live only when Status is Published and Primary site includes that
                  brand (use BOTH for both sites). Drafts open an admin preview instead.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Mirotech */}
        <section className="rounded-2xl border border-white/10 bg-black/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/45">
              Mirotech · design & concept
            </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.14em] text-white/50">
              AI voice
              <select
                className="rounded-md border border-white/15 bg-black/50 px-2 py-1 text-[0.7rem] normal-case tracking-normal text-white/85"
                value={aiVoice}
                onChange={(e) => {
                  const next = e.target.value as SectionCopyTone;
                  setAiVoice(next);
                  writeStoredAiVoice(next);
                }}
                disabled={!!aiBusy}
                aria-label="AI voice preference"
              >
                {SECTION_TONE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={AI_BTN}
              disabled={!!aiBusy || !title.trim()}
              onClick={() => void generateMirotechSection()}
            >
              {aiBusy === "mirotech:section" ? "Generating…" : "Generate all"}
            </button>
          </div>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={publishMirotech}
              onChange={(e) => setPublishMirotech(e.target.checked)}
            />
            Publish on Mirotech Work
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={featuredMirotech}
              onChange={(e) => setFeaturedMirotech(e.target.checked)}
            />
            Featured on Mirotech
          </label>
          <label className="mt-4 block text-sm text-white/70">
            <AiFieldLabel
              label="Challenge"
              busy={aiBusy === "mt:challenge"}
              disabled={!!aiBusy || !title.trim()}
              buttonLabel={challenge.trim() || noteFor("mt:challenge").trim() ? "Regenerate" : "AI"}
              onRegenerate={() =>
                void runDesignFieldAi("challenge", "mt:challenge", challenge, setChallenge)}
              />
            <textarea
              className="mt-1 min-h-[88px] w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
            />
            <AiNotesBox
            value={noteFor("mt:challenge")}
            onChange={(v) => setNoteFor("mt:challenge", v)}
            busy={aiBusy === "mt:challenge:notes"}
            disabled={!!aiBusy || !title.trim() || !noteFor("mt:challenge").trim()}
            onApply={() => void applyNotesToCoreField("challenge", "mt:challenge", challenge, setChallenge)}
            />
          </label>
          <label className="mt-3 block text-sm text-white/70">
            <AiFieldLabel
              label="Outcome"
              busy={aiBusy === "mt:outcome"}
              disabled={!!aiBusy || !title.trim()}
              buttonLabel={outcome.trim() || noteFor("mt:outcome").trim() ? "Regenerate" : "AI"}
              onRegenerate={() =>
                void runDesignFieldAi("outcome", "mt:outcome", outcome, setOutcome)}
              />
            <textarea
              className="mt-1 min-h-[88px] w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            />
            <AiNotesBox
            value={noteFor("mt:outcome")}
            onChange={(v) => setNoteFor("mt:outcome", v)}
            busy={aiBusy === "mt:outcome:notes"}
            disabled={!!aiBusy || !title.trim() || !noteFor("mt:outcome").trim()}
            onApply={() => void applyNotesToCoreField("outcome", "mt:outcome", outcome, setOutcome)}
            />
          </label>
          <label className="mt-3 block text-sm text-white/70">
            <AiFieldLabel
              label="Project disclaimer"
              busy={aiBusy === "mt:disclaimer"}
              disabled={!!aiBusy || !title.trim()}
              buttonLabel={projectDisclaimer.trim() || noteFor("mt:disclaimer").trim() ? "Regenerate" : "AI"}
              onRegenerate={() =>
                void runCoreMetaFieldAi(
                  "projectDisclaimer",
                  "mt:disclaimer",
                  projectDisclaimer,
                  setProjectDisclaimer
                )}
              />
            <textarea
              className="mt-1 min-h-[64px] w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={projectDisclaimer}
              onChange={(e) => setProjectDisclaimer(e.target.value)}
              placeholder="Self-initiated concept / sample data — not an official client engagement…"
            />
            <AiNotesBox
            value={noteFor("mt:disclaimer")}
            onChange={(v) => setNoteFor("mt:disclaimer", v)}
            busy={aiBusy === "mt:disclaimer:notes"}
            disabled={!!aiBusy || !title.trim() || !noteFor("mt:disclaimer").trim()}
            onApply={() => void applyNotesToCoreField("projectDisclaimer", "mt:disclaimer", projectDisclaimer, setProjectDisclaimer)}
            />
            <span className="mt-1 block text-[0.7rem] text-white/40">
              Shown on Mirotech when a real company or product is referenced in a concept study.
            </span>
          </label>
          <label className="mt-3 block text-sm text-white/70">
            <AiFieldLabel
              label="Role"
              busy={aiBusy === "mt:role"}
              disabled={!!aiBusy || !title.trim()}
              buttonLabel={role.trim() || noteFor("mt:role").trim() ? "Regenerate" : "AI"}
              onRegenerate={() => void runCoreMetaFieldAi("role", "mt:role", role, setRole)}
              />
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
            <AiNotesBox
            value={noteFor("mt:role")}
            onChange={(v) => setNoteFor("mt:role", v)}
            busy={aiBusy === "mt:role:notes"}
            disabled={!!aiBusy || !title.trim() || !noteFor("mt:role").trim()}
            onApply={() => void applyNotesToCoreField("role", "mt:role", role, setRole)}
            />
          </label>
          <label className="mt-3 block text-sm text-white/70">
            <AiFieldLabel
              label="Duration"
              busy={aiBusy === "mt:duration"}
              disabled={!!aiBusy || !title.trim()}
              buttonLabel={duration.trim() || noteFor("mt:duration").trim() ? "Regenerate" : "AI"}
              onRegenerate={() =>
                void runCoreMetaFieldAi("duration", "mt:duration", duration, setDuration)}
              />
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <AiNotesBox
            value={noteFor("mt:duration")}
            onChange={(v) => setNoteFor("mt:duration", v)}
            busy={aiBusy === "mt:duration:notes"}
            disabled={!!aiBusy || !title.trim() || !noteFor("mt:duration").trim()}
            onApply={() => void applyNotesToCoreField("duration", "mt:duration", duration, setDuration)}
            />
          </label>
          <label className="mt-3 block text-sm text-white/70">
            <AiFieldLabel
              label="What's next"
              busy={aiBusy === "mt:whats-next"}
              disabled={!!aiBusy || !title.trim()}
              buttonLabel={whatsNext.trim() || noteFor("mt:whats-next").trim() ? "Regenerate" : "AI"}
              onRegenerate={() =>
                void runCoreMetaFieldAi("whatsNext", "mt:whats-next", whatsNext, setWhatsNext)}
              />
            <textarea
              className="mt-1 min-h-[88px] w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={whatsNext}
              onChange={(e) => setWhatsNext(e.target.value)}
              placeholder="Logical next steps — pilot, production hardening, expanded research…"
            />
            <AiNotesBox
            value={noteFor("mt:whats-next")}
            onChange={(v) => setNoteFor("mt:whats-next", v)}
            busy={aiBusy === "mt:whats-next:notes"}
            disabled={!!aiBusy || !title.trim() || !noteFor("mt:whats-next").trim()}
            onApply={() => void applyNotesToCoreField("whatsNext", "mt:whats-next", whatsNext, setWhatsNext)}
            />
            <span className="mt-1 block text-[0.7rem] text-white/40">
              Shown at the end of the Mirotech case study after Outcome.
            </span>
          </label>
          <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[0.75rem] leading-relaxed text-white/50">
            Prototype URL is set in Project core
            {isLivePrototypeUrl(prototypeUrl) ? (
              <>
                {" · "}
                <a
                  href={normalizePrototypeUrl(prototypeUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/70 no-underline hover:text-white"
                >
                  {prototypeDisplayHost(prototypeUrl) || "Open"}
                </a>
              </>
            ) : (
              " — not set yet."
            )}
          </p>
          <label className="mt-3 block text-sm text-white/70">
            Platforms (labels)
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={platformsCsv}
              onChange={(e) => setPlatformsCsv(e.target.value)}
              placeholder="Web, iOS, …"
            />
          </label>
          <HubCaseStudySectionsEditor
            ref={sectionsEditorRef}
            sections={sections}
            onChange={setSections}
            caseStudyMode={caseStudyMode}
            onCaseStudyModeChange={applyCaseStudyMode}
            aiVoice={aiVoice}
            prototypeUrl={prototypeUrl}
            heroImage={heroImage}
            projectDisclaimer={projectDisclaimer}
            projectTitle={title}
            projectContext={[
              summary,
              subtitle,
              role && `Role: ${role}`,
              disciplines && `Disciplines: ${disciplines}`,
              tools && `Tools: ${tools}`,
              challenge && `Challenge: ${challenge}`,
              outcome && `Outcome: ${outcome}`,
              `Case study mode: ${labelForCaseStudyMode(caseStudyMode)}`,
            ]
              .filter(Boolean)
              .join("\n")}
            parentAiBusy={aiBusy}
            onAiError={setError}
            onAiMessage={setMessage}
            onBrowseR2={({ kind, index }) =>
              setR2PickTarget({
                kind:
                  kind === "image"
                    ? "section-image"
                    : kind === "gallery"
                      ? "section-gallery"
                      : kind === "video"
                        ? "section-video"
                        : "section-video-poster",
                index,
              })
            }
          />
          {mirotechPreview ? (
            <a
              href={mirotechPreview}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-xs uppercase tracking-[0.18em] text-white/50 hover:text-white"
            >
              Preview Mirotech →
            </a>
          ) : null}
        </section>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-white/10 pt-6">
        <button
          type="button"
          onClick={() => void saveProject()}
          disabled={saving || !title.trim()}
          className="btn btn-primary"
        >
          {saving ? "Saving…" : "Save project"}
        </button>
        <Link href="/admin/projects" className="btn btn-ghost">
          Legacy studio delivery projects
        </Link>
      </div>

      <R2BrowserModal
        isOpen={r2PickTarget != null}
        onClose={() => setR2PickTarget(null)}
        mode={
          r2PickTarget &&
          typeof r2PickTarget === "object" &&
          r2PickTarget.kind === "section-gallery"
            ? "multiple"
            : "single"
        }
        initialPortfolioFolder={
          r2PickTarget &&
          typeof r2PickTarget === "object" &&
          (r2PickTarget.kind === "section-video" ||
            r2PickTarget.kind === "section-video-poster")
            ? "web_video"
            : undefined
        }
        mediaRoot="mirotech"
        onAddKeys={async (keys) => {
          if (!r2PickTarget) return;
          const cleaned = keys
            .map((k) => {
              const raw = k.replace(/^\/+/, "").trim();
              if (
                r2PickTarget &&
                typeof r2PickTarget === "object" &&
                (r2PickTarget.kind === "section-video" ||
                  r2PickTarget.kind === "section-video-poster")
              ) {
                return normalizePortfolioVideoKey(raw);
              }
              return preferPortfolioWebFullKey(raw);
            })
            .filter(Boolean);
          if (cleaned.length === 0) return;
          if (r2PickTarget === "hero") setHeroImage(cleaned[0]);
          else if (r2PickTarget === "thumb") setThumbnailImage(cleaned[0]);
          else if (r2PickTarget === "blogHero") setBlogHero(cleaned[0]);
          else if (r2PickTarget === "blogHeroBl") setBlogHeroBl(cleaned[0]);
          else if (typeof r2PickTarget === "object" && r2PickTarget.kind === "section-image") {
            const idx = r2PickTarget.index;
            setSections((prev) =>
              prev.map((section, i) =>
                i === idx
                  ? { ...section, data: { ...section.data, src: cleaned[0] } }
                  : section
              )
            );
          } else if (typeof r2PickTarget === "object" && r2PickTarget.kind === "section-video") {
            const idx = r2PickTarget.index;
            setSections((prev) =>
              prev.map((section, i) =>
                i === idx
                  ? { ...section, data: { ...section.data, src: cleaned[0] } }
                  : section
              )
            );
          } else if (
            typeof r2PickTarget === "object" &&
            r2PickTarget.kind === "section-video-poster"
          ) {
            const idx = r2PickTarget.index;
            setSections((prev) =>
              prev.map((section, i) =>
                i === idx
                  ? { ...section, data: { ...section.data, poster: cleaned[0] } }
                  : section
              )
            );
          } else if (typeof r2PickTarget === "object" && r2PickTarget.kind === "section-gallery") {
            const idx = r2PickTarget.index;
            setSections((prev) =>
              prev.map((section, i) => {
                if (i !== idx) return section;
                const existing = Array.isArray(section.data.images)
                  ? section.data.images
                  : [];
                const prior = existing
                  .map((item) => {
                    if (typeof item === "string") return { src: preferPortfolioWebFullKey(item) };
                    if (item && typeof item === "object" && !Array.isArray(item)) {
                      const row = item as Record<string, unknown>;
                      const src = preferPortfolioWebFullKey(
                        String(row.src || row.url || row.key || "").trim()
                      );
                      return src ? { src } : null;
                    }
                    return null;
                  })
                  .filter((item): item is { src: string } => Boolean(item));
                return {
                  ...section,
                  data: {
                    ...section.data,
                    images: [...prior, ...cleaned.map((src) => ({ src }))],
                  },
                };
              })
            );
          }
          setR2PickTarget(null);
        }}
      />
    </div>
  );
}
