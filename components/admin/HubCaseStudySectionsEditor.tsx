"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import {
  compactSectionInventory,
  scoreCaseStudyCompleteness,
  shellForChecklistItem,
  type CompletenessItemResult,
} from "@/lib/dual-brand/case-study-completeness";
import {
  CASE_STUDY_CREDIBILITY_NOTES,
  CASE_STUDY_SECTION_TYPES,
  CASE_STUDY_TEMPLATES,
  hintForCaseStudySection,
  labelForCaseStudyMode,
  normalizeImageSideLayout,
  seedCaseStudySections,
  type CaseStudyMode,
  type HubSectionDraft,
} from "@/lib/dual-brand/case-study-template";
import {
  SECTION_TONE_OPTIONS,
  defaultToneForCaseStudyMode,
  type SectionCopyTone,
} from "@/lib/dual-brand/section-copy-tone";
import { getPublicR2Url } from "@/lib/r2";
import { normalizePortfolioVideoKey } from "@/lib/video-port/keys";

type SectionToneId = SectionCopyTone;

export type HubCaseStudySectionsEditorHandle = {
  generateAllBodies: (opts: {
    replaceAll: boolean;
    tone: SectionCopyTone;
  }) => Promise<number>;
  countEmptyBodies: () => number;
};

function sectionUsesBody(type: string): boolean {
  return type !== "image" && type !== "gallery" && type !== "prototype" && type !== "video";
}

const AI_BTN_FIELD =
  "inline-flex items-center justify-center rounded-md border border-white/20 bg-white/5 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-40";

const SIDE_PILL =
  "rounded-md border px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.12em] transition-colors";
const SIDE_PILL_ON = `${SIDE_PILL} border-white/35 bg-white/10 text-white`;
const SIDE_PILL_OFF = `${SIDE_PILL} border-white/15 text-white/50 hover:border-white/25 hover:text-white/80`;

function SideImageSidePanelControls({
  data,
  onUpdate,
  aiDisabled,
  tone,
  onToneChange,
  onGenerateCaption,
  onGenerateQuote,
  captionBusy,
  quoteBusy,
  hint,
}: {
  data: Record<string, unknown>;
  onUpdate: (patch: Record<string, unknown>) => void;
  aiDisabled: boolean;
  tone: SectionToneId;
  onToneChange: (tone: SectionToneId) => void;
  onGenerateCaption: () => void;
  onGenerateQuote: () => void;
  captionBusy: boolean;
  quoteBusy: boolean;
  hint?: string;
}) {
  const side = normalizeImageSideLayout(data);
  const sideType = side.sideType;
  const imagePosition = side.imagePosition;
  const layout = side.layout;

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      {hint ? (
        <p className="text-[0.7rem] leading-relaxed text-white/45">{hint}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-white/70">Side content</span>
        <button
          type="button"
          className={sideType === "caption" ? SIDE_PILL_ON : SIDE_PILL_OFF}
          onClick={() => onUpdate({ sideType: "caption" })}
        >
          Caption
        </button>
        <button
          type="button"
          className={sideType === "quote" ? SIDE_PILL_ON : SIDE_PILL_OFF}
          onClick={() => onUpdate({ sideType: "quote" })}
        >
          Quote
        </button>
      </div>
      {sideType === "caption" ? (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-white/70">Side caption</span>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-md border border-white/15 bg-black/50 px-2 py-1 text-[0.7rem] text-white/80"
                value={tone}
                onChange={(e) => onToneChange(e.target.value as SectionToneId)}
                disabled={aiDisabled && !captionBusy}
              >
                {SECTION_TONE_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={AI_BTN_FIELD}
                disabled={aiDisabled}
                onClick={onGenerateCaption}
              >
                {captionBusy ? "…" : "AI"}
              </button>
            </div>
          </div>
          <textarea
            className="mt-1 min-h-[72px] w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
            value={String(data.caption || "")}
            onChange={(e) => onUpdate({ caption: e.target.value })}
            placeholder="Caption beside the image on Mirotech"
          />
        </div>
      ) : (
        <>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-white/70">Quote</span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-md border border-white/15 bg-black/50 px-2 py-1 text-[0.7rem] text-white/80"
                  value={tone}
                  onChange={(e) => onToneChange(e.target.value as SectionToneId)}
                  disabled={aiDisabled && !quoteBusy}
                >
                  {SECTION_TONE_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={AI_BTN_FIELD}
                  disabled={aiDisabled}
                  onClick={onGenerateQuote}
                >
                  {quoteBusy ? "…" : "AI"}
                </button>
              </div>
            </div>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
              value={String(data.quote || "")}
              onChange={(e) => onUpdate({ quote: e.target.value })}
              placeholder="Pull quote beside the image"
            />
          </div>
          <label className="block text-sm text-white/70">
            Attribution
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
              value={String(data.attribution || "")}
              onChange={(e) => onUpdate({ attribution: e.target.value })}
              placeholder="Optional"
            />
          </label>
        </>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-white/70">Image</span>
          <button
            type="button"
            className={imagePosition === "left" ? SIDE_PILL_ON : SIDE_PILL_OFF}
            onClick={() => onUpdate({ imagePosition: "left" })}
          >
            Left
          </button>
          <button
            type="button"
            className={imagePosition === "right" ? SIDE_PILL_ON : SIDE_PILL_OFF}
            onClick={() => onUpdate({ imagePosition: "right" })}
          >
            Right
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-white/70">Layout</span>
          <button
            type="button"
            className={layout === "side" ? SIDE_PILL_ON : SIDE_PILL_OFF}
            onClick={() => onUpdate({ layout: "side" })}
          >
            Side by side
          </button>
          <button
            type="button"
            className={layout === "stack" ? SIDE_PILL_ON : SIDE_PILL_OFF}
            onClick={() => onUpdate({ layout: "stack" })}
          >
            Stacked below
          </button>
        </div>
      </div>
    </div>
  );
}

function mediaPreviewSrc(value: string) {
  const v = value.trim();
  if (!v) return "";
  if (/^(https?:|data:|blob:)/i.test(v) || v.startsWith("/")) return v;
  return getPublicR2Url(v.replace(/^\/+/, ""));
}

function looksLikeVideo(value: string): boolean {
  // Do NOT run normalizePortfolioVideoKey here — that appends .mp4 to incomplete
  // stems and would mount a <video> mid-typing (steals focus).
  const decoded = decodeURIComponent(value.trim());
  try {
    const parsed = new URL(decoded, "https://brightline.local");
    const key = parsed.searchParams.get("key") ?? "";
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(key || parsed.pathname);
  } catch {
    return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(decoded);
  }
}

function isVideoLoopEnabled(data: Record<string, unknown>): boolean {
  return !(data.loop === false || data.loop === "false" || data.loop === 0 || data.loop === "0");
}

function newSectionClientKey(): string {
  return `sec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function gallerySrcs(data: Record<string, unknown>): string[] {
  const raw = data.images;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const row = item as Record<string, unknown>;
        return String(row.src || row.url || row.key || "").trim();
      }
      return "";
    })
    .filter(Boolean);
}

function metricRows(data: Record<string, unknown>): Array<{ label: string; value: string }> {
  const raw = data.items ?? data.metrics;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      return {
        label: String(row.label || row.key || "").trim(),
        value: String(row.value || "").trim(),
      };
    })
    .filter((row): row is { label: string; value: string } => Boolean(row));
}

export function normalizeHubSections(
  sections: Array<{
    type?: string;
    title?: string | null;
    body?: string | null;
    data?: unknown;
    sortOrder?: number;
    hint?: string;
    clientKey?: string;
  }> | null | undefined
): HubSectionDraft[] {
  if (!Array.isArray(sections)) return [];
  return sections.map((section, index) => ({
    type: section.type || "text",
    title: section.title || "",
    body: section.body || "",
    data: asRecord(section.data),
    sortOrder: typeof section.sortOrder === "number" ? section.sortOrder : index,
    hint: section.hint,
    clientKey:
      typeof section.clientKey === "string" && section.clientKey.trim()
        ? section.clientKey
        : newSectionClientKey(),
  }));
}

type Props = {
  sections: HubSectionDraft[];
  onChange: (next: HubSectionDraft[]) => void;
  onBrowseR2: (target: {
    kind: "image" | "gallery" | "video" | "video-poster";
    index: number;
  }) => void;
  projectTitle?: string;
  projectContext?: string;
  caseStudyMode?: CaseStudyMode;
  onCaseStudyModeChange?: (mode: CaseStudyMode) => void;
  /** Project-core prototype URL used when a prototype section has no override. */
  prototypeUrl?: string;
  heroImage?: string;
  projectDisclaimer?: string;
  /** Global AI voice from Studio Hub preferences. */
  aiVoice?: SectionCopyTone;
  /** Parent AI busy key (disables section AI while other hub AI runs). */
  parentAiBusy?: string;
  onAiError?: (message: string) => void;
  onAiMessage?: (message: string) => void;
};

export default forwardRef<HubCaseStudySectionsEditorHandle, Props>(function HubCaseStudySectionsEditor(
{
  sections,
  onChange,
  onBrowseR2,
  projectTitle = "",
  projectContext = "",
  caseStudyMode = "basic",
  onCaseStudyModeChange,
  prototypeUrl = "",
  heroImage = "",
  projectDisclaimer = "",
  aiVoice,
  parentAiBusy = "",
  onAiError,
  onAiMessage,
},
ref
) {
  const [tone, setTone] = useState<SectionToneId>(() =>
    defaultToneForCaseStudyMode(caseStudyMode)
  );
  const [toneTouched, setToneTouched] = useState(false);
  const [sectionAiBusy, setSectionAiBusy] = useState("");
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<
    Array<{ item: string; note: string; targetSectionTitle: string; draftBody: string }>
  >([]);

  const completeness = useMemo(
    () =>
      scoreCaseStudyCompleteness(caseStudyMode, sections, {
        prototypeUrl,
        heroImage,
        projectDisclaimer,
      }),
    [caseStudyMode, sections, prototypeUrl, heroImage, projectDisclaimer]
  );

  const completenessGroups = useMemo(() => {
    const map = new Map<string, CompletenessItemResult[]>();
    for (const item of completeness.items) {
      const list = map.get(item.group) || [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [completeness.items]);

  useEffect(() => {
    if (aiVoice) {
      setTone(aiVoice);
    }
  }, [aiVoice]);

  useEffect(() => {
    if (toneTouched) return;
    if (aiVoice) {
      setTone(aiVoice);
      return;
    }
    setTone(defaultToneForCaseStudyMode(caseStudyMode));
  }, [caseStudyMode, aiVoice, toneTouched]);

  function setToneManual(next: SectionToneId) {
    setToneTouched(true);
    setTone(next);
  }

  function setMode(next: CaseStudyMode) {
    if (next === caseStudyMode) return;
    onCaseStudyModeChange?.(next);
  }

  function updateAt(index: number, patch: Partial<HubSectionDraft>) {
    const next = sections.map((section, i) =>
      i === index ? { ...section, ...patch, data: patch.data ?? section.data } : section
    );
    onChange(next.map((section, i) => ({ ...section, sortOrder: i })));
  }

  function updateData(index: number, patch: Record<string, unknown>) {
    const section = sections[index];
    if (!section) return;
    updateAt(index, { data: { ...section.data, ...patch } });
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    onChange(next.map((section, i) => ({ ...section, sortOrder: i })));
  }

  function prototypeSectionDraft(): HubSectionDraft {
    return {
      type: "prototype",
      title: "Live prototype",
      body: "",
      data: {},
      sortOrder: 0,
      clientKey: newSectionClientKey(),
    };
  }

  function insertPrototype(afterIndex?: number) {
    const block = prototypeSectionDraft();
    if (afterIndex == null) {
      onChange(
        [...sections, block].map((section, i) => ({ ...section, sortOrder: i }))
      );
      return;
    }
    const next = [...sections];
    next.splice(afterIndex + 1, 0, block);
    onChange(next.map((section, i) => ({ ...section, sortOrder: i })));
  }

  function seedTemplate() {
    const label = labelForCaseStudyMode(caseStudyMode);
    const seeded = seedCaseStudySections(caseStudyMode);
    if (sections.length > 0) {
      const ok = window.confirm(
        `Replace existing sections with the ${label} 10-section template? Current section content will be lost.`
      );
      if (!ok) return;
    }
    onChange(seeded);
  }

  function scrollToSection(index: number) {
    const el = document.getElementById(`hub-section-${index}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function addOrFocusShell(item: CompletenessItemResult) {
    if (item.sectionIndex != null) {
      scrollToSection(item.sectionIndex);
      return;
    }
    const shell = shellForChecklistItem(caseStudyMode, item);
    if (!shell) return;
    const existing = sections.findIndex(
      (section) => section.title.trim().toLowerCase() === shell.title.trim().toLowerCase()
    );
    if (existing >= 0) {
      scrollToSection(existing);
      return;
    }
    const next = [...sections, shell].map((section, i) => ({ ...section, sortOrder: i }));
    onChange(next);
    window.setTimeout(() => scrollToSection(next.length - 1), 50);
  }

  async function suggestMissing() {
    if (!projectTitle.trim()) {
      onAiError?.("Add a project title before generating AI copy.");
      return;
    }
    const missing = completeness.items.filter((i) => i.status === "missing");
    if (missing.length === 0) {
      onAiMessage?.("Checklist is complete — nothing to suggest.");
      return;
    }
    setSuggestBusy(true);
    setSectionAiBusy("checklist:gaps");
    onAiError?.("");
    onAiMessage?.("");
    try {
      const res = await fetch("/api/admin/studio-hub/generate-section-copy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checklist-gaps",
          title: projectTitle,
          caseStudyMode,
          tone,
          context: projectContext,
          inventory: compactSectionInventory(sections),
          missing: missing.map((m) => ({
            item: m.item,
            reason: m.reason,
            sectionTitle: m.sectionTitle,
          })),
        }),
      });
      const data = (await res.json()) as {
        suggestions?: Array<{
          item: string;
          note: string;
          targetSectionTitle: string;
          draftBody: string;
        }>;
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (res.status === 401 || data.code === "admin_session") {
          throw new Error("Admin session expired. Open /admin/login, sign in again, then retry.");
        }
        throw new Error(data.error || "AI generation failed.");
      }
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      onAiMessage?.(
        `Suggested ${Array.isArray(data.suggestions) ? data.suggestions.length : 0} checklist gap${
          (data.suggestions?.length || 0) === 1 ? "" : "s"
        }.`
      );
    } catch (e) {
      onAiError?.(e instanceof Error ? e.message : "AI generation failed.");
    } finally {
      setSuggestBusy(false);
      setSectionAiBusy("");
    }
  }

  function applySuggestion(itemLabel: string) {
    const suggestion = suggestions.find((s) => s.item === itemLabel);
    if (!suggestion?.draftBody.trim()) return;
    const row = completeness.items.find((i) => i.item === itemLabel);
    let index = row?.sectionIndex ?? -1;
    if (index < 0 && suggestion.targetSectionTitle) {
      index = sections.findIndex(
        (s) => s.title.trim().toLowerCase() === suggestion.targetSectionTitle.trim().toLowerCase()
      );
    }
    if (index < 0 && row) {
      const shell = shellForChecklistItem(caseStudyMode, row);
      if (!shell) return;
      const next = [...sections, { ...shell, body: suggestion.draftBody }].map((section, i) => ({
        ...section,
        sortOrder: i,
      }));
      onChange(next);
      window.setTimeout(() => scrollToSection(next.length - 1), 50);
      return;
    }
    if (index < 0) return;
    const existing = sections[index]?.body?.trim() || "";
    if (existing && !window.confirm("Replace this section body with the AI suggestion?")) return;
    updateAt(index, { body: suggestion.draftBody });
    scrollToSection(index);
  }

  async function generateSectionBody(index: number) {
    await generateSectionField(index, "body");
  }

  async function generateSectionField(
    index: number,
    field: "body" | "alt" | "caption" | "quote",
    opts?: {
      skipConfirm?: boolean;
      emptyOnly?: boolean;
      toneOverride?: SectionCopyTone;
    }
  ): Promise<boolean> {
    const section = sections[index];
    if (!section) return false;
    if (!projectTitle.trim()) {
      onAiError?.("Add a project title before generating AI copy.");
      return false;
    }

    const existing =
      field === "body"
        ? section.body
        : field === "alt"
          ? String(section.data.alt || "")
          : field === "quote"
            ? String(section.data.quote || "")
            : String(section.data.caption || "");

    if (opts?.emptyOnly && existing.trim()) return false;
    if (!opts?.skipConfirm && !opts?.emptyOnly && existing.trim()) {
      const label = field === "body" ? "body" : field;
      if (!window.confirm(`This ${label} already has content. Replace it with AI-generated copy?`)) {
        return false;
      }
    }

    if ((field === "alt" || field === "caption" || field === "quote") && section.type === "image") {
      const src = String(section.data.src || section.data.url || "").trim();
      if (!src && field === "alt") {
        onAiError?.("Add an image (R2 key or URL) before generating alt text.");
        return false;
      }
    }

    if (field === "alt" && section.type === "video") {
      const videoSrc = String(section.data.src || section.data.url || "").trim();
      const posterSrc = String(section.data.poster || section.data.posterKey || "").trim();
      if (!videoSrc && !posterSrc) {
        onAiError?.("Add a video or poster before generating an accessibility label.");
        return false;
      }
    }

    if ((field === "caption" || field === "quote") && section.type === "gallery") {
      const imgs = gallerySrcs(section.data);
      if (imgs.length !== 1) {
        onAiError?.("Side caption/quote AI works when the gallery has exactly one image.");
        return false;
      }
    }

    const busyKey = `section:${index}:${field}`;
    setSectionAiBusy(busyKey);
    onAiError?.("");
    onAiMessage?.("");

    const siblingTitles = sections
      .map((s, i) => (i === index ? null : s.title.trim()))
      .filter(Boolean)
      .slice(0, 20)
      .join(" · ");

    const imageSrc =
      section.type === "image"
        ? String(section.data.src || section.data.url || "").trim()
        : section.type === "gallery"
          ? gallerySrcs(section.data)[0] || ""
          : section.type === "video"
            ? // Prefer poster for vision alt; fall back to text-only when poster is missing.
              String(section.data.poster || section.data.posterKey || "").trim()
            : "";
    const imageUrl = imageSrc ? mediaPreviewSrc(imageSrc) : "";
    const effectiveTone = opts?.toneOverride ?? tone;

    try {
      const res = await fetch("/api/admin/studio-hub/generate-section-copy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          title: projectTitle,
          sectionTitle: section.title,
          sectionType: section.type || "text",
          tone: effectiveTone,
          caseStudyMode,
          existingBody: existing,
          imageUrl: imageUrl || undefined,
          context: [projectContext, siblingTitles ? `Other sections: ${siblingTitles}` : ""]
            .filter(Boolean)
            .join("\n"),
        }),
      });
      const data = (await res.json()) as { value?: string; error?: string; code?: string };
      if (!res.ok || !data.value) {
        if (res.status === 401 || data.code === "admin_session") {
          throw new Error("Admin session expired. Open /admin/login, sign in again, then retry.");
        }
        throw new Error(data.error || "AI generation failed.");
      }
      if (field === "body") {
        updateAt(index, { body: data.value });
      } else if (field === "alt") {
        updateData(index, { alt: data.value });
      } else if (field === "quote") {
        updateData(index, { quote: data.value });
      } else {
        updateData(index, { caption: data.value });
      }
      if (!opts?.skipConfirm) {
        const toneLabel = SECTION_TONE_OPTIONS.find((t) => t.id === effectiveTone)?.label || effectiveTone;
        onAiMessage?.(
          field === "body"
            ? `Generated section ${index + 1} body (${toneLabel}).`
            : `Generated section ${index + 1} ${field}${field === "caption" || field === "quote" ? ` (${toneLabel})` : ""}.`
        );
      }
      return true;
    } catch (e) {
      onAiError?.(e instanceof Error ? e.message : "AI generation failed.");
      return false;
    } finally {
      setSectionAiBusy("");
    }
  }

  const countEmptyBodies = useCallback(() => {
    return sections.filter((section) => {
      const type = section.type || "text";
      if (!sectionUsesBody(type)) return false;
      return !section.body?.trim();
    }).length;
  }, [sections]);

  const generateAllBodies = useCallback(
    async (opts: { replaceAll: boolean; tone: SectionCopyTone }) => {
      if (!projectTitle.trim()) {
        onAiError?.("Add a project title before generating AI copy.");
        return 0;
      }

      let working = sections.map((section) => ({ ...section, data: { ...section.data } }));
      let filled = 0;

      for (let index = 0; index < working.length; index += 1) {
        const section = working[index];
        const type = section.type || "text";
        if (!sectionUsesBody(type)) continue;
        const existing = section.body?.trim() || "";
        if (!opts.replaceAll && existing) continue;

        const siblingTitles = working
          .map((s, i) => (i === index ? null : s.title.trim()))
          .filter(Boolean)
          .slice(0, 20)
          .join(" · ");

        const res = await fetch("/api/admin/studio-hub/generate-section-copy", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            field: "body",
            title: projectTitle,
            sectionTitle: section.title,
            sectionType: type,
            tone: opts.tone,
            caseStudyMode,
            existingBody: section.body || "",
            context: [projectContext, siblingTitles ? `Other sections: ${siblingTitles}` : ""]
              .filter(Boolean)
              .join("\n"),
          }),
        });
        const data = (await res.json()) as { value?: string; error?: string; code?: string };
        if (!res.ok || !data.value) {
          if (res.status === 401 || data.code === "admin_session") {
            throw new Error("Admin session expired. Open /admin/login, sign in again, then retry.");
          }
          throw new Error(data.error || "AI generation failed.");
        }
        working[index] = { ...section, body: data.value };
        filled += 1;
      }

      if (filled > 0) {
        onChange(working.map((section, i) => ({ ...section, sortOrder: i })));
      }
      return filled;
    },
    [sections, projectTitle, projectContext, caseStudyMode, onChange, onAiError]
  );

  useImperativeHandle(
    ref,
    () => ({
      generateAllBodies,
      countEmptyBodies,
    }),
    [generateAllBodies, countEmptyBodies]
  );

  async function generateAllSectionBodiesFromUi() {
    const empty = countEmptyBodies();
    const replaceAll = empty === 0;
    if (
      replaceAll &&
      !window.confirm(
        "Replace all case study section bodies with AI-generated copy using the selected AI voice?"
      )
    ) {
      return;
    }
    const effectiveTone = aiVoice ?? tone;
    setSectionAiBusy("sections:all");
    onAiError?.("");
    onAiMessage?.("");
    try {
      const filled = await generateAllBodies({ replaceAll, tone: effectiveTone });
      const toneLabel = SECTION_TONE_OPTIONS.find((t) => t.id === effectiveTone)?.label || effectiveTone;
      onAiMessage?.(
        replaceAll
          ? `Regenerated ${filled} section bod${filled === 1 ? "y" : "ies"} (${toneLabel}).`
          : `Filled ${filled} empty section bod${filled === 1 ? "y" : "ies"} (${toneLabel}).`
      );
    } finally {
      setSectionAiBusy("");
    }
  }

  const aiDisabled = Boolean(parentAiBusy || sectionAiBusy || suggestBusy) || !projectTitle.trim();

  return (
    <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/45">
            Case study sections
          </p>
          <p className="mt-1 max-w-xl text-[0.75rem] leading-relaxed text-white/45">
            Visual narrative for Mirotech <code className="text-white/60">/work/…</code>. Switch
            mode, seed the matching 10-section spine, then keep process visuals selected and
            scannable.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={AI_BTN_FIELD}
            disabled={aiDisabled || sections.length === 0}
            onClick={() => void generateAllSectionBodiesFromUi()}
          >
            {sectionAiBusy === "sections:all" ? "…" : "Generate all bodies"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-sky-400/35 bg-sky-500/10 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-sky-100 hover:bg-sky-500/20"
            onClick={seedTemplate}
          >
            Case study template
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/80 hover:bg-white/10"
            onClick={() => insertPrototype()}
          >
            Insert prototype
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/80 hover:bg-white/10"
            onClick={() =>
              onChange([
                ...sections,
                {
                  type: "text",
                  title: "",
                  body: "",
                  data: {},
                  sortOrder: sections.length,
                },
              ])
            }
          >
            Add section
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Case study mode">
        {CASE_STUDY_TEMPLATES.map((template) => {
          const active = caseStudyMode === template.id;
          return (
            <button
              key={template.id}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${
                active
                  ? "border-white/40 bg-white/15 text-white"
                  : "border-white/15 bg-transparent text-white/55 hover:text-white"
              }`}
              onClick={() => setMode(template.id)}
            >
              {template.label}
            </button>
          );
        })}
      </div>

      <ul className="space-y-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[0.7rem] text-white/45">
        {CASE_STUDY_CREDIBILITY_NOTES.map((note) => (
          <li key={note}>· {note}</li>
        ))}
      </ul>

      <details className="rounded-lg border border-white/10 bg-black/25 px-3 py-2" open>
        <summary className="cursor-pointer text-[0.7rem] font-medium uppercase tracking-[0.14em] text-white/55">
          Production checklist · {labelForCaseStudyMode(caseStudyMode)} · {completeness.doneCount}/
          {completeness.totalCount}
        </summary>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[0.7rem] text-white/40">
            Done items are connected to this project. Missing items jump to the gap.
          </p>
          <button
            type="button"
            className={AI_BTN_FIELD}
            disabled={aiDisabled || completeness.doneCount === completeness.totalCount}
            onClick={() => void suggestMissing()}
          >
            {suggestBusy ? "…" : "Suggest missing"}
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {completenessGroups.map(([group, rows]) => (
            <div key={group}>
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-white/50">
                {group} · {rows.filter((r) => r.status === "done").length}/{rows.length}
              </p>
              <ul className="mt-1 space-y-1.5">
                {rows.map((row) => {
                  const suggestion = suggestions.find((s) => s.item === row.item);
                  const done = row.status === "done";
                  return (
                    <li key={row.item} className="text-[0.7rem]">
                      <button
                        type="button"
                        className={`flex w-full items-start gap-2 rounded-md px-1 py-0.5 text-left ${
                          done
                            ? "text-white/40"
                            : "text-amber-100/85 hover:bg-white/5 hover:text-white"
                        }`}
                        onClick={() => addOrFocusShell(row)}
                      >
                        <span className="mt-0.5 w-3 shrink-0 text-[0.65rem]" aria-hidden>
                          {done ? "✓" : "○"}
                        </span>
                        <span>
                          <span className={done ? "line-through decoration-white/20" : ""}>
                            {row.item}
                          </span>
                          {!done && row.reason ? (
                            <span className="mt-0.5 block text-[0.65rem] text-white/40">
                              {row.reason}
                            </span>
                          ) : null}
                        </span>
                      </button>
                      {suggestion ? (
                        <div className="ml-5 mt-1 rounded-md border border-white/10 bg-black/30 px-2 py-2 text-[0.65rem] leading-relaxed text-white/55">
                          <p>{suggestion.note}</p>
                          {suggestion.draftBody ? (
                            <button
                              type="button"
                              className="mt-2 rounded border border-white/20 px-2 py-1 text-[0.6rem] uppercase tracking-[0.12em] text-white/70 hover:text-white"
                              onClick={() => applySuggestion(row.item)}
                            >
                              Apply to section
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </details>

      {sections.length === 0 ? (
        <p className="text-sm text-white/40">
          No sections yet. Seed the template, then paste condensed copy and attach screens via R2.
        </p>
      ) : null}

      {sections.map((section, index) => {
        const type = section.type || "text";
        const data = section.data || {};
        const imageSrc = String(data.src || data.url || "").trim();
        const gallery = gallerySrcs(data);
        const metrics = metricRows(data);
        const authorHint = hintForCaseStudySection(
          section.title || "",
          section.hint,
          caseStudyMode
        );
        const bodyBusy = sectionAiBusy === `section:${index}:body`;
        const altBusy = sectionAiBusy === `section:${index}:alt`;
        const captionBusy = sectionAiBusy === `section:${index}:caption`;
        const quoteBusy = sectionAiBusy === `section:${index}:quote`;

        return (
          <div
            key={section.clientKey || `hub-section-${index}`}
            id={`hub-section-${index}`}
            className="space-y-3 rounded-xl border border-white/10 bg-black/35 p-4 scroll-mt-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.16em] text-white/45">
                Section {index + 1}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-white/15 px-2 py-1 text-[0.65rem] text-white/60 hover:text-white disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="rounded border border-white/15 px-2 py-1 text-[0.65rem] text-white/60 hover:text-white disabled:opacity-30"
                  disabled={index === sections.length - 1}
                  onClick={() => move(index, 1)}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="rounded border border-white/15 px-2 py-1 text-[0.65rem] text-white/60 hover:text-white"
                  onClick={() => insertPrototype(index)}
                >
                  Prototype below
                </button>
                <button
                  type="button"
                  className="rounded border border-red-400/30 px-2 py-1 text-[0.65rem] text-red-200/80 hover:bg-red-500/10"
                  onClick={() => onChange(sections.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-white/70">
                Type
                <select
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                  value={type}
                  onChange={(e) => updateAt(index, { type: e.target.value })}
                >
                  {CASE_STUDY_SECTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t === "prototype" ? "live prototype" : t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-white/70">
                Title
                <input
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                  value={section.title}
                  onChange={(e) => updateAt(index, { title: e.target.value })}
                />
              </label>
            </div>

            {authorHint ? (
              <p className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.7rem] leading-relaxed text-white/45">
                {authorHint}
              </p>
            ) : null}

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-white/70">Body</span>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-md border border-white/15 bg-black/50 px-2 py-1 text-[0.7rem] text-white/80"
                    value={tone}
                    onChange={(e) => setToneManual(e.target.value as SectionToneId)}
                    disabled={aiDisabled && !bodyBusy}
                    aria-label={`Section ${index + 1} AI tone`}
                  >
                    {SECTION_TONE_OPTIONS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={AI_BTN_FIELD}
                    disabled={aiDisabled}
                    onClick={() => void generateSectionBody(index)}
                  >
                    {bodyBusy ? "…" : "AI"}
                  </button>
                </div>
              </div>
              <textarea
                className="mt-1 min-h-[72px] w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                value={section.body}
                onChange={(e) => updateAt(index, { body: e.target.value })}
              />
            </div>

            {type === "image" ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="block min-w-[12rem] flex-1 text-sm text-white/70">
                    Image (R2 key or URL)
                    <input
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 font-mono text-xs text-white"
                      value={imageSrc}
                      onChange={(e) => updateData(index, { src: e.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded-lg border border-white/20 px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-white/70 hover:text-white"
                    onClick={() => onBrowseR2({ kind: "image", index })}
                  >
                    Browse R2
                  </button>
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-white/70">Alt</span>
                    <button
                      type="button"
                      className={AI_BTN_FIELD}
                      disabled={aiDisabled}
                      onClick={() => void generateSectionField(index, "alt")}
                    >
                      {altBusy ? "…" : "AI"}
                    </button>
                  </div>
                  <input
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                    value={String(data.alt || "")}
                    onChange={(e) => updateData(index, { alt: e.target.value })}
                  />
                </div>
                <SideImageSidePanelControls
                  data={data}
                  onUpdate={(patch) => updateData(index, patch)}
                  aiDisabled={aiDisabled}
                  tone={tone}
                  onToneChange={setToneManual}
                  onGenerateCaption={() => void generateSectionField(index, "caption")}
                  onGenerateQuote={() => void generateSectionField(index, "quote")}
                  captionBusy={captionBusy}
                  quoteBusy={quoteBusy}
                  hint="Side panel appears on Mirotech next to the image. Body above stays as intro copy."
                />
                {imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaPreviewSrc(imageSrc)}
                    alt=""
                    className="mt-1 max-h-40 rounded-lg border border-white/10 object-cover"
                  />
                ) : null}
              </div>
            ) : null}

            {type === "gallery" ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-white/70">Gallery images</p>
                  <button
                    type="button"
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.14em] text-white/70 hover:text-white"
                    onClick={() => onBrowseR2({ kind: "gallery", index })}
                  >
                    Browse R2
                  </button>
                </div>
                {gallery.length === 0 ? (
                  <p className="text-xs text-white/40">No images yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {gallery.map((src, gi) => (
                      <li
                        key={`${src}-${gi}`}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 px-2 py-2"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={mediaPreviewSrc(src)}
                          alt=""
                          className="h-12 w-16 rounded object-cover"
                        />
                        <code className="min-w-0 flex-1 truncate text-[0.65rem] text-white/50">
                          {src}
                        </code>
                        <button
                          type="button"
                          className="text-[0.65rem] text-red-200/80"
                          onClick={() => {
                            const next = gallery.filter((_, i) => i !== gi).map((s) => ({ src: s }));
                            updateData(index, { images: next });
                          }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {gallery.length === 1 ? (
                  <SideImageSidePanelControls
                    data={data}
                    onUpdate={(patch) => updateData(index, patch)}
                    aiDisabled={aiDisabled}
                    tone={tone}
                    onToneChange={setToneManual}
                    onGenerateCaption={() => void generateSectionField(index, "caption")}
                    onGenerateQuote={() => void generateSectionField(index, "quote")}
                    captionBusy={captionBusy}
                    quoteBusy={quoteBusy}
                    hint="Single-image gallery: side caption or quote on Mirotech. Two or more images stay a grid."
                  />
                ) : gallery.length > 1 ? (
                  <p className="text-[0.7rem] text-white/40">
                    Multi-image galleries render as a grid; side caption/quote applies when there is
                    one image only.
                  </p>
                ) : null}
              </div>
            ) : null}

            {type === "video" ? (
              <div className="space-y-3">
                <p className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.7rem] leading-relaxed text-white/45">
                  Encode clips in{" "}
                  <a
                    href="/admin/video-port"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-200/90 underline-offset-2 hover:underline"
                  >
                    Video Port
                  </a>{" "}
                  (1080p H.264 — original never stored), then Browse R2 or paste the key. Poster stills
                  can come from Video Port, R2, or Image Port.
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="block min-w-[12rem] flex-1 text-sm text-white/70">
                    Video (R2 key or URL)
                    <input
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 font-mono text-xs text-white"
                      value={imageSrc}
                      onChange={(e) => updateData(index, { src: e.target.value })}
                      onBlur={(e) =>
                        updateData(index, { src: normalizePortfolioVideoKey(e.target.value) })
                      }
                      placeholder="mirotech/…/web_video/….mp4"
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded-lg border border-white/20 px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-white/70 hover:text-white"
                    onClick={() => onBrowseR2({ kind: "video", index })}
                  >
                    Browse R2
                  </button>
                  <a
                    href="/admin/video-port"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-sky-400/35 bg-sky-500/10 px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-sky-100 hover:bg-sky-500/20"
                  >
                    Video Port →
                  </a>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="block min-w-[12rem] flex-1 text-sm text-white/70">
                    Poster image (optional)
                    <input
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 font-mono text-xs text-white"
                      value={String(data.poster || data.posterKey || "").trim()}
                      onChange={(e) => updateData(index, { poster: e.target.value })}
                      onBlur={(e) =>
                        updateData(index, { poster: normalizePortfolioVideoKey(e.target.value) })
                      }
                      placeholder="mirotech/…/web_video/…-poster.webp"
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded-lg border border-white/20 px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-white/70 hover:text-white"
                    onClick={() => onBrowseR2({ kind: "video-poster", index })}
                  >
                    Browse R2
                  </button>
                  <a
                    href="/admin/image-port"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-white/20 px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-white/70 hover:text-white"
                  >
                    Image Port →
                  </a>
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-white/70">Alt / accessibility label</span>
                    <button
                      type="button"
                      className={AI_BTN_FIELD}
                      disabled={aiDisabled}
                      onClick={() => void generateSectionField(index, "alt")}
                    >
                      {altBusy ? "…" : "AI"}
                    </button>
                  </div>
                  <input
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                    value={String(data.alt || "")}
                    onChange={(e) => updateData(index, { alt: e.target.value })}
                    placeholder="Short description of the video"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-white/70">
                  <input
                    type="checkbox"
                    className="rounded border-white/30"
                    checked={isVideoLoopEnabled(data)}
                    onChange={(e) => updateData(index, { loop: e.target.checked })}
                  />
                  Loop video on Mirotech
                </label>
                {imageSrc ? (
                  looksLikeVideo(imageSrc) || looksLikeVideo(normalizePortfolioVideoKey(imageSrc)) ? (
                    <video
                      key={normalizePortfolioVideoKey(imageSrc)}
                      src={mediaPreviewSrc(normalizePortfolioVideoKey(imageSrc))}
                      poster={
                        String(data.poster || data.posterKey || "").trim()
                          ? mediaPreviewSrc(
                              normalizePortfolioVideoKey(
                                String(data.poster || data.posterKey || "")
                              )
                            )
                          : undefined
                      }
                      muted
                      loop={isVideoLoopEnabled(data)}
                      playsInline
                      controls
                      preload="metadata"
                      className="mt-1 max-h-48 w-full rounded-lg border border-white/10 object-cover"
                    />
                  ) : (
                    <p className="text-[0.7rem] text-amber-200/80">
                      Key does not look like a video file (.mp4 / .webm / .mov). Paste a full Video
                      Port key (e.g. mirotech/product/web_video/product-260826-01.mp4) or Browse R2.
                    </p>
                  )
                ) : null}
              </div>
            ) : null}

            {type === "quote" ? (
              <label className="block text-sm text-white/70">
                Attribution
                <input
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                  value={String(data.attribution || "")}
                  onChange={(e) => updateData(index, { attribution: e.target.value })}
                  placeholder="Optional — body is the quote"
                />
              </label>
            ) : null}

            {type === "link" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-white/70">
                  Href
                  <input
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                    value={String(data.href || "")}
                    onChange={(e) => updateData(index, { href: e.target.value })}
                  />
                </label>
                <label className="block text-sm text-white/70">
                  Label
                  <input
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                    value={String(data.label || "")}
                    onChange={(e) => updateData(index, { label: e.target.value })}
                  />
                </label>
              </div>
            ) : null}

            {type === "prototype" ? (
              <div className="space-y-3">
                <p className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.7rem] leading-relaxed text-white/45">
                  Renders in the public case study like any other section. Move it with Up / Down.
                  {prototypeUrl.trim()
                    ? " Uses the Project core URL unless you override it below."
                    : " Set the Project core prototype URL, or add an override below."}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm text-white/70">
                    URL override (optional)
                    <input
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 font-mono text-xs text-white"
                      value={String(data.href || data.url || "")}
                      onChange={(e) => updateData(index, { href: e.target.value })}
                      placeholder={prototypeUrl.trim() || "https://…"}
                    />
                  </label>
                  <label className="block text-sm text-white/70">
                    Link label
                    <input
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                      value={String(data.label || "")}
                      onChange={(e) => updateData(index, { label: e.target.value })}
                      placeholder="View prototype"
                    />
                  </label>
                </div>
              </div>
            ) : null}

            {type === "metrics" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-white/70">Metrics</p>
                  <button
                    type="button"
                    className="rounded border border-white/15 px-2 py-1 text-[0.65rem] text-white/60 hover:text-white"
                    onClick={() =>
                      updateData(index, {
                        items: [...metrics, { label: "", value: "" }],
                      })
                    }
                  >
                    Add metric
                  </button>
                </div>
                <p className="text-[0.7rem] leading-relaxed text-white/40">
                  Use <span className="text-white/60">Target:</span> … labels (or Result: only when
                  real). Never invent performance. Usability notes go in the reflection body, not as
                  fake KPIs.
                </p>
                {metrics.map((row, mi) => (
                  <div key={mi} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <input
                      className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
                      placeholder="Target: LP conversion"
                      value={row.label}
                      onChange={(e) => {
                        const next = metrics.map((m, i) =>
                          i === mi ? { ...m, label: e.target.value } : m
                        );
                        updateData(index, { items: next });
                      }}
                    />
                    <input
                      className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
                      placeholder="Value"
                      value={row.value}
                      onChange={(e) => {
                        const next = metrics.map((m, i) =>
                          i === mi ? { ...m, value: e.target.value } : m
                        );
                        updateData(index, { items: next });
                      }}
                    />
                    <button
                      type="button"
                      className="rounded border border-white/15 px-2 text-[0.65rem] text-white/50"
                      onClick={() =>
                        updateData(index, { items: metrics.filter((_, i) => i !== mi) })
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
});
