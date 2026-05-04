"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import type { PillarConfig } from "@/lib/portfolioPillars";
import type { WorkSection } from "@prisma/client";
import { getCropSafeMediaUrl, getPublicR2Url } from "@/lib/r2";
import R2BrowserModal from "@/components/admin/R2BrowserModal";
import ImageCropModal from "@/components/admin/ImageCropModal";
import AiEditableField from "@/components/admin/AiEditableField";
import type { ProjectCopyFieldKey, ProjectCopyTonePreset } from "@/lib/ai/generateProjectCopy";

function mediaUrl(key: string | null): string {
  if (!key) return "";
  if (/^(https?:|data:|blob:)/i.test(key) || key.startsWith("/")) return key;
  return getPublicR2Url(key);
}

function isVideoKey(key: string | null): boolean {
  if (!key) return false;
  const decoded = decodeURIComponent(key);
  try {
    const parsed = new URL(decoded, "https://brightline.local");
    const storageKey = parsed.searchParams.get("key") ?? "";
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(storageKey || parsed.pathname);
  } catch {
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(decoded);
  }
}

function formatFollowUpType(type: string) {
  if (type === "2_day") return "2-day check-in";
  if (type === "7_day") return "7-day usage help";
  if (type === "30_day") return "30-day next shoot";
  return type.replace(/_/g, " ");
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

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
  recommendedPlacement: string | null;
  confidenceScore: number | null;
  reason: string | null;
  deliveryGroup: string | null;
  usageSuggestion: string | null;
  clientFacingCaption: string | null;
  aiDescription: string | null;
  fileFormat: string | null;
  imagePurpose: string | null;
  selectedForDelivery: boolean;
  media: MediaAsset;
};

type FollowUpSchedule = {
  id: string;
  projectId: string;
  clientId: string;
  type: string;
  scheduledAt: string;
  sentAt: string | null;
  status: string;
  error: string | null;
};

type WorkProject = {
  id: string;
  section: WorkSection;
  title: string;
  slug: string;
  summary: string | null;
  description: string | null;
  location: string | null;
  year: number | null;
  published: boolean;
  isFeatured: boolean;
  sortOrder: number;
  heroMediaId: string | null;
  heroMedia: MediaAsset | null;
  backgroundMediaUrl: string | null;
  backgroundPosterUrl: string | null;
  finalPackageToken: string | null;
  attachedInvoiceId: string | null;
  clientPdfGeneratedAt: string | null;
  deliveryPreparedAt: string | null;
  media: ProjectMedia[];
  client?: string | null;
  projectType?: string | null;
  scope?: string | null;
  overviewExtended?: string | null;
  whatWasPhotographed?: string | null;
  visualApproach?: string | null;
  locationContext?: string | null;
  whoIsThisFor?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
  ctaCopy?: string | null;
  opening?: string | null;
  context?: string | null;
  approach?: string | null;
  highlight?: string | null;
  execution?: string | null;
  closing?: string | null;
  credits?: string | null;
  tags?: string[];
  followUpSchedules?: FollowUpSchedule[];
};

type AiBriefState = {
  clientName: string;
  projectTitle: string;
  projectType: string;
  pillar: string;
  shootType: string;
  location: string;
  whatWasPhotographed: string;
  visualApproach: string;
  targetAudience: string;
  projectGoal: string;
  notes: string;
  desiredStyle: string;
};

type GenerateAllChoice = "empty_only" | "replace_all";
type ChecklistStatus = "complete" | "missing" | "warning";
type PublishChecklistItem = {
  key: string;
  label: string;
  status: ChecklistStatus;
  detail: string;
  required: boolean;
};
type SeoCheckResult = {
  score: number;
  issues: string[];
  suggestions: string[];
  improvedSeoTitle?: string;
  improvedMetaDescription?: string;
  suggestedTags?: string[];
};
type CopyVersion = {
  id: string;
  projectId: string;
  fieldKey: ProjectCopyFieldKey;
  oldValue: string | null;
  newValue: string | null;
  promptMode: string;
  tonePreset: string | null;
  createdAt: string;
};
type BriefCaseStudyResult = {
  values?: Partial<Record<ProjectCopyFieldKey, string>>;
  imageDirectionNotes?: string;
  suggestedPlacement?: string;
};
type BriefCaseStudyMode = "draft_only" | "empty_only" | "replace_all";
type DeliveryRecommendation = {
  id: string;
  recommendedDeliveryGroup: string;
  usageSuggestion: string;
  clientFacingCaption: string;
  aiDescription: string;
  imagePurpose: string;
  confidenceScore: number;
};
type DeliveryPerformanceItem = {
  id: string;
  deliveryGroup: string;
  clientFacingCaption: string | null;
  downloadCount: number;
  viewCount: number;
  totalViewDurationMs: number;
  performanceScore: number;
  usageLikelihood: string | null;
  performanceRecommendedPlacement: string | null;
  mediaAsset: MediaAsset;
  deliveryPackage: { id: string; title: string; status: string };
};
type DeliveryPerformanceDashboard = {
  topPerforming: DeliveryPerformanceItem[];
  mostDownloaded: DeliveryPerformanceItem[];
  unusedHighValue: DeliveryPerformanceItem[];
};
type VisualReviewResult = {
  images: Array<{
    id: string;
    score: number;
    recommendedPlacement: "hero" | "supporting" | "social" | "archive";
    bestUseCase: "homepage hero" | "listing" | "ad campaign" | "social" | "print";
    useCaseConfidence: number;
    useCaseReasoning: string;
    isTopSelect: boolean;
    isWeak: boolean;
    reason: string;
  }>;
  duplicates: Array<{ ids: string[]; reason: string }>;
  topSelectIds: string[];
  weakImageIds: string[];
};

const VIDEO_EXT = new Set(["mp4", "webm", "mov"]);

const DESIRED_COPY_STYLES = [
  "Quiet luxury",
  "Editorial",
  "Commercial",
  "SEO-focused",
  "Case-study",
  "Minimal",
  "Warm and client-friendly",
  "High-end corporate",
];

const AI_TONE_PRESETS = [
  "Quiet luxury",
  "Minimal",
  "Editorial",
  "Commercial",
  "SEO-focused",
  "Warm client-friendly",
  "Corporate strategic",
  "More concise",
  "More polished",
  "More direct",
] as const;

const BRIEF_CASE_STUDY_FIELDS: ProjectCopyFieldKey[] = [
  "opening",
  "context",
  "approach",
  "highlightLine",
  "execution",
  "closing",
  "projectTags",
  "seoTitle",
  "metaDescription",
  "ctaCopy",
];

const DELIVERY_GROUPS = [
  "hero",
  "interior",
  "details",
  "web",
  "print",
  "social",
  "archive",
] as const;

const DELIVERY_GROUP_DESCRIPTIONS: Record<(typeof DELIVERY_GROUPS)[number], string> = {
  hero: "Best hero images for website, landing pages, banners, or campaign lead visuals.",
  interior: "Main space/environment images for architecture, office, real estate, and hospitality-style projects.",
  details: "Close-up images, textures, materials, product details, design moments, and supporting visuals.",
  web: "Optimized images for website use.",
  print: "High-resolution images for print, decks, brochures, signage, and press.",
  social: "Images recommended for Instagram, LinkedIn, reels covers, carousels, or social posts.",
  archive: "Delivered but not highlighted; useful backup or secondary images.",
};

const DELIVERY_TEXT_FIELDS = [
  ["usageSuggestion", "Usage suggestion"],
  ["clientFacingCaption", "Client-facing caption"],
  ["aiDescription", "AI description"],
  ["imagePurpose", "Image purpose"],
  ["fileFormat", "File format"],
] as const;

function isVideoFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return !!ext && VIDEO_EXT.has(ext);
}

async function resizeToThumb(file: File, maxWidth = 800): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxWidth) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas 2d unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
          "image/jpeg",
          0.85
        );
        return;
      }
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2d unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

export default function AdminWorkEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState<WorkProject | null>(null);
  const [, setSectionToPillar] = useState<Record<string, string>>({});
  const [pillars, setPillars] = useState<PillarConfig[]>([]);
  const [pillarSlug, setPillarSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [published, setPublished] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [heroMediaId, setHeroMediaId] = useState<string | null>(null);
  const [backgroundMediaUrl, setBackgroundMediaUrl] = useState("");
  const [backgroundPosterUrl, setBackgroundPosterUrl] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [r2BrowserTarget, setR2BrowserTarget] = useState<"gallery" | "backgroundMedia" | "backgroundPoster" | null>(null);
  const [imageCropModal, setImageCropModal] = useState<{
    mode: "hero" | "background";
    src: string;
    aspect?: number;
  } | null>(null);
  const [homepageFeaturedMediaId, setHomepageFeaturedMediaId] = useState<string | null>(null);
  const [caseStudyExpanded, setCaseStudyExpanded] = useState(false);
  const [client, setClient] = useState("");
  const [projectType, setProjectType] = useState("");
  const [scope, setScope] = useState("");
  const [overviewExtended, setOverviewExtended] = useState("");
  const [whatWasPhotographed, setWhatWasPhotographed] = useState("");
  const [visualApproach, setVisualApproach] = useState("");
  const [locationContext, setLocationContext] = useState("");
  const [whoIsThisFor, setWhoIsThisFor] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [ctaCopy, setCtaCopy] = useState("");
  const [editorialExpanded, setEditorialExpanded] = useState(false);
  const [opening, setOpening] = useState("");
  const [context, setContext] = useState("");
  const [approach, setApproach] = useState("");
  const [highlight, setHighlight] = useState("");
  const [execution, setExecution] = useState("");
  const [closing, setClosing] = useState("");
  const [credits, setCredits] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [aiBrief, setAiBrief] = useState<AiBriefState>({
    clientName: "",
    projectTitle: "",
    projectType: "",
    pillar: "",
    shootType: "",
    location: "",
    whatWasPhotographed: "",
    visualApproach: "",
    targetAudience: "",
    projectGoal: "",
    notes: "",
    desiredStyle: "Editorial",
  });
  const [aiLoadingByField, setAiLoadingByField] = useState<Partial<Record<ProjectCopyFieldKey, boolean>>>({});
  const [aiErrorByField, setAiErrorByField] = useState<Partial<Record<ProjectCopyFieldKey, string>>>({});
  const [aiUndoByField, setAiUndoByField] = useState<Partial<Record<ProjectCopyFieldKey, string>>>({});
  const [aiPendingByField, setAiPendingByField] = useState<Partial<Record<ProjectCopyFieldKey, boolean>>>({});
  const [aiDraftByField, setAiDraftByField] = useState<Partial<Record<ProjectCopyFieldKey, string>>>({});
  const [aiTonePreset, setAiTonePreset] = useState<ProjectCopyTonePreset>("Editorial");
  const [copyVersionsByField, setCopyVersionsByField] = useState<Partial<Record<ProjectCopyFieldKey, CopyVersion[]>>>({});
  const [versionsOpenByField, setVersionsOpenByField] = useState<Partial<Record<ProjectCopyFieldKey, boolean>>>({});
  const [versionsLoadingByField, setVersionsLoadingByField] = useState<Partial<Record<ProjectCopyFieldKey, boolean>>>({});
  const [compareVersionByField, setCompareVersionByField] = useState<Partial<Record<ProjectCopyFieldKey, string>>>({});
  const [generateAllOpen, setGenerateAllOpen] = useState(false);
  const [generateAllLoading, setGenerateAllLoading] = useState(false);
  const [generateAllError, setGenerateAllError] = useState("");
  const [briefCaseStudyNotes, setBriefCaseStudyNotes] = useState("");
  const [briefCaseStudyLoading, setBriefCaseStudyLoading] = useState(false);
  const [briefCaseStudyError, setBriefCaseStudyError] = useState("");
  const [briefCaseStudyResult, setBriefCaseStudyResult] = useState<BriefCaseStudyResult | null>(null);
  const [seoCheckLoading, setSeoCheckLoading] = useState(false);
  const [seoCheckError, setSeoCheckError] = useState("");
  const [seoCheckResult, setSeoCheckResult] = useState<SeoCheckResult | null>(null);
  const [altLoadingByMediaId, setAltLoadingByMediaId] = useState<Record<string, boolean>>({});
  const [altErrorByMediaId, setAltErrorByMediaId] = useState<Record<string, string>>({});
  const [placementLoadingByMediaId, setPlacementLoadingByMediaId] = useState<Record<string, boolean>>({});
  const [placementBulkLoading, setPlacementBulkLoading] = useState(false);
  const [placementError, setPlacementError] = useState("");
  const [deliveryRecommendations, setDeliveryRecommendations] = useState<Record<string, DeliveryRecommendation>>({});
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [followUpsError, setFollowUpsError] = useState("");
  const [deliveryPerformance, setDeliveryPerformance] = useState<DeliveryPerformanceDashboard | null>(null);
  const [visualReview, setVisualReview] = useState<VisualReviewResult | null>(null);
  const [visualReviewLoading, setVisualReviewLoading] = useState(false);

  const loadHomepageFeatured = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/site/homepage-featured");
      const data = (await res.json()) as { ok: boolean; mediaId?: string | null };
      if (data.ok && data.mediaId) setHomepageFeaturedMediaId(data.mediaId);
      else setHomepageFeaturedMediaId(null);
    } catch {
      setHomepageFeaturedMediaId(null);
    }
  }, []);

  useEffect(() => {
    void fetch("/api/admin/work-pillars")
      .then((r) => r.json())
      .then((d: { ok?: boolean; pillars?: PillarConfig[] }) => {
        if (d.ok && d.pillars?.length) {
          setPillars(
            [...d.pillars].sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug))
          );
        }
      });
  }, []);

  useEffect(() => {
    void loadHomepageFeatured();
  }, [loadHomepageFeatured]);

  const loadProject = useCallback(async () => {
    if (id === "new") return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/work-projects/${id}`);
      const data = (await res.json()) as {
        ok: boolean;
        project?: WorkProject;
        sectionToPillar?: Record<string, string>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      const map = data.sectionToPillar;
      if (map) setSectionToPillar(map);
      const p = data.project;
      if (p) {
        setProject(p);
        setPillarSlug(map?.[p.section] ?? "");
        setTitle(p.title);
        setSlug(p.slug);
        setSummary(p.summary ?? "");
        setDescription(p.description ?? "");
        setLocation(p.location ?? "");
        setYear(p.year ?? "");
        setPublished(p.published);
        setIsFeatured(p.isFeatured);
        setSortOrder(p.sortOrder);
        setHeroMediaId(p.heroMediaId);
        setBackgroundMediaUrl(p.backgroundMediaUrl ?? "");
        setBackgroundPosterUrl(p.backgroundPosterUrl ?? "");
        setClient(p.client ?? "");
        setProjectType(p.projectType ?? "");
        setScope(p.scope ?? "");
        setOverviewExtended(p.overviewExtended ?? "");
        setWhatWasPhotographed(p.whatWasPhotographed ?? "");
        setVisualApproach(p.visualApproach ?? "");
        setLocationContext(p.locationContext ?? "");
        setWhoIsThisFor(p.whoIsThisFor ?? "");
        setSeoTitle(p.seoTitle ?? "");
        setMetaDescription(p.metaDescription ?? "");
        setCtaCopy(p.ctaCopy ?? "");
        setOpening(p.opening ?? "");
        setContext(p.context ?? "");
        setApproach(p.approach ?? "");
        setHighlight(p.highlight ?? "");
        setExecution(p.execution ?? "");
        setClosing(p.closing ?? "");
        setCredits(p.credits ?? "");
        setTagsRaw((p.tags ?? []).join(", "));
        setAiBrief((prev) => ({
          ...prev,
          clientName: p.client ?? prev.clientName,
          projectTitle: p.title ?? prev.projectTitle,
          projectType: p.projectType ?? prev.projectType,
          pillar: map?.[p.section] ?? prev.pillar,
          location: p.location ?? prev.location,
          whatWasPhotographed: p.whatWasPhotographed ?? prev.whatWasPhotographed,
          visualApproach: p.visualApproach ?? prev.visualApproach,
        }));
        const hasEditorial =
          (p.opening || p.context || p.approach || p.highlight || p.execution || p.closing || p.credits ||
            (p.tags && p.tags.length > 0));
        if (hasEditorial) setEditorialExpanded(true);
        const hasCaseStudy =
          (p.client || p.projectType || p.scope || p.overviewExtended || p.whatWasPhotographed ||
            p.visualApproach || p.locationContext || p.whoIsThisFor || p.seoTitle || p.metaDescription || p.ctaCopy);
        if (hasCaseStudy) setCaseStudyExpanded(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (!id || id === "new") return;
    void fetch(`/api/admin/projects/${id}/delivery-performance`, { credentials: "include" })
      .then((res) => res.json())
      .then((data: { ok?: boolean } & Partial<DeliveryPerformanceDashboard>) => {
        if (data.ok) {
          setDeliveryPerformance({
            topPerforming: data.topPerforming ?? [],
            mostDownloaded: data.mostDownloaded ?? [],
            unusedHighValue: data.unusedHighValue ?? [],
          });
        }
      })
      .catch(() => null);
  }, [id, project?.deliveryPreparedAt]);

  const copyFieldState: Record<ProjectCopyFieldKey, { value: string; setValue: (value: string) => void }> = {
    opening: { value: opening, setValue: setOpening },
    context: { value: context, setValue: setContext },
    approach: { value: approach, setValue: setApproach },
    highlightLine: { value: highlight, setValue: setHighlight },
    execution: { value: execution, setValue: setExecution },
    closing: { value: closing, setValue: setClosing },
    credits: { value: credits, setValue: setCredits },
    projectTags: { value: tagsRaw, setValue: setTagsRaw },
    client: { value: client, setValue: setClient },
    projectTypeLegacy: { value: projectType, setValue: setProjectType },
    scope: { value: scope, setValue: setScope },
    overviewExtended: { value: overviewExtended, setValue: setOverviewExtended },
    whatWasPhotographed: { value: whatWasPhotographed, setValue: setWhatWasPhotographed },
    visualApproachLegacy: { value: visualApproach, setValue: setVisualApproach },
    locationContext: { value: locationContext, setValue: setLocationContext },
    whoThisPhotographyServes: { value: whoIsThisFor, setValue: setWhoIsThisFor },
    seoTitle: { value: seoTitle, setValue: setSeoTitle },
    metaDescription: { value: metaDescription, setValue: setMetaDescription },
    ctaCopy: { value: ctaCopy, setValue: setCtaCopy },
  };

  function existingCopyValues() {
    return Object.fromEntries(
      Object.entries(copyFieldState).map(([fieldKey, state]) => [fieldKey, state.value])
    ) as Record<ProjectCopyFieldKey, string>;
  }

  function aiBriefPayload() {
    return {
      ...aiBrief,
      clientName: aiBrief.clientName || client,
      projectTitle: aiBrief.projectTitle || title,
      projectType: aiBrief.projectType || projectType,
      pillar: aiBrief.pillar || pillarSlug,
      location: aiBrief.location || location,
      whatWasPhotographed: aiBrief.whatWasPhotographed || whatWasPhotographed,
      visualApproach: aiBrief.visualApproach || visualApproach,
    };
  }

  async function saveCopyVersions(
    versions: Array<{
      fieldKey: ProjectCopyFieldKey;
      oldValue: string;
      newValue: string;
      promptMode: string;
      tonePreset?: string | null;
    }>
  ) {
    if (!versions.length || id === "new") return;
    try {
      await fetch(`/api/admin/work-projects/${id}/copy-versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ versions }),
      });
    } catch (err) {
      console.error("COPY_VERSION_SAVE_ERROR", err);
    }
  }

  async function loadCopyVersions(fieldKey: ProjectCopyFieldKey) {
    if (id === "new") return;
    setVersionsLoadingByField((prev) => ({ ...prev, [fieldKey]: true }));
    try {
      const res = await fetch(`/api/admin/work-projects/${id}/copy-versions?fieldKey=${encodeURIComponent(fieldKey)}`, {
        credentials: "include",
      });
      const data = (await res.json()) as { versions?: CopyVersion[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load versions.");
      setCopyVersionsByField((prev) => ({ ...prev, [fieldKey]: data.versions ?? [] }));
    } catch (err) {
      setAiErrorByField((prev) => ({
        ...prev,
        [fieldKey]: err instanceof Error ? err.message : "Failed to load versions.",
      }));
    } finally {
      setVersionsLoadingByField((prev) => ({ ...prev, [fieldKey]: false }));
    }
  }

  function toggleCopyVersions(fieldKey: ProjectCopyFieldKey) {
    const nextOpen = !versionsOpenByField[fieldKey];
    setVersionsOpenByField((prev) => ({ ...prev, [fieldKey]: nextOpen }));
    if (nextOpen) void loadCopyVersions(fieldKey);
  }

  function restoreCopyVersion(fieldKey: ProjectCopyFieldKey, version: CopyVersion) {
    const field = copyFieldState[fieldKey];
    setAiUndoByField((prev) => ({ ...prev, [fieldKey]: field.value }));
    field.setValue(version.newValue ?? "");
    setAiPendingByField((prev) => ({ ...prev, [fieldKey]: true }));
  }

  function applyGeneratedField(fieldKey: ProjectCopyFieldKey, value: string) {
    const field = copyFieldState[fieldKey];
    field.setValue(value);
    setAiPendingByField((prev) => ({ ...prev, [fieldKey]: true }));
  }

  async function generateField(fieldKey: ProjectCopyFieldKey) {
    const field = copyFieldState[fieldKey];
    if (field.value.trim()) {
      const ok = confirm("This field already has content. Replace it with AI-generated copy?");
      if (!ok) return;
    }
    setAiErrorByField((prev) => ({ ...prev, [fieldKey]: "" }));
    setAiLoadingByField((prev) => ({ ...prev, [fieldKey]: true }));
    try {
      const res = await fetch("/api/admin/projects/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          projectId: id,
          mode: "single_field",
          fieldKey,
          tonePreset: aiTonePreset,
          brief: aiBriefPayload(),
          existingValues: existingCopyValues(),
        }),
      });
      const data = (await res.json()) as { fieldKey?: ProjectCopyFieldKey; value?: string; error?: string };
      if (!res.ok || !data.value) throw new Error(data.error ?? "AI generation failed.");
      const targetField = data.fieldKey ?? fieldKey;
      const oldValue = copyFieldState[targetField].value;
      setAiUndoByField((prev) => ({ ...prev, [targetField]: oldValue }));
      applyGeneratedField(targetField, data.value);
      void saveCopyVersions([
        {
          fieldKey: targetField,
          oldValue,
          newValue: data.value,
          promptMode: "single_field",
          tonePreset: aiTonePreset,
        },
      ]);
    } catch (err) {
      setAiErrorByField((prev) => ({
        ...prev,
        [fieldKey]: err instanceof Error ? err.message : "AI generation failed.",
      }));
    } finally {
      setAiLoadingByField((prev) => ({ ...prev, [fieldKey]: false }));
    }
  }

  function undoGeneratedField(fieldKey: ProjectCopyFieldKey) {
    const previous = aiUndoByField[fieldKey];
    if (previous === undefined) return;
    copyFieldState[fieldKey].setValue(previous);
    setAiPendingByField((prev) => ({ ...prev, [fieldKey]: false }));
    setAiUndoByField((prev) => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  }

  function acceptGeneratedField(fieldKey: ProjectCopyFieldKey) {
    setAiPendingByField((prev) => ({ ...prev, [fieldKey]: false }));
  }

  async function rewriteFieldWithTone(fieldKey: ProjectCopyFieldKey) {
    const field = copyFieldState[fieldKey];
    const sourceText = field.value.trim();
    if (!sourceText) return;
    setAiErrorByField((prev) => ({ ...prev, [fieldKey]: "" }));
    setAiLoadingByField((prev) => ({ ...prev, [fieldKey]: true }));
    try {
      const res = await fetch("/api/admin/projects/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          projectId: id,
          mode: "rewrite_field",
          fieldKey,
          sourceText,
          tonePreset: aiTonePreset,
          brief: aiBriefPayload(),
          existingValues: existingCopyValues(),
        }),
      });
      const data = (await res.json()) as { fieldKey?: ProjectCopyFieldKey; value?: string; error?: string };
      if (!res.ok || !data.value) throw new Error(data.error ?? "AI rewrite failed.");
      const targetField = data.fieldKey ?? fieldKey;
      setAiDraftByField((prev) => ({ ...prev, [targetField]: data.value ?? "" }));
      void saveCopyVersions([
        {
          fieldKey: targetField,
          oldValue: sourceText,
          newValue: data.value,
          promptMode: "rewrite_field",
          tonePreset: aiTonePreset,
        },
      ]);
    } catch (err) {
      setAiErrorByField((prev) => ({
        ...prev,
        [fieldKey]: err instanceof Error ? err.message : "AI rewrite failed.",
      }));
    } finally {
      setAiLoadingByField((prev) => ({ ...prev, [fieldKey]: false }));
    }
  }

  function acceptRewriteDraft(fieldKey: ProjectCopyFieldKey) {
    const draft = aiDraftByField[fieldKey];
    if (draft === undefined) return;
    const before = copyFieldState[fieldKey].value;
    copyFieldState[fieldKey].setValue(draft);
    setAiUndoByField((prev) => ({ ...prev, [fieldKey]: before }));
    setAiPendingByField((prev) => ({ ...prev, [fieldKey]: true }));
    setAiDraftByField((prev) => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  }

  function discardRewriteDraft(fieldKey: ProjectCopyFieldKey) {
    setAiDraftByField((prev) => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  }

  async function requestGenerateAll(choice: GenerateAllChoice) {
    setGenerateAllError("");
    setGenerateAllLoading(true);
    const before = existingCopyValues();
    try {
      const res = await fetch("/api/admin/projects/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          projectId: id,
          mode: "all_fields",
          tonePreset: aiTonePreset,
          brief: aiBriefPayload(),
          existingValues: before,
        }),
      });
      const data = (await res.json()) as {
        values?: Partial<Record<ProjectCopyFieldKey, string>>;
        error?: string;
      };
      if (!res.ok || !data.values) throw new Error(data.error ?? "AI generation failed.");
      const undoUpdates: Partial<Record<ProjectCopyFieldKey, string>> = {};
      const pendingUpdates: Partial<Record<ProjectCopyFieldKey, boolean>> = {};
      const versionUpdates: Array<{
        fieldKey: ProjectCopyFieldKey;
        oldValue: string;
        newValue: string;
        promptMode: string;
        tonePreset?: string | null;
      }> = [];
      for (const [fieldKey, generatedValue] of Object.entries(data.values) as Array<[ProjectCopyFieldKey, string]>) {
        if (choice === "empty_only" && before[fieldKey]?.trim()) continue;
        if (generatedValue === undefined) continue;
        undoUpdates[fieldKey] = before[fieldKey] ?? "";
        pendingUpdates[fieldKey] = true;
        copyFieldState[fieldKey].setValue(generatedValue);
        versionUpdates.push({
          fieldKey,
          oldValue: before[fieldKey] ?? "",
          newValue: generatedValue,
          promptMode: "all_fields",
          tonePreset: aiTonePreset,
        });
      }
      setAiUndoByField((prev) => ({ ...prev, ...undoUpdates }));
      setAiPendingByField((prev) => ({ ...prev, ...pendingUpdates }));
      void saveCopyVersions(versionUpdates);
      setGenerateAllOpen(false);
    } catch (err) {
      setGenerateAllError(err instanceof Error ? err.message : "AI generation failed.");
    } finally {
      setGenerateAllLoading(false);
    }
  }

  function startGenerateAll() {
    const hasExistingCopy = Object.values(existingCopyValues()).some((value) => value.trim());
    if (hasExistingCopy) {
      setGenerateAllError("");
      setGenerateAllOpen(true);
      return;
    }
    void requestGenerateAll("replace_all");
  }

  function applyBriefCaseStudyResult(result: BriefCaseStudyResult, mode: Exclude<BriefCaseStudyMode, "draft_only">) {
    const values = result.values ?? {};
    const before = existingCopyValues();
    const undoUpdates: Partial<Record<ProjectCopyFieldKey, string>> = {};
    const pendingUpdates: Partial<Record<ProjectCopyFieldKey, boolean>> = {};
    const versionUpdates: Array<{
      fieldKey: ProjectCopyFieldKey;
      oldValue: string;
      newValue: string;
      promptMode: string;
      tonePreset?: string | null;
    }> = [];

    for (const fieldKey of BRIEF_CASE_STUDY_FIELDS) {
      const generatedValue = values[fieldKey];
      if (generatedValue === undefined) continue;
      if (mode === "empty_only" && before[fieldKey]?.trim()) continue;
      undoUpdates[fieldKey] = before[fieldKey] ?? "";
      pendingUpdates[fieldKey] = true;
      copyFieldState[fieldKey].setValue(generatedValue);
      versionUpdates.push({
        fieldKey,
        oldValue: before[fieldKey] ?? "",
        newValue: generatedValue,
        promptMode: "brief_case_study",
        tonePreset: aiTonePreset,
      });
    }

    setAiUndoByField((prev) => ({ ...prev, ...undoUpdates }));
    setAiPendingByField((prev) => ({ ...prev, ...pendingUpdates }));
    void saveCopyVersions(versionUpdates);
  }

  async function generateBriefCaseStudy(mode: BriefCaseStudyMode) {
    if (!briefCaseStudyNotes.trim()) {
      setBriefCaseStudyError("Paste rough project notes first.");
      return;
    }
    if (mode === "replace_all") {
      const ok = confirm("Replace all case study fields with this AI draft?");
      if (!ok) return;
    }

    setBriefCaseStudyError("");
    setBriefCaseStudyLoading(true);
    try {
      const res = await fetch("/api/admin/projects/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          projectId: id,
          mode: "brief_case_study",
          sourceText: briefCaseStudyNotes,
          tonePreset: aiTonePreset,
          brief: aiBriefPayload(),
          existingValues: existingCopyValues(),
        }),
      });
      const data = (await res.json()) as BriefCaseStudyResult & { error?: string };
      if (!res.ok || !data.values) throw new Error(data.error ?? "Brief to case study failed.");
      setBriefCaseStudyResult(data);
      if (mode !== "draft_only") applyBriefCaseStudyResult(data, mode);
    } catch (err) {
      setBriefCaseStudyError(err instanceof Error ? err.message : "Brief to case study failed.");
    } finally {
      setBriefCaseStudyLoading(false);
    }
  }

  function renderAiField({
    label,
    fieldKey,
    description,
    placeholder,
    multiline = true,
    rows = 2,
  }: {
    label: string;
    fieldKey: ProjectCopyFieldKey;
    description?: string;
    placeholder?: string;
    multiline?: boolean;
    rows?: number;
  }) {
    const field = copyFieldState[fieldKey];
    const versions = copyVersionsByField[fieldKey] ?? [];
    const comparedVersion = versions.find((version) => version.id === compareVersionByField[fieldKey]);
    return (
      <div>
        <AiEditableField
          label={label}
          fieldKey={fieldKey}
          description={description}
          value={field.value}
          onChange={field.setValue}
          onGenerate={() => void generateField(fieldKey)}
          onRewrite={() => void rewriteFieldWithTone(fieldKey)}
          onUndo={() => undoGeneratedField(fieldKey)}
          onAccept={() => acceptGeneratedField(fieldKey)}
          tonePreset={aiTonePreset}
          tonePresets={AI_TONE_PRESETS}
          onTonePresetChange={(value) => setAiTonePreset(value as ProjectCopyTonePreset)}
          aiDraft={aiDraftByField[fieldKey] ?? null}
          onAcceptDraft={() => acceptRewriteDraft(fieldKey)}
          onDiscardDraft={() => discardRewriteDraft(fieldKey)}
          placeholder={placeholder}
          multiline={multiline}
          rows={rows}
          loading={Boolean(aiLoadingByField[fieldKey])}
          error={aiErrorByField[fieldKey] || null}
          hasUndo={aiUndoByField[fieldKey] !== undefined}
          hasPendingAi={Boolean(aiPendingByField[fieldKey])}
        />
        <button
          type="button"
          className="mt-2 text-xs text-black/45 underline-offset-2 hover:text-black hover:underline"
          onClick={() => toggleCopyVersions(fieldKey)}
        >
          {versionsOpenByField[fieldKey] ? "Hide previous versions" : "View previous versions"}
        </button>
        {versionsOpenByField[fieldKey] ? (
          <div className="mt-2 rounded-lg border border-black/10 bg-black/[0.02] p-3">
            {versionsLoadingByField[fieldKey] ? (
              <p className="text-xs text-black/45">Loading versions…</p>
            ) : versions.length ? (
              <div className="space-y-3">
                {versions.slice(0, 6).map((version) => (
                  <div key={version.id} className="border-b border-black/10 pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-black/50">
                        {new Date(version.createdAt).toLocaleString()} · {version.promptMode}
                        {version.tonePreset ? ` · ${version.tonePreset}` : ""}
                      </p>
                      <div className="flex gap-2">
                        <button type="button" className="btn btn-ghost text-xs" onClick={() => restoreCopyVersion(fieldKey, version)}>
                          Restore version
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost text-xs"
                          onClick={() =>
                            setCompareVersionByField((prev) => ({
                              ...prev,
                              [fieldKey]: prev[fieldKey] === version.id ? "" : version.id,
                            }))
                          }
                        >
                          Compare
                        </button>
                      </div>
                    </div>
                    {comparedVersion?.id === version.id ? (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div className="rounded border border-black/10 bg-white p-2">
                          <p className="text-[10px] uppercase tracking-wide text-black/40">Current</p>
                          <p className="mt-1 whitespace-pre-wrap text-xs text-black/70">{field.value || "Empty"}</p>
                        </div>
                        <div className="rounded border border-black/10 bg-white p-2">
                          <p className="text-[10px] uppercase tracking-wide text-black/40">Previous version</p>
                          <p className="mt-1 whitespace-pre-wrap text-xs text-black/70">{version.newValue || "Empty"}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-black/45">No saved AI or save versions yet.</p>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  async function checkSeo() {
    setSeoCheckError("");
    setSeoCheckLoading(true);
    try {
      const imageAltText = (project?.media ?? [])
        .filter((pm) => pm.media.kind === "IMAGE")
        .map((pm) => pm.media.alt ?? "");
      const res = await fetch("/api/admin/projects/seo-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          projectId: id,
          projectTitle: title,
          slug,
          pillar: pillarSlug,
          seoTitle,
          metaDescription,
          projectTags: tagsRaw,
          opening,
          imageAltText,
          ctaCopy,
        }),
      });
      const data = (await res.json()) as SeoCheckResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "SEO check failed.");
      setSeoCheckResult({
        score: data.score,
        issues: Array.isArray(data.issues) ? data.issues : [],
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        improvedSeoTitle: data.improvedSeoTitle,
        improvedMetaDescription: data.improvedMetaDescription,
        suggestedTags: Array.isArray(data.suggestedTags) ? data.suggestedTags : undefined,
      });
    } catch (err) {
      setSeoCheckError(err instanceof Error ? err.message : "SEO check failed.");
    } finally {
      setSeoCheckLoading(false);
    }
  }

  function confirmReplace(label: string, currentValue: string) {
    if (!currentValue.trim()) return true;
    return confirm(`${label} already has content. Replace it with the AI SEO suggestion?`);
  }

  function applyImprovedSeoTitle() {
    const next = seoCheckResult?.improvedSeoTitle?.trim();
    if (!next) return;
    if (!confirmReplace("SEO title", seoTitle)) return;
    setSeoTitle(next);
  }

  function applyImprovedMetaDescription() {
    const next = seoCheckResult?.improvedMetaDescription?.trim();
    if (!next) return;
    if (!confirmReplace("Meta description", metaDescription)) return;
    setMetaDescription(next);
  }

  function applySuggestedTags() {
    const next = seoCheckResult?.suggestedTags?.map((tag) => tag.trim()).filter(Boolean).join(", ");
    if (!next) return;
    if (!confirmReplace("Project tags", tagsRaw)) return;
    setTagsRaw(next);
  }

  async function handleSaveProject(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus("saving");
    setSaveError("");
    try {
      if (published && missingRequired.length > 0) {
        throw new Error(
          `Cannot publish yet. Missing: ${missingRequired.map((item) => item.label).join(", ")}.`
        );
      }
      const res = await fetch(`/api/admin/work-projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || null,
          pillar: pillarSlug.trim(),
          summary: summary.trim() ? summary.trim() : null,
          description: description.trim() ? description.trim() : null,
          location: location.trim() ? location.trim() : null,
          year: year === "" ? null : (Number.isFinite(Number(year)) ? Number(year) : null),
          published,
          isFeatured,
          sortOrder,
          heroMediaId,
          backgroundMediaUrl: backgroundMediaUrl.trim() || null,
          backgroundPosterUrl: backgroundPosterUrl.trim() || null,
          client: client.trim() || null,
          projectType: projectType.trim() || null,
          scope: scope.trim() || null,
          overviewExtended: overviewExtended.trim() || null,
          whatWasPhotographed: whatWasPhotographed.trim() || null,
          visualApproach: visualApproach.trim() || null,
          locationContext: locationContext.trim() || null,
          whoIsThisFor: whoIsThisFor.trim() || null,
          seoTitle: seoTitle.trim() || null,
          metaDescription: metaDescription.trim() || null,
          ctaCopy: ctaCopy.trim() || null,
          opening: opening.trim() || null,
          context: context.trim() || null,
          approach: approach.trim() || null,
          highlight: highlight.trim() || null,
          execution: execution.trim() || null,
          closing: closing.trim() || null,
          credits: credits.trim() || null,
          tags: tagsRaw
            .split(/[,;]/)
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        project?: WorkProject;
        sectionToPillar?: Record<string, string>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      if (data.sectionToPillar) setSectionToPillar(data.sectionToPillar);
      if (data.project) {
        setProject(data.project);
        const m = data.sectionToPillar;
        setPillarSlug(m?.[data.project.section] ?? pillarSlug);
      }
      setSaveStatus("idle");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
      setSaveStatus("error");
    }
  }

  async function registerGalleryImageWithThumb(file: File, keyFull: string): Promise<string> {
    const thumbBlob = await resizeToThumb(file);
    const thumbFilename = file.name.replace(/\.[^.]+$/, "-thumb.jpg");

    const thumbUploadRes = await fetch(`/api/admin/work-projects/${id}/upload-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: thumbFilename,
        contentType: "image/jpeg",
        subfolder: "thumb",
      }),
    });
    const thumbUploadData = (await thumbUploadRes.json()) as {
      ok: boolean;
      url?: string;
      headers?: Record<string, string>;
      key?: string;
      error?: string;
    };
    if (!thumbUploadRes.ok || !thumbUploadData.url || !thumbUploadData.key) {
      throw new Error(thumbUploadData.error ?? "Failed to get thumb upload URL");
    }
    const thumbPutRes = await fetch(thumbUploadData.url, {
      method: "PUT",
      body: thumbBlob,
      headers: { "Content-Type": "image/jpeg", ...(thumbUploadData.headers ?? {}) },
    });
    if (!thumbPutRes.ok) throw new Error("Thumb upload failed");
    const keyThumb = thumbUploadData.key;

    const img = await createImageBitmap(file);
    const width = img.width;
    const height = img.height;
    img.close();

    const mediaId = await addMedia({ keyFull, keyThumb, kind: "IMAGE", width, height });
    if (!mediaId) throw new Error("Failed to register image.");
    return mediaId;
  }

  /** Full upload pipeline for gallery images (used after cropping). */
  async function uploadGalleryImageFromFile(file: File): Promise<string> {
    const contentType = file.type || "image/jpeg";

    const uploadRes = await fetch(`/api/admin/work-projects/${id}/upload-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType,
        subfolder: "full",
      }),
    });
    const uploadData = (await uploadRes.json()) as {
      ok: boolean;
      url?: string;
      headers?: Record<string, string>;
      key?: string;
      error?: string;
    };
    if (!uploadRes.ok || !uploadData.url || !uploadData.key) {
      const msg = uploadData.error ?? (uploadRes.status === 401 ? "Please log in again" : "Failed to get upload URL");
      throw new Error(msg);
    }

    const putRes = await fetch(uploadData.url, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": contentType, ...(uploadData.headers ?? {}) },
    });
    if (!putRes.ok) {
      const hint = putRes.status === 403 ? " (R2 CORS or bucket config)" : "";
      throw new Error(`Upload to storage failed${hint}`);
    }

    return registerGalleryImageWithThumb(file, uploadData.key);
  }

  async function uploadFile(file: File): Promise<void> {
    const label = file.name;
    setUploadProgress((p) => ({ ...p, [label]: "uploading" }));
    try {
      const isVideo = isVideoFile(file);
      const subfolder = isVideo ? "video" : "full";
      const contentType = file.type || (isVideo ? "video/mp4" : "image/jpeg");

      const uploadRes = await fetch(`/api/admin/work-projects/${id}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType,
          subfolder,
        }),
      });
      const uploadData = (await uploadRes.json()) as {
        ok: boolean;
        url?: string;
        headers?: Record<string, string>;
        key?: string;
        error?: string;
      };
      if (!uploadRes.ok || !uploadData.url || !uploadData.key) {
        const msg = uploadData.error ?? (uploadRes.status === 401 ? "Please log in again" : "Failed to get upload URL");
        throw new Error(msg);
      }

      const putRes = await fetch(uploadData.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType, ...(uploadData.headers ?? {}) },
      });
      if (!putRes.ok) {
        const hint = putRes.status === 403 ? " (R2 CORS or bucket config)" : "";
        throw new Error(`Upload to storage failed${hint}`);
      }

      const keyFull = uploadData.key;

      if (isVideo) {
        await addMedia({ keyFull, kind: "VIDEO" });
      } else {
        await registerGalleryImageWithThumb(file, keyFull);
      }

      setUploadProgress((p) => {
        const next = { ...p };
        delete next[label];
        return next;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setUploadProgress((p) => ({ ...p, [label]: msg }));
      setSaveError(msg);
      setUploadStatus("error");
    }
  }

  async function handleAddKeysFromR2(keys: string[]) {
    setSaveError("");
    const first = keys[0]?.trim();
    if (r2BrowserTarget === "backgroundMedia") {
      if (first) {
        setBackgroundMediaUrl(first);
        await saveBackgroundSettings(first, backgroundPosterUrl);
      }
      setR2BrowserTarget(null);
      return;
    }
    if (r2BrowserTarget === "backgroundPoster") {
      if (first) {
        setBackgroundPosterUrl(first);
        await saveBackgroundSettings(backgroundMediaUrl, first);
      }
      setR2BrowserTarget(null);
      return;
    }
    try {
      for (const key of keys) {
        const ext = key.split(".").pop()?.toLowerCase();
        const kind = ext === "mp4" || ext === "webm" || ext === "mov" ? ("VIDEO" as const) : ("IMAGE" as const);
        await addMedia({ keyFull: key, kind });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add media";
      setSaveError(msg);
      throw err;
    }
  }

  async function saveBackgroundSettings(nextMedia: string, nextPoster: string) {
    if (id === "new") return;
    setSaveStatus("saving");
    setSaveError("");
    try {
      const res = await fetch(`/api/admin/work-projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backgroundMediaUrl: nextMedia.trim() || null,
          backgroundPosterUrl: nextPoster.trim() || null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; project?: WorkProject; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save background.");
      if (data.project) setProject(data.project);
      setSaveStatus("idle");
    } catch (err) {
      setSaveStatus("error");
      const msg = err instanceof Error ? err.message : "Failed to save background.";
      setSaveError(msg);
      throw err;
    }
  }

  async function uploadBackgroundFile(file: File, target: "backgroundMedia" | "backgroundPoster") {
    setSaveError("");
    setUploadStatus("uploading");
    const label = target === "backgroundMedia" ? "background" : "poster";
    setUploadProgress((p) => ({ ...p, [file.name]: `uploading ${label}` }));
    try {
      const contentType = file.type || "application/octet-stream";
      if (target === "backgroundPoster" && !contentType.startsWith("image/")) {
        throw new Error("Poster must be an image file.");
      }
      if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
        throw new Error("Only image and video uploads are supported.");
      }
      const uploadRes = await fetch(`/api/admin/work-projects/${id}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType,
          subfolder: target === "backgroundMedia" ? "background" : "poster",
        }),
      });
      const uploadData = (await uploadRes.json()) as {
        ok?: boolean;
        url?: string;
        headers?: Record<string, string>;
        key?: string;
        error?: string;
      };
      if (!uploadRes.ok || !uploadData.url || !uploadData.key) {
        throw new Error(uploadData.error ?? "Failed to prepare background upload.");
      }
      const putRes = await fetch(uploadData.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType, ...(uploadData.headers ?? {}) },
      });
      if (!putRes.ok) throw new Error(`Background upload failed (${putRes.status}).`);
      if (target === "backgroundMedia") {
        setBackgroundMediaUrl(uploadData.key);
        await saveBackgroundSettings(uploadData.key, backgroundPosterUrl);
      } else {
        setBackgroundPosterUrl(uploadData.key);
        await saveBackgroundSettings(backgroundMediaUrl, uploadData.key);
      }
      setUploadProgress((p) => {
        const next = { ...p };
        delete next[file.name];
        return next;
      });
      setUploadStatus("idle");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Background upload failed";
      setUploadProgress((p) => ({ ...p, [file.name]: msg }));
      setSaveError(msg);
      setUploadStatus("error");
      throw err;
    }
  }

  async function applyHeroCrop(blob: Blob) {
    if (id === "new") throw new Error("Save the project before cropping.");
    const file = new File([blob], `hero-crop-${Date.now()}.jpg`, { type: "image/jpeg" });
    setUploadStatus("uploading");
    setSaveError("");
    try {
      const mediaId = await uploadGalleryImageFromFile(file);
      const res = await fetch(`/api/admin/work-projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroMediaId: mediaId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to set hero.");
      setHeroMediaId(mediaId);
      await loadProject();
      setUploadStatus("idle");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Crop upload failed";
      setSaveError(msg);
      setUploadStatus("error");
      throw e;
    }
  }

  async function addMedia(payload: {
    keyFull: string;
    keyThumb?: string;
    kind: "IMAGE" | "VIDEO";
    width?: number;
    height?: number;
  }): Promise<string | undefined> {
    const mediaRes = await fetch(`/api/admin/work-projects/${id}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const mediaData = (await mediaRes.json()) as {
      ok: boolean;
      project?: WorkProject;
      media?: { id: string };
      error?: string;
    };
    if (!mediaRes.ok) throw new Error(mediaData.error ?? "Failed to add media");
    if (mediaData.project) setProject(mediaData.project);
    return mediaData.media?.id;
  }

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setUploadStatus("uploading");
    setSaveError("");
    setUploadProgress({});
    for (const file of arr) {
      await uploadFile(file);
    }
    setUploadStatus("idle");
    fileInputRef.current?.form?.reset();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length) void handleFiles(files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
  }

  async function setAsHero(mediaId: string | null) {
    setHeroMediaId(mediaId);
    try {
      await fetch(`/api/admin/work-projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroMediaId: mediaId }),
      });
      await loadProject();
    } catch (e) {
      console.error(e);
    }
  }

  async function setAsHomepageFeatured(mediaId: string) {
    try {
      const res = await fetch("/api/admin/site/homepage-featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to set");
      setHomepageFeaturedMediaId(mediaId);
    } catch (e) {
      console.error(e);
    }
  }

  async function removeMedia(mediaId: string) {
    try {
      const res = await fetch(
        `/api/admin/work-projects/${id}/media?mediaId=${encodeURIComponent(mediaId)}`,
        { method: "DELETE" }
      );
      const data = (await res.json()) as { ok: boolean; project?: WorkProject; error?: string };
      if (!res.ok) throw new Error(data.error);
      if (data.project) {
        setProject(data.project);
        if (heroMediaId === mediaId) setHeroMediaId(null);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function setMediaAltLocal(mediaId: string, alt: string | null) {
    setProject((current) => {
      if (!current) return current;
      return {
        ...current,
        media: current.media.map((pm) =>
          pm.media.id === mediaId
            ? { ...pm, media: { ...pm.media, alt } }
            : pm
        ),
        heroMedia:
          current.heroMedia?.id === mediaId ? { ...current.heroMedia, alt } : current.heroMedia,
      };
    });
  }

  async function saveMediaAlt(mediaId: string, alt: string) {
    const nextAlt = alt.trim() || null;
    const res = await fetch(`/api/admin/media/${mediaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alt: nextAlt }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to update alt");
    setMediaAltLocal(mediaId, nextAlt);
  }

  async function updateMediaAlt(mediaId: string, alt: string) {
    try {
      await saveMediaAlt(mediaId, alt);
    } catch (e) {
      console.error(e);
    }
  }

  function altProjectContext() {
    return {
      clientName: client.trim() || aiBrief.clientName.trim() || undefined,
      projectTitle: title.trim() || aiBrief.projectTitle.trim() || project?.title || undefined,
      pillar: pillarSlug || project?.section || aiBrief.pillar.trim() || undefined,
      location: location.trim() || aiBrief.location.trim() || undefined,
      whatWasPhotographed: whatWasPhotographed.trim() || aiBrief.whatWasPhotographed.trim() || undefined,
      visualApproach: visualApproach.trim() || aiBrief.visualApproach.trim() || undefined,
    };
  }

  async function generateAltTextForMedia(pm: ProjectMedia, options: { replace?: boolean } = {}) {
    if (pm.media.kind !== "IMAGE") return;
    if (pm.media.alt?.trim() && !options.replace) {
      const ok = window.confirm("Replace the existing alt text for this image?");
      if (!ok) return;
    }

    const imageUrl = mediaUrl(pm.media.keyFull ?? pm.media.keyThumb);
    if (!imageUrl) {
      setAltErrorByMediaId((current) => ({ ...current, [pm.media.id]: "Image URL is missing." }));
      return;
    }

    setAltLoadingByMediaId((current) => ({ ...current, [pm.media.id]: true }));
    setAltErrorByMediaId((current) => {
      const next = { ...current };
      delete next[pm.media.id];
      return next;
    });

    try {
      const res = await fetch("/api/admin/media/generate-alt-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          mediaId: pm.media.id,
          imageUrl,
          projectContext: altProjectContext(),
        }),
      });
      const data = (await res.json()) as { altText?: string; error?: string };
      if (!res.ok || !data.altText) {
        throw new Error(data.error ?? "Failed to generate alt text.");
      }
      await saveMediaAlt(pm.media.id, data.altText);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate alt text.";
      setAltErrorByMediaId((current) => ({ ...current, [pm.media.id]: message }));
    } finally {
      setAltLoadingByMediaId((current) => ({ ...current, [pm.media.id]: false }));
    }
  }

  async function generateMissingAltText() {
    const missing = imageMedia.filter((pm) => !pm.media.alt?.trim());
    let targets = missing;
    if (targets.length === 0) {
      const ok = window.confirm("All images already have alt text. Regenerate and replace existing alt text?");
      if (!ok) return;
      targets = imageMedia;
    }

    for (const pm of targets) {
      await generateAltTextForMedia(pm, { replace: true });
    }
  }

  async function analyzePortfolioPlacement(mediaIds?: string[]) {
    const ids = mediaIds?.filter(Boolean) ?? [];
    setPlacementError("");
    if (ids.length) {
      setPlacementLoadingByMediaId((current) => ({
        ...current,
        ...Object.fromEntries(ids.map((mediaId) => [mediaId, true])),
      }));
    } else {
      setPlacementBulkLoading(true);
    }

    try {
      const res = await fetch(`/api/admin/work-projects/${id}/media/portfolio-placement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(ids.length ? { mediaIds: ids } : {}),
      });
      const data = (await res.json()) as { ok?: boolean; project?: WorkProject; error?: string };
      if (!res.ok || !data.project) throw new Error(data.error ?? "Portfolio placement analysis failed.");
      setProject(data.project);
    } catch (err) {
      setPlacementError(err instanceof Error ? err.message : "Portfolio placement analysis failed.");
    } finally {
      if (ids.length) {
        setPlacementLoadingByMediaId((current) => ({
          ...current,
          ...Object.fromEntries(ids.map((mediaId) => [mediaId, false])),
        }));
      } else {
        setPlacementBulkLoading(false);
      }
    }
  }

  async function saveDeliveryImages(images: Array<Record<string, unknown>>) {
    const res = await fetch(`/api/admin/work-projects/${id}/delivery`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ images }),
    });
    const data = (await res.json()) as { ok?: boolean; project?: WorkProject; error?: string };
    if (!res.ok || !data.project) throw new Error(data.error ?? "Failed to save delivery metadata.");
    setProject(data.project);
  }

  async function updateDeliveryField(mediaId: string, patch: Record<string, unknown>) {
    try {
      await saveDeliveryImages([{ id: mediaId, ...patch }]);
    } catch (err) {
      setDeliveryError(err instanceof Error ? err.message : "Failed to save delivery metadata.");
    }
  }

  async function generateDeliveryRecommendations() {
    const images = imageMedia.map((pm) => ({
      id: pm.media.id,
      url: mediaUrl(pm.media.keyFull ?? pm.media.keyThumb),
      filename: pm.media.keyFull?.split("/").pop() ?? pm.media.id,
      existingAltText: pm.media.alt ?? "",
      existingCaption: pm.clientFacingCaption ?? "",
    })).filter((image) => image.url);
    if (!images.length) {
      setDeliveryError("Add project images before generating delivery recommendations.");
      return;
    }
    setDeliveryLoading(true);
    setDeliveryError("");
    try {
      const res = await fetch("/api/admin/projects/delivery-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          projectId: id,
          projectContext: {
            clientName: client,
            projectTitle: title,
            pillar: pillarSlug,
            location,
            whatWasPhotographed,
            visualApproach,
            seoTitle,
            metaDescription,
          },
          images,
        }),
      });
      const data = (await res.json()) as { images?: DeliveryRecommendation[]; error?: string };
      if (!res.ok || !data.images) throw new Error(data.error ?? "Delivery recommendations failed.");
      setDeliveryRecommendations(Object.fromEntries(data.images.map((item) => [item.id, item])));
    } catch (err) {
      setDeliveryError(err instanceof Error ? err.message : "Delivery recommendations failed.");
    } finally {
      setDeliveryLoading(false);
    }
  }

  async function runVisualReview() {
    const mediaIds = imageMedia.map((pm) => pm.media.id);
    if (!mediaIds.length) {
      setDeliveryError("Add project images before running visual review.");
      return;
    }
    setVisualReviewLoading(true);
    setDeliveryError("");
    try {
      const res = await fetch(`/api/admin/projects/${id}/visual-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mediaIds }),
      });
      const data = (await res.json()) as (VisualReviewResult & { ok?: boolean; error?: string });
      if (!res.ok) throw new Error(data.error ?? "AI visual review failed.");
      setVisualReview({
        images: data.images ?? [],
        duplicates: data.duplicates ?? [],
        topSelectIds: data.topSelectIds ?? [],
        weakImageIds: data.weakImageIds ?? [],
      });
    } catch (err) {
      setDeliveryError(err instanceof Error ? err.message : "AI visual review failed.");
    } finally {
      setVisualReviewLoading(false);
    }
  }

  async function applyDeliverySuggestion(mediaId: string, force = false) {
    const suggestion = deliveryRecommendations[mediaId];
    const current = project?.media.find((pm) => pm.media.id === mediaId);
    if (!suggestion || !current) return;
    const hasHumanFields = Boolean(
      current.deliveryGroup ||
        current.usageSuggestion ||
        current.clientFacingCaption ||
        current.aiDescription ||
        current.imagePurpose
    );
    if (hasHumanFields && !force) {
      const ok = confirm("This image already has delivery fields. Replace them with the AI suggestion?");
      if (!ok) return;
    }
    await saveDeliveryImages([
      {
        id: mediaId,
        deliveryGroup: suggestion.recommendedDeliveryGroup,
        usageSuggestion: suggestion.usageSuggestion,
        clientFacingCaption: suggestion.clientFacingCaption,
        aiDescription: suggestion.aiDescription,
        imagePurpose: suggestion.imagePurpose,
        confidenceScore: suggestion.confidenceScore,
        selectedForDelivery: true,
      },
    ]);
  }

  async function applyAllDeliverySuggestions() {
    const suggestions = Object.values(deliveryRecommendations);
    if (!suggestions.length) return;
    const ok = confirm("Apply all AI delivery suggestions? Existing delivery fields may be overwritten.");
    if (!ok) return;
    await saveDeliveryImages(
      suggestions.map((suggestion) => ({
        id: suggestion.id,
        deliveryGroup: suggestion.recommendedDeliveryGroup,
        usageSuggestion: suggestion.usageSuggestion,
        clientFacingCaption: suggestion.clientFacingCaption,
        aiDescription: suggestion.aiDescription,
        imagePurpose: suggestion.imagePurpose,
        confidenceScore: suggestion.confidenceScore,
        selectedForDelivery: true,
      }))
    );
  }

  async function prepareClientDelivery() {
    setDeliveryLoading(true);
    setDeliveryError("");
    try {
      const res = await fetch(`/api/admin/work-projects/${id}/delivery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ensureToken: true }),
      });
      const data = (await res.json()) as { project?: WorkProject; error?: string };
      if (!res.ok || !data.project) throw new Error(data.error ?? "Failed to prepare delivery.");
      setProject(data.project);
      window.open(`/api/admin/work-projects/${id}/delivery`, "_blank");
    } catch (err) {
      setDeliveryError(err instanceof Error ? err.message : "Failed to prepare delivery.");
    } finally {
      setDeliveryLoading(false);
    }
  }

  async function createInvoiceFromProject() {
    setInvoiceLoading(true);
    setDeliveryError("");
    try {
      const res = await fetch(`/api/admin/work-projects/${id}/delivery/invoice`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { invoice?: { id: string }; error?: string };
      if (!res.ok || !data.invoice) throw new Error(data.error ?? "Failed to create invoice.");
      const next = await fetch(`/api/admin/work-projects/${id}`);
      const projectData = (await next.json()) as { project?: WorkProject };
      if (projectData.project) setProject(projectData.project);
    } catch (err) {
      setDeliveryError(err instanceof Error ? err.message : "Failed to create invoice.");
    } finally {
      setInvoiceLoading(false);
    }
  }

  async function updateFollowUps(action: "schedule" | "cancel" | "reschedule", payload: Record<string, unknown> = {}) {
    setFollowUpsLoading(true);
    setFollowUpsError("");
    try {
      const res = await fetch(`/api/admin/projects/${id}/schedule-followups`, {
        method: action === "schedule" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: action === "schedule" ? undefined : JSON.stringify({ action, ...payload }),
      });
      const data = (await res.json()) as { followUps?: FollowUpSchedule[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to update follow-ups.");
      if (data.followUps) {
        setProject((current) => current ? { ...current, followUpSchedules: data.followUps } : current);
      }
    } catch (err) {
      setFollowUpsError(err instanceof Error ? err.message : "Failed to update follow-ups.");
    } finally {
      setFollowUpsLoading(false);
    }
  }

  async function reorderMedia(mediaIds: string[]) {
    try {
      const res = await fetch(`/api/admin/work-projects/${id}/media`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaIds }),
      });
      const data = (await res.json()) as { ok: boolean; project?: WorkProject };
      if (res.ok && data.project) setProject(data.project);
    } catch (e) {
      console.error(e);
    }
  }

  function handleMediaDragStart(e: React.DragEvent, mediaId: string) {
    setDraggedId(mediaId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", mediaId);
  }

  function handleMediaDragOver(e: React.DragEvent, mediaId: string) {
    e.preventDefault();
    if (draggedId && draggedId !== mediaId) setDragOverId(mediaId);
  }

  function handleMediaDragLeave() {
    setDragOverId(null);
  }

  function handleMediaDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    setDraggedId(null);
    setDragOverId(null);
    if (!orderedMedia.length || !draggedId || draggedId === targetId) return;
    const ids = orderedMedia.map((m) => m.media.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const reordered = [...ids];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, draggedId);
    reorderMedia(reordered);
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverId(null);
  }

  if (loading || !project) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-black/50">Loading…</p>
      </div>
    );
  }

  const orderedMedia = [...(project.media ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const uploadProgressEntries = Object.entries(uploadProgress);
  const imageMedia = orderedMedia.filter((pm) => pm.media.kind === "IMAGE");
  const imagesMissingAlt = imageMedia.filter((pm) => !pm.media.alt?.trim()).length;
  const selectedDeliveryImages = imageMedia.filter((pm) => pm.selectedForDelivery);
  const deliveryReadiness = [
    { label: "Hero images selected", complete: imageMedia.some((pm) => pm.selectedForDelivery && pm.deliveryGroup === "hero") },
    { label: "Web images selected", complete: imageMedia.some((pm) => pm.selectedForDelivery && pm.deliveryGroup === "web") },
    { label: "Print images selected", complete: imageMedia.some((pm) => pm.selectedForDelivery && pm.deliveryGroup === "print") },
    { label: "Captions generated", complete: selectedDeliveryImages.length > 0 && selectedDeliveryImages.every((pm) => pm.clientFacingCaption?.trim()) },
    { label: "Alt text generated", complete: imageMedia.length > 0 && imagesMissingAlt === 0 },
    { label: "Metadata completed", complete: selectedDeliveryImages.length > 0 && selectedDeliveryImages.every((pm) => pm.usageSuggestion?.trim() && pm.imagePurpose?.trim()) },
    { label: "Client PDF generated", complete: Boolean(project.clientPdfGeneratedAt) },
    { label: "Delivery package prepared", complete: Boolean(project.deliveryPreparedAt || project.finalPackageToken) },
  ];
  const publishChecklist: PublishChecklistItem[] = [
    {
      key: "title",
      label: "Project title",
      status: title.trim() ? "complete" : "missing",
      detail: title.trim() ? "Title is set." : "Add a project title.",
      required: true,
    },
    {
      key: "client",
      label: "Client name",
      status: client.trim() ? "complete" : "missing",
      detail: client.trim() ? "Client is set." : "Add the client name.",
      required: true,
    },
    {
      key: "pillar",
      label: "Pillar/category",
      status: pillarSlug.trim() ? "complete" : "missing",
      detail: pillarSlug.trim() ? `Pillar: ${pillarSlug}` : "Choose a work pillar.",
      required: true,
    },
    {
      key: "hero",
      label: "Hero image",
      status: heroMediaId ? "complete" : "missing",
      detail: heroMediaId ? "Hero image is selected." : "Set one image as the project hero.",
      required: true,
    },
    {
      key: "images",
      label: "At least 3 project images",
      status: imageMedia.length >= 3 ? "complete" : "missing",
      detail:
        imageMedia.length >= 3
          ? `${imageMedia.length} images attached.`
          : `Add ${Math.max(0, 3 - imageMedia.length)} more image(s).`,
      required: true,
    },
    {
      key: "opening",
      label: "Opening copy",
      status: opening.trim() ? "complete" : "missing",
      detail: opening.trim() ? "Opening copy is set." : "Add opening copy.",
      required: true,
    },
    {
      key: "context",
      label: "Context copy",
      status: context.trim() ? "complete" : "missing",
      detail: context.trim() ? "Context copy is set." : "Add context copy.",
      required: true,
    },
    {
      key: "approach",
      label: "Approach copy",
      status: approach.trim() ? "complete" : "missing",
      detail: approach.trim() ? "Approach copy is set." : "Add approach copy.",
      required: true,
    },
    {
      key: "seoTitle",
      label: "SEO title",
      status: seoTitle.trim() ? "complete" : "missing",
      detail: seoTitle.trim() ? "SEO title is set." : "Add an SEO title.",
      required: true,
    },
    {
      key: "metaDescription",
      label: "Meta description",
      status: metaDescription.trim() ? "complete" : "missing",
      detail: metaDescription.trim() ? "Meta description is set." : "Add a meta description.",
      required: true,
    },
    {
      key: "tags",
      label: "Project tags",
      status: tagsRaw.split(/[,;]/).some((tag) => tag.trim()) ? "complete" : "missing",
      detail: tagsRaw.split(/[,;]/).some((tag) => tag.trim()) ? "Project tags are set." : "Add project tags.",
      required: true,
    },
    {
      key: "cta",
      label: "CTA copy",
      status: ctaCopy.trim() ? "complete" : "missing",
      detail: ctaCopy.trim() ? "CTA copy is set." : "Add CTA copy.",
      required: true,
    },
    {
      key: "alt",
      label: "Image alt text",
      status:
        imageMedia.length === 0
          ? "warning"
          : imagesMissingAlt === 0
            ? "complete"
            : "warning",
      detail:
        imageMedia.length === 0
          ? "Add images before reviewing alt text."
          : imagesMissingAlt === 0
            ? "All images have alt text."
            : `${imagesMissingAlt} image(s) need alt text.`,
      required: false,
    },
  ];
  const missingRequired = publishChecklist.filter(
    (item) => item.required && item.status === "missing"
  );
  const warningItems = publishChecklist.filter((item) => item.status === "warning");
  const readyToPublish = missingRequired.length === 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <Link href="/admin/work" className="text-sm text-black/60 hover:underline">
            ← Work projects
          </Link>
          <h1 className="mt-2 font-display text-2xl text-black">Edit: {project.title}</h1>
          <p className="text-xs text-black/50">
            /{pillarSlug}/{slug.trim() || project.slug}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <a
            href={`/api/admin/work-projects/${id}/client-pdf`}
            className="btn btn-primary text-sm"
            target="_blank"
            rel="noreferrer"
          >
            Generate Client PDF
          </a>
          <button
            type="button"
            onClick={() => {
              if (confirm("Delete this project? This cannot be undone.")) {
                fetch(`/api/admin/work-projects/${id}`, { method: "DELETE" }).then(
                  (r) => r.ok && router.push("/admin/work")
                );
              }
            }}
            className="btn btn-ghost text-sm text-red-600"
          >
            Delete project
          </button>
        </div>
      </div>

      {generateAllOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="font-display text-xl text-black">Generate project copy</h2>
            <p className="mt-2 text-sm text-black/60">
              Some fields already contain copy. What would you like to do?
            </p>
            {generateAllError ? (
              <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {generateAllError}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary"
                disabled={generateAllLoading}
                onClick={() => void requestGenerateAll("empty_only")}
              >
                {generateAllLoading ? "Generating…" : "Fill empty fields only"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={generateAllLoading}
                onClick={() => void requestGenerateAll("replace_all")}
              >
                Replace all fields
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={generateAllLoading}
                onClick={() => setGenerateAllOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSaveProject} className="space-y-6">
        <div className="rounded-xl border border-black/10 bg-white p-6">
          <h2 className="text-sm font-semibold text-black/80">Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-wide text-black/60">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-black/60">Slug</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-black/60">Pillar</label>
              <select
                value={pillarSlug}
                onChange={(e) => setPillarSlug(e.target.value)}
                className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
                required
              >
                {pillars.length === 0 ? (
                  <option value="">Loading pillars…</option>
                ) : (
                  pillars.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.label} · /work/{p.slug}
                    </option>
                  ))
                )}
              </select>
              <p className="mt-1 text-xs text-black/45">
                Case study URL: /work/{pillarSlug || "pillar"}/{slug.trim() || "slug"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-wide text-black/60">Summary</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
                rows={2}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-wide text-black/60">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-black/60">Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-black/60">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") setYear("");
                  else {
                    const n = parseInt(v, 10);
                    setYear(Number.isFinite(n) ? n : year);
                  }
                }}
                className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
                min={1900}
                max={2100}
              />
            </div>
            <div className="flex gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                />
                Published
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm">
                Sort order:
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                  className="w-16 rounded border border-black/20 px-2 py-1 text-sm"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black p-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-white/45">Publish readiness</p>
              <h2 className="mt-1 text-sm font-semibold text-white/85">Project checklist</h2>
              <p className="mt-1 max-w-2xl text-xs text-white/50">
                Drafts can always be saved. Publishing is blocked only when required items are missing.
              </p>
            </div>
            <div
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                readyToPublish
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                  : "border-amber-300/40 bg-amber-300/10 text-amber-100"
              }`}
            >
              {readyToPublish ? "Ready to Publish" : "Not Ready"}
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {publishChecklist.map((item) => (
              <div
                key={item.key}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-white/85">{item.label}</p>
                    <p className="mt-1 text-xs text-white/45">{item.detail}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${
                      item.status === "complete"
                        ? "bg-emerald-400/15 text-emerald-100"
                        : item.status === "warning"
                          ? "bg-amber-300/15 text-amber-100"
                          : "bg-red-400/15 text-red-100"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {warningItems.length > 0 ? (
            <p className="mt-4 text-xs text-amber-100/80">
              Warning: {warningItems.map((item) => item.label).join(", ")} should be reviewed before launch.
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-white/10 bg-black p-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-white/45">AI SEO</p>
              <h2 className="mt-1 text-sm font-semibold text-white/85">Project page SEO check</h2>
              <p className="mt-1 max-w-2xl text-xs text-white/50">
                Reviews title, slug, pillar, SEO fields, tags, opening copy, alt text, and CTA copy.
                Suggestions stay editable and are only applied when you choose.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary text-sm"
              onClick={() => void checkSeo()}
              disabled={seoCheckLoading}
            >
              {seoCheckLoading ? "Checking…" : "Check SEO"}
            </button>
          </div>

          {seoCheckError ? (
            <p className="mt-4 rounded border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">
              {seoCheckError}
            </p>
          ) : null}

          {seoCheckResult ? (
            <div className="mt-5 space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                    seoCheckResult.score >= 85
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                      : seoCheckResult.score >= 65
                        ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
                        : "border-red-400/40 bg-red-400/10 text-red-100"
                  }`}
                >
                  SEO Score {seoCheckResult.score}/100
                </div>
                <p className="text-xs text-white/45">
                  Use the suggestions below, then save the project when ready.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">Issues</p>
                  {seoCheckResult.issues.length ? (
                    <ul className="mt-3 space-y-2 text-sm text-white/75">
                      {seoCheckResult.issues.map((issue) => (
                        <li key={issue}>- {issue}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-white/55">No major issues found.</p>
                  )}
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">Suggestions</p>
                  {seoCheckResult.suggestions.length ? (
                    <ul className="mt-3 space-y-2 text-sm text-white/75">
                      {seoCheckResult.suggestions.map((suggestion) => (
                        <li key={suggestion}>- {suggestion}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-white/55">No additional suggestions.</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {seoCheckResult.improvedSeoTitle ? (
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">Improved SEO title</p>
                    <p className="mt-2 text-sm text-white/80">{seoCheckResult.improvedSeoTitle}</p>
                    <button type="button" className="btn btn-ghost mt-3 text-xs" onClick={applyImprovedSeoTitle}>
                      Apply improved title
                    </button>
                  </div>
                ) : null}
                {seoCheckResult.improvedMetaDescription ? (
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">Improved meta description</p>
                    <p className="mt-2 text-sm text-white/80">{seoCheckResult.improvedMetaDescription}</p>
                    <button type="button" className="btn btn-ghost mt-3 text-xs" onClick={applyImprovedMetaDescription}>
                      Apply improved meta description
                    </button>
                  </div>
                ) : null}
                {seoCheckResult.suggestedTags?.length ? (
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">Suggested tags</p>
                    <p className="mt-2 text-sm text-white/80">{seoCheckResult.suggestedTags.join(", ")}</p>
                    <button type="button" className="btn btn-ghost mt-3 text-xs" onClick={applySuggestedTags}>
                      Apply suggested tags
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-black/45">Studio OS AI</p>
              <h2 className="mt-1 text-sm font-semibold text-black/80">AI Brief</h2>
              <p className="mt-1 max-w-2xl text-xs text-black/50">
                Add project context once, then generate individual fields or the full project copy set.
                Generated text stays editable and does not publish until you save.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <select
                value={aiTonePreset}
                onChange={(e) => setAiTonePreset(e.target.value as ProjectCopyTonePreset)}
                className="rounded border border-black/15 bg-white px-2 py-2 text-xs text-black/65"
                disabled={generateAllLoading}
                aria-label="AI tone preset for generate all"
              >
                {AI_TONE_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-primary text-sm"
                onClick={startGenerateAll}
                disabled={generateAllLoading}
              >
                {generateAllLoading ? "Generating…" : "Generate All"}
              </button>
            </div>
          </div>
          {generateAllError && !generateAllOpen ? (
            <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {generateAllError}
            </p>
          ) : null}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ["clientName", "Client name", client || "e.g. ERNY"],
              ["projectTitle", "Project title", title || "e.g. ERNY Collection"],
              ["projectType", "Project type", projectType || "e.g. Editorial Campaign"],
              ["shootType", "Shoot type", "e.g. product collection, workplace, portraits"],
              ["location", "Location", location || "New York City, Jersey City, New Jersey"],
              ["whatWasPhotographed", "What was photographed", whatWasPhotographed || "Subjects, spaces, details"],
              ["visualApproach", "Brand tone", visualApproach || "Controlled, modern, editorial"],
              ["targetAudience", "Target audience", "Creative directors, founders, marketing teams"],
              ["projectGoal", "Goal of the project", "Image library, launch campaign, sales material"],
            ].map(([key, label, placeholder]) => (
              <label key={key} className="block">
                <span className="text-xs uppercase tracking-wide text-black/60">{label}</span>
                <input
                  value={aiBrief[key as keyof AiBriefState]}
                  onChange={(e) =>
                    setAiBrief((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
                  placeholder={placeholder}
                />
              </label>
            ))}
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-black/60">Pillar/category</span>
              <select
                value={aiBrief.pillar}
                onChange={(e) => setAiBrief((prev) => ({ ...prev, pillar: e.target.value }))}
                className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
              >
                <option value="">Use project pillar</option>
                <option value="Architecture">Architecture</option>
                <option value="Advertising">Advertising</option>
                <option value="Corporate">Corporate</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-black/60">Desired copy style</span>
              <select
                value={aiBrief.desiredStyle}
                onChange={(e) =>
                  setAiBrief((prev) => ({ ...prev, desiredStyle: e.target.value }))
                }
                className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
              >
                {DESIRED_COPY_STYLES.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs uppercase tracking-wide text-black/60">Notes / rough brief</span>
              <textarea
                value={aiBrief.notes}
                onChange={(e) => setAiBrief((prev) => ({ ...prev, notes: e.target.value }))}
                className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
                rows={3}
                placeholder="Paste rough notes, client goals, image observations, positioning, deliverables, or constraints."
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-black/45">Guided AI</p>
              <h2 className="mt-1 text-sm font-semibold text-black/80">Brief to Case Study</h2>
              <p className="mt-1 max-w-2xl text-xs text-black/50">
                Paste rough project notes and generate a polished Bright Line project page draft.
              </p>
            </div>
            <select
              value={aiTonePreset}
              onChange={(e) => setAiTonePreset(e.target.value as ProjectCopyTonePreset)}
              className="rounded border border-black/15 bg-white px-2 py-2 text-xs text-black/65"
              disabled={briefCaseStudyLoading}
              aria-label="Brief to Case Study tone preset"
            >
              {AI_TONE_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={briefCaseStudyNotes}
            onChange={(e) => setBriefCaseStudyNotes(e.target.value)}
            className="mt-4 w-full rounded border border-black/20 px-3 py-2 text-sm"
            rows={5}
            placeholder="Paste shoot notes, client goals, image observations, usage, deliverables, location, styling, or rough positioning."
          />
          {briefCaseStudyError ? (
            <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {briefCaseStudyError}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost text-sm"
              disabled={briefCaseStudyLoading}
              onClick={() => void generateBriefCaseStudy("draft_only")}
            >
              {briefCaseStudyLoading ? "Generating…" : "Generate draft only"}
            </button>
            <button
              type="button"
              className="btn btn-ghost text-sm"
              disabled={briefCaseStudyLoading}
              onClick={() => void generateBriefCaseStudy("empty_only")}
            >
              Fill empty fields only
            </button>
            <button
              type="button"
              className="btn btn-primary text-sm"
              disabled={briefCaseStudyLoading}
              onClick={() => void generateBriefCaseStudy("replace_all")}
            >
              Replace all fields
            </button>
          </div>
          {briefCaseStudyResult ? (
            <div className="mt-5 rounded-lg border border-black/10 bg-black/[0.02] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-black/45">Generated case study draft</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    onClick={() => applyBriefCaseStudyResult(briefCaseStudyResult, "empty_only")}
                  >
                    Fill empty
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    onClick={() => {
                      if (confirm("Replace all case study fields with this draft?")) {
                        applyBriefCaseStudyResult(briefCaseStudyResult, "replace_all");
                      }
                    }}
                  >
                    Replace all
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {BRIEF_CASE_STUDY_FIELDS.map((fieldKey) => (
                  <div key={fieldKey} className="rounded border border-black/10 bg-white p-3">
                    <p className="text-[10px] uppercase tracking-wide text-black/40">{fieldKey}</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-black/70">
                      {briefCaseStudyResult.values?.[fieldKey] || "No draft returned."}
                    </p>
                  </div>
                ))}
                <div className="rounded border border-black/10 bg-white p-3 sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-wide text-black/40">Image direction notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-black/70">
                    {briefCaseStudyResult.imageDirectionNotes || "No notes returned."}
                  </p>
                </div>
                <div className="rounded border border-black/10 bg-white p-3 sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-wide text-black/40">Suggested homepage / portfolio placement</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-black/70">
                    {briefCaseStudyResult.suggestedPlacement || "No placement returned."}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-6">
          <button
            type="button"
            onClick={() => setEditorialExpanded(!editorialExpanded)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <h2 className="text-sm font-semibold text-black/80">Bright Line editorial</h2>
              <p className="mt-1 text-xs text-black/50">
                Preferred public layout: opening through closing. Aim for ~180–350 words total across these
                fields. If any field here is set, the site uses this editorial story; otherwise the legacy
                overview block below applies.
              </p>
            </div>
            <span className="shrink-0 text-black/50">{editorialExpanded ? "−" : "+"}</span>
          </button>
          {editorialExpanded && (
            <div className="mt-4 space-y-4">
              {renderAiField({
                label: "Opening (2–3 lines max)",
                fieldKey: "opening",
                placeholder: "Client × work type × why it matters",
                rows: 3,
              })}
              {renderAiField({
                label: "Context",
                fieldKey: "context",
                placeholder: "Goal, challenge, or setting — one short paragraph",
                rows: 3,
              })}
              {renderAiField({
                label: "Approach (short paragraph or bullets)",
                fieldKey: "approach",
                placeholder: "What you directed: light, set, sequencing, styling...",
                rows: 4,
              })}
              {renderAiField({
                label: "Highlight line (one sentence)",
                fieldKey: "highlightLine",
                rows: 2,
              })}
              {renderAiField({
                label: "Execution (optional)",
                fieldKey: "execution",
                placeholder: "Technique, retouching, production — only if it adds value",
                rows: 3,
              })}
              {renderAiField({
                label: "Closing (one line)",
                fieldKey: "closing",
                rows: 2,
              })}
              {renderAiField({
                label: "Credits (optional)",
                fieldKey: "credits",
                placeholder: "e.g. Creative direction — ... Photography — ...",
                rows: 3,
              })}
              {renderAiField({
                label: "Project tags",
                fieldKey: "projectTags",
                placeholder: "Comma-separated, e.g. campaign, lookbook, NYC",
                multiline: false,
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-6">
          <button
            type="button"
            onClick={() => setCaseStudyExpanded(!caseStudyExpanded)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <h2 className="text-sm font-semibold text-black/80">Legacy overview &amp; SEO</h2>
              <p className="mt-1 text-xs text-black/50">
                Used when Bright Line editorial fields above are all empty. Older fields (overview, visual
                approach, etc.).
              </p>
            </div>
            <span className="shrink-0 text-black/50">{caseStudyExpanded ? "−" : "+"}</span>
          </button>
          {caseStudyExpanded && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {renderAiField({
                  label: "Client",
                  fieldKey: "client",
                  placeholder: "e.g. JA Jennings Inc.",
                  multiline: false,
                })}
                {renderAiField({
                  label: "Project type",
                  fieldKey: "projectTypeLegacy",
                  placeholder: "e.g. Office Renovation",
                  multiline: false,
                })}
                <div className="sm:col-span-2">
                  {renderAiField({
                    label: "Scope",
                    fieldKey: "scope",
                    placeholder: "e.g. Commercial interior and workplace photography",
                    multiline: false,
                  })}
                </div>
                <div className="sm:col-span-2">
                  {renderAiField({
                    label: "Overview extended (2nd paragraph)",
                    fieldKey: "overviewExtended",
                    rows: 2,
                  })}
                </div>
                <div className="sm:col-span-2">
                  {renderAiField({
                    label: "What was photographed",
                    fieldKey: "whatWasPhotographed",
                    rows: 2,
                  })}
                </div>
                <div className="sm:col-span-2">
                  {renderAiField({
                    label: "Visual approach",
                    fieldKey: "visualApproachLegacy",
                    rows: 2,
                  })}
                </div>
                <div className="sm:col-span-2">
                  {renderAiField({
                    label: "Location context",
                    fieldKey: "locationContext",
                    rows: 2,
                  })}
                </div>
                <div className="sm:col-span-2">
                  {renderAiField({
                    label: "Who this photography serves",
                    fieldKey: "whoThisPhotographyServes",
                    placeholder: "general contractors, developers, architects...",
                    rows: 2,
                  })}
                </div>
                <div className="sm:col-span-2">
                  {renderAiField({
                    label: "SEO title (optional override)",
                    fieldKey: "seoTitle",
                    multiline: false,
                  })}
                </div>
                <div className="sm:col-span-2">
                  {renderAiField({
                    label: "Meta description (optional override)",
                    fieldKey: "metaDescription",
                    rows: 2,
                  })}
                </div>
                <div className="sm:col-span-2">
                  {renderAiField({
                    label: "CTA copy (optional override)",
                    fieldKey: "ctaCopy",
                    rows: 2,
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-6">
          <h2 className="text-sm font-semibold text-black/80">Page background</h2>
          <p className="mt-1 text-xs text-black/50">
            Optional image or looping video behind this project/case study page. Use a poster image for videos.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs uppercase tracking-wide text-black/60">Background image/video</label>
              <input
                value={backgroundMediaUrl}
                onChange={(e) => setBackgroundMediaUrl(e.target.value)}
                onBlur={() => void saveBackgroundSettings(backgroundMediaUrl, backgroundPosterUrl)}
                className="mt-1 w-full rounded border border-black/20 px-3 py-2 font-mono text-xs"
                placeholder="R2 key, /path, or https://..."
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="btn btn-ghost text-xs" onClick={() => setR2BrowserTarget("backgroundMedia")}>
                  Browse R2
                </button>
                <label className="btn btn-ghost cursor-pointer text-xs">
                  Upload
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadBackgroundFile(file, "backgroundMedia");
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                {backgroundMediaUrl && !isVideoKey(backgroundMediaUrl) ? (
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    disabled={id === "new" || uploadStatus === "uploading"}
                    onClick={() => {
                      const src = getCropSafeMediaUrl(backgroundMediaUrl);
                      if (!src) {
                        setSaveError("Could not resolve image URL for cropping.");
                        return;
                      }
                      setImageCropModal({ mode: "background", src });
                    }}
                  >
                    Crop background
                  </button>
                ) : null}
                {backgroundMediaUrl ? (
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    onClick={() => {
                      setBackgroundMediaUrl("");
                      void saveBackgroundSettings("", backgroundPosterUrl);
                    }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-black/60">Video poster image</label>
              <input
                value={backgroundPosterUrl}
                onChange={(e) => setBackgroundPosterUrl(e.target.value)}
                onBlur={() => void saveBackgroundSettings(backgroundMediaUrl, backgroundPosterUrl)}
                className="mt-1 w-full rounded border border-black/20 px-3 py-2 font-mono text-xs"
                placeholder="Optional poster key or URL"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="btn btn-ghost text-xs" onClick={() => setR2BrowserTarget("backgroundPoster")}>
                  Browse R2
                </button>
                <label className="btn btn-ghost cursor-pointer text-xs">
                  Upload poster
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadBackgroundFile(file, "backgroundPoster");
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                {backgroundPosterUrl ? (
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    onClick={() => {
                      setBackgroundPosterUrl("");
                      void saveBackgroundSettings(backgroundMediaUrl, "");
                    }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          {backgroundMediaUrl ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-black/10 bg-black">
              {isVideoKey(backgroundMediaUrl) ? (
                <video
                  src={mediaUrl(backgroundMediaUrl)}
                  poster={mediaUrl(backgroundPosterUrl) || undefined}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="h-40 w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(backgroundMediaUrl)} alt="" className="h-40 w-full object-cover" />
              )}
            </div>
          ) : null}
        </div>

        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
        <button type="submit" className="btn btn-primary" disabled={saveStatus === "saving"}>
          {saveStatus === "saving" ? "Saving…" : "Save changes"}
        </button>
      </form>

      <div className="mt-10 rounded-xl border border-black/10 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-black/45">Clean Delivery System</p>
            <h2 className="mt-1 text-sm font-semibold text-black/80">Delivery</h2>
            <p className="mt-1 max-w-2xl text-xs text-black/50">
              Bright Line delivers a ready-to-use visual system, not just a folder of images.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn btn-ghost text-xs" disabled={deliveryLoading} onClick={() => void generateDeliveryRecommendations()}>
              {deliveryLoading ? "Generating…" : "AI delivery recommendations"}
            </button>
            <button type="button" className="btn btn-ghost text-xs" disabled={visualReviewLoading} onClick={() => void runVisualReview()}>
              {visualReviewLoading ? "Reviewing…" : "AI visual review"}
            </button>
            {Object.keys(deliveryRecommendations).length ? (
              <button type="button" className="btn btn-ghost text-xs" onClick={() => void applyAllDeliverySuggestions()}>
                Apply all suggestions
              </button>
            ) : null}
            <button type="button" className="btn btn-primary text-xs" disabled={deliveryLoading} onClick={() => void prepareClientDelivery()}>
              Prepare Client Delivery
            </button>
          </div>
        </div>
        {deliveryError ? (
          <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{deliveryError}</p>
        ) : null}
        {visualReview ? (
          <div className="mt-5 rounded-xl border border-black/10 bg-black/[0.02] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-black/75">AI Visual Review</h3>
                <p className="mt-1 text-xs text-black/45">
                  Curation guidance only. No images are deleted, moved, or selected automatically.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-white px-2 py-1 text-black/55">{visualReview.topSelectIds.length} top select(s)</span>
                <span className="rounded bg-white px-2 py-1 text-black/55">{visualReview.duplicates.length} duplicate set(s)</span>
                <span className="rounded bg-white px-2 py-1 text-black/55">{visualReview.weakImageIds.length} weak flag(s)</span>
              </div>
            </div>
            {visualReview.duplicates.length ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Duplicates detected</p>
                <div className="mt-2 space-y-2">
                  {visualReview.duplicates.map((duplicate, index) => (
                    <p key={`${duplicate.ids.join("-")}-${index}`} className="text-xs text-amber-900">
                      {duplicate.ids
                        .map((mediaId) => imageMedia.find((pm) => pm.media.id === mediaId)?.media.keyFull?.split("/").pop() ?? mediaId)
                        .join(", ")}
                      : {duplicate.reason}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {visualReview.images
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((review) => {
                  const pm = imageMedia.find((item) => item.media.id === review.id);
                  const thumb = pm ? mediaUrl(pm.media.keyThumb ?? pm.media.keyFull) : "";
                  return (
                    <div key={review.id} className="flex gap-3 rounded-lg border border-black/10 bg-white p-3">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={pm?.media.alt ?? ""} className="h-16 w-20 rounded object-cover" />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold text-black/75">Score {review.score}</p>
                          <span className="rounded bg-black/5 px-1.5 py-0.5 text-[11px] text-black/55">
                            {review.recommendedPlacement}
                          </span>
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-700">
                            {review.bestUseCase} · {review.useCaseConfidence}%
                          </span>
                          {review.isTopSelect ? (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700">Top select</span>
                          ) : null}
                          {review.isWeak ? (
                            <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] text-red-700">Weak flag</span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-[11px] text-black/40">
                          {pm?.media.keyFull?.split("/").pop() ?? review.id}
                        </p>
                        <p className="mt-1 text-xs text-black/55">{review.reason}</p>
                        <p className="mt-1 text-xs text-black/45">{review.useCaseReasoning}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="btn btn-ghost text-xs" href={`/api/admin/work-projects/${id}/delivery`} target="_blank" rel="noreferrer">
            Generate delivery manifest JSON
          </a>
          <a className="btn btn-ghost text-xs" href={`/api/admin/work-projects/${id}/delivery?format=pdf`} target="_blank" rel="noreferrer">
            Generate client-facing PDF summary
          </a>
          {project.finalPackageToken ? (
            <a className="btn btn-ghost text-xs" href={`/package/${project.finalPackageToken}`} target="_blank" rel="noreferrer">
              Open final package page
            </a>
          ) : null}
          <button type="button" className="btn btn-ghost text-xs" disabled={invoiceLoading} onClick={() => void createInvoiceFromProject()}>
            {invoiceLoading ? "Creating…" : "Create invoice from project"}
          </button>
          {project.attachedInvoiceId ? (
            <>
              <a className="btn btn-ghost text-xs" href={`/api/admin/work-projects/${id}/delivery/invoice/pdf`} target="_blank" rel="noreferrer">
                Download invoice PDF
              </a>
              <button
                type="button"
                className="btn btn-ghost text-xs"
                onClick={() =>
                  void fetch(`/api/admin/work-projects/${id}/delivery/invoice`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ action: "mark_paid" }),
                  })
                }
              >
                Mark as paid
              </button>
            </>
          ) : null}
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {deliveryReadiness.map((item) => (
            <div key={item.label} className={`rounded-lg border px-3 py-2 text-xs ${item.complete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-black/10 bg-black/[0.02] text-black/55"}`}>
              {item.complete ? "Complete" : "Missing"} · {item.label}
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-black/10 bg-black/[0.02] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-black/75">Automated follow-ups</h3>
              <p className="mt-1 text-xs leading-5 text-black/45">
                Send retention emails 2, 7, and 30 days after delivery using Resend.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-ghost text-xs"
                disabled={followUpsLoading}
                onClick={() => void updateFollowUps("schedule")}
              >
                {project.followUpSchedules?.some((row) => row.status === "pending") ? "Reschedule follow-ups" : "Enable follow-ups"}
              </button>
              {project.followUpSchedules?.some((row) => row.status === "pending") ? (
                <button
                  type="button"
                  className="btn btn-ghost text-xs"
                  disabled={followUpsLoading}
                  onClick={() => void updateFollowUps("cancel")}
                >
                  Disable follow-ups
                </button>
              ) : null}
            </div>
          </div>
          {followUpsError ? <p className="mt-3 text-xs text-red-600">{followUpsError}</p> : null}
          <div className="mt-4 grid gap-3">
            {project.followUpSchedules?.length ? (
              project.followUpSchedules.map((followUp) => (
                <div key={followUp.id} className="rounded-lg border border-black/10 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-black/60">
                        {formatFollowUpType(followUp.type)}
                      </p>
                      <p className="mt-1 text-xs text-black/45">
                        {followUp.status} · scheduled {new Date(followUp.scheduledAt).toLocaleString()}
                        {followUp.sentAt ? ` · sent ${new Date(followUp.sentAt).toLocaleString()}` : ""}
                      </p>
                      {followUp.error ? <p className="mt-1 text-xs text-red-600">{followUp.error}</p> : null}
                    </div>
                    {followUp.status !== "sent" ? (
                      <form
                        className="flex flex-wrap items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const form = new FormData(event.currentTarget);
                          void updateFollowUps("reschedule", {
                            followUpId: followUp.id,
                            scheduledAt: form.get("scheduledAt")?.toString(),
                          });
                        }}
                      >
                        <input
                          name="scheduledAt"
                          type="datetime-local"
                          defaultValue={toDateTimeLocal(followUp.scheduledAt)}
                          className="rounded border border-black/10 bg-white px-2 py-1 text-xs"
                        />
                        <button type="submit" className="btn btn-ghost text-xs" disabled={followUpsLoading}>
                          Reschedule
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-black/45">Follow-ups are not scheduled for this project yet.</p>
            )}
          </div>
        </div>
        {deliveryPerformance ? (
          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            {[
              ["Top Performing Images", deliveryPerformance.topPerforming],
              ["Most Downloaded", deliveryPerformance.mostDownloaded],
              ["Unused High-Value Assets", deliveryPerformance.unusedHighValue],
            ].map(([title, rows]) => (
              <div key={title as string} className="rounded-xl border border-black/10 bg-black/[0.02] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-black/55">{title as string}</h3>
                <div className="mt-3 space-y-2">
                  {(rows as DeliveryPerformanceItem[]).length ? (
                    (rows as DeliveryPerformanceItem[]).slice(0, 5).map((item) => (
                      <div key={item.id} className="flex gap-2 rounded bg-white p-2">
                        {item.mediaAsset.keyThumb || item.mediaAsset.keyFull ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaUrl(item.mediaAsset.keyThumb ?? item.mediaAsset.keyFull)}
                            alt={item.mediaAsset.alt ?? ""}
                            className="h-12 w-16 rounded object-cover"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-black/70">
                            {item.clientFacingCaption || item.mediaAsset.keyFull?.split("/").pop() || "Delivery image"}
                          </p>
                          <p className="text-[11px] text-black/45">
                            Score {item.performanceScore} · {item.downloadCount} downloads · {item.viewCount} views
                          </p>
                          <p className="text-[11px] text-black/45">
                            {item.usageLikelihood ?? "unknown"} likelihood · {item.performanceRecommendedPlacement ?? "supporting"}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-black/40">No data yet.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-6 space-y-5">
          {DELIVERY_GROUPS.map((group) => {
            const rows = imageMedia.filter((pm) => (pm.deliveryGroup ?? "archive") === group);
            return (
              <section key={group} className="rounded-xl border border-black/10 bg-black/[0.02] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold capitalize text-black/75">{group}</h3>
                    <p className="mt-1 text-xs text-black/45">{DELIVERY_GROUP_DESCRIPTIONS[group]}</p>
                  </div>
                  <span className="text-xs text-black/45">{rows.length} image(s)</span>
                </div>
                <div className="mt-3 grid gap-3">
                  {rows.length ? rows.map((pm) => {
                    const suggestion = deliveryRecommendations[pm.media.id];
                    const thumb = mediaUrl(pm.media.keyThumb ?? pm.media.keyFull);
                    return (
                      <div key={pm.media.id} className="grid gap-3 rounded-lg border border-black/10 bg-white p-3 sm:grid-cols-[96px_1fr]">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt={pm.media.alt ?? ""} className="h-20 w-24 rounded object-cover" />
                        ) : <div className="h-20 w-24 rounded bg-black/10" />}
                        <div className="grid gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="text-xs text-black/50">
                              <input
                                type="checkbox"
                                checked={pm.selectedForDelivery}
                                onChange={(e) => void updateDeliveryField(pm.media.id, { selectedForDelivery: e.target.checked })}
                                className="mr-1"
                              />
                              Selected for delivery
                            </label>
                            <select
                              value={pm.deliveryGroup ?? "archive"}
                              onChange={(e) => void updateDeliveryField(pm.media.id, { deliveryGroup: e.target.value })}
                              className="rounded border border-black/15 px-2 py-1 text-xs"
                            >
                              {DELIVERY_GROUPS.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </div>
                          {DELIVERY_TEXT_FIELDS.map(([key, label]) => (
                            <input
                              key={key}
                              value={pm[key] ?? ""}
                              onChange={(e) =>
                                setProject((current) =>
                                  current
                                    ? {
                                        ...current,
                                        media: current.media.map((row) =>
                                          row.media.id === pm.media.id ? { ...row, [key]: e.target.value } : row
                                        ),
                                      }
                                    : current
                                )
                              }
                              onBlur={(e) => void updateDeliveryField(pm.media.id, { [key]: e.target.value })}
                              className="rounded border border-black/15 px-2 py-1 text-xs"
                              placeholder={label}
                            />
                          ))}
                          <input
                            value={pm.media.alt ?? ""}
                            onChange={(e) => setMediaAltLocal(pm.media.id, e.target.value)}
                            onBlur={(e) => updateMediaAlt(pm.media.id, e.target.value)}
                            className="rounded border border-black/15 px-2 py-1 text-xs"
                            placeholder="Alt text"
                          />
                          {suggestion ? (
                            <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                              <p className="font-medium">AI suggests: {suggestion.recommendedDeliveryGroup} · {suggestion.confidenceScore}%</p>
                              <p className="mt-1">{suggestion.usageSuggestion}</p>
                              <button type="button" className="btn btn-ghost mt-2 text-xs" onClick={() => void applyDeliverySuggestion(pm.media.id)}>
                                Apply suggestion
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  }) : <p className="text-xs text-black/40">No images in this group yet.</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-black/10 bg-white p-6">
        <h2 className="text-sm font-semibold text-black/80">Media</h2>
        <p className="mt-1 text-xs text-black/50">
          Hero: choose one below or leave none. Drag to reorder. Hero is hidden from the gallery.
        </p>

        {heroMediaId && (() => {
          const heroPm = orderedMedia.find((pm) => pm.media.id === heroMediaId);
          if (!heroPm) return null;
          const heroSrc = mediaUrl(heroPm.media.keyThumb ?? heroPm.media.keyFull);
          const isVideo = heroPm.media.kind === "VIDEO";
          return (
            <div className="mt-4 flex items-start gap-4 rounded-lg border border-black/10 bg-black/[0.02] p-3">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-black/10">
                {heroSrc ? (
                  isVideo ? (
                    <video
                      src={mediaUrl(heroPm.media.keyFull)}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={heroSrc}
                      alt={heroPm.media.alt ?? ""}
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-black/50">
                    No preview
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-black/60">Hero image</p>
                <p className="truncate text-sm font-mono text-black/70">
                  {heroPm.media.keyFull || "—"}
                </p>
                {heroPm.media.kind === "IMAGE" ? (
                  <div className="mt-2">
                    <label className="text-xs text-black/50">Alt text</label>
                    <input
                      type="text"
                      value={heroPm.media.alt ?? ""}
                      onChange={(e) => setMediaAltLocal(heroPm.media.id, e.target.value)}
                      onBlur={(e) => updateMediaAlt(heroPm.media.id, e.target.value)}
                      className="mt-0.5 w-full rounded border border-black/20 px-2 py-1 text-xs"
                      placeholder="Describe image for SEO and accessibility"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => generateAltTextForMedia(heroPm)}
                        className="btn btn-ghost text-xs"
                        disabled={altLoadingByMediaId[heroPm.media.id]}
                      >
                        {altLoadingByMediaId[heroPm.media.id]
                          ? "Generating…"
                          : heroPm.media.alt?.trim()
                            ? "Regenerate"
                            : "AI Generate Alt Text"}
                      </button>
                      {altErrorByMediaId[heroPm.media.id] ? (
                        <span className="text-xs text-red-600">{altErrorByMediaId[heroPm.media.id]}</span>
                      ) : null}
                    </div>
                    {heroPm.recommendedPlacement ? (
                      <div className="mt-3 rounded-lg border border-black/10 bg-white p-3">
                        <p className="text-[10px] uppercase tracking-wide text-black/40">AI portfolio placement</p>
                        <p className="mt-1 text-xs font-medium text-black/75">
                          {heroPm.recommendedPlacement}
                          {heroPm.confidenceScore !== null ? ` · ${heroPm.confidenceScore}% confidence` : ""}
                        </p>
                        {heroPm.reason ? <p className="mt-1 text-xs text-black/55">{heroPm.reason}</p> : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {heroPm.media.kind === "IMAGE" ? (
                <>
                  <button
                    type="button"
                    onClick={() => void analyzePortfolioPlacement([heroPm.media.id])}
                    className="btn btn-ghost text-xs"
                    disabled={placementLoadingByMediaId[heroPm.media.id]}
                  >
                    {placementLoadingByMediaId[heroPm.media.id] ? "Analyzing…" : "Analyze placement"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    disabled={id === "new" || uploadStatus === "uploading"}
                    onClick={() => {
                      const src = getCropSafeMediaUrl(heroPm.media.keyFull);
                      if (!src) {
                        setSaveError("Could not resolve image URL for cropping.");
                        return;
                      }
                      setImageCropModal({ mode: "hero", src, aspect: 16 / 9 });
                    }}
                  >
                    Crop / reframe
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setAsHero(null)}
                className="btn btn-ghost text-xs"
              >
                Clear hero
              </button>
            </div>
          );
        })()}

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`mt-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors ${
            dragOver ? "border-black/40 bg-black/5" : "border-black/20 bg-black/[0.02]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files?.length) void handleFiles(files);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-primary"
              disabled={uploadStatus === "uploading"}
            >
              Upload Media
            </button>
            <button
              type="button"
              onClick={() => setR2BrowserTarget("gallery")}
              className="btn btn-ghost"
            >
              Browse R2
            </button>
            {imageMedia.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => generateMissingAltText()}
                  className="btn btn-ghost"
                  disabled={Object.values(altLoadingByMediaId).some(Boolean)}
                >
                  Generate Missing Alt Text
                </button>
                <button
                  type="button"
                  onClick={() => void analyzePortfolioPlacement()}
                  className="btn btn-ghost"
                  disabled={placementBulkLoading || Object.values(placementLoadingByMediaId).some(Boolean)}
                >
                  {placementBulkLoading ? "Analyzing…" : "Analyze Images for Portfolio Placement"}
                </button>
              </>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-black/50">
            Drag and drop images or videos here, or browse existing R2 files
          </p>
        </div>

        <R2BrowserModal
          isOpen={r2BrowserTarget !== null}
          onClose={() => setR2BrowserTarget(null)}
          onAddKeys={handleAddKeysFromR2}
          mode={r2BrowserTarget === "gallery" ? "multiple" : "single"}
          projectId={id}
          pillarSlug={pillarSlug}
          projectSlug={project?.slug}
        />

        {imageCropModal ? (
          <ImageCropModal
            key={`${imageCropModal.mode}-${imageCropModal.src}`}
            title={
              imageCropModal.mode === "background" ? "Crop background image" : "Crop hero image (16:9)"
            }
            imageSrc={imageCropModal.src}
            aspect={imageCropModal.aspect}
            onClose={() => setImageCropModal(null)}
            onApply={async (blob) => {
              if (imageCropModal.mode === "hero") {
                await applyHeroCrop(blob);
              } else {
                const file = new File([blob], `background-crop-${Date.now()}.jpg`, {
                  type: "image/jpeg",
                });
                await uploadBackgroundFile(file, "backgroundMedia");
              }
            }}
          />
        ) : null}

        {saveError && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {saveError}
          </p>
        )}
        {uploadProgressEntries.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-black/70">
            {uploadProgressEntries.map(([name, status]) => (
              <li key={name} className="truncate">
                {name}: {status}
              </li>
            ))}
          </ul>
        )}
        {placementError ? (
          <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {placementError}
          </p>
        ) : null}

        <ul
          className="mt-6 space-y-3"
          onDragEnd={handleDragEnd}
        >
          {orderedMedia
            .filter((pm) => pm.media.id !== heroMediaId)
            .map((pm) => {
            const src = mediaUrl(pm.media.keyThumb ?? pm.media.keyFull);
            const isHero = heroMediaId === pm.media.id;
            const isVideo = pm.media.kind === "VIDEO";
            const isDropTarget = dragOverId === pm.media.id;
            return (
              <li
                key={pm.media.id}
                draggable
                onDragStart={(e) => handleMediaDragStart(e, pm.media.id)}
                onDragOver={(e) => handleMediaDragOver(e, pm.media.id)}
                onDragLeave={handleMediaDragLeave}
                onDrop={(e) => handleMediaDrop(e, pm.media.id)}
                className={`flex cursor-grab items-center gap-4 rounded-lg border border-black/10 p-3 transition-all active:cursor-grabbing ${
                  isDropTarget ? "border-black/30 bg-black/5 ring-1 ring-black/10" : ""
                }`}
              >
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-black/10">
                  {src ? (
                    isVideo ? (
                      <>
                        <video
                          src={mediaUrl(pm.media.keyFull)}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <svg
                            className="h-6 w-6 text-white"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt={pm.media.alt ?? ""}
                        className="h-full w-full object-cover"
                      />
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-black/50">
                      No preview
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-mono text-black/70">
                    {pm.media.keyFull || "—"}
                  </p>
                  {pm.media.kind === "IMAGE" && (
                    <div className="mt-1">
                      <label className="text-xs text-black/50">Alt text</label>
                      <input
                        type="text"
                        value={pm.media.alt ?? ""}
                        onChange={(e) => setMediaAltLocal(pm.media.id, e.target.value)}
                        onBlur={(e) => updateMediaAlt(pm.media.id, e.target.value)}
                        className="mt-0.5 w-full rounded border border-black/20 px-2 py-1 text-xs"
                        placeholder="Describe image for SEO and accessibility"
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => generateAltTextForMedia(pm)}
                          className="btn btn-ghost text-xs"
                          disabled={altLoadingByMediaId[pm.media.id]}
                        >
                          {altLoadingByMediaId[pm.media.id]
                            ? "Generating…"
                            : pm.media.alt?.trim()
                              ? "Regenerate"
                              : "AI Generate Alt Text"}
                        </button>
                        {altErrorByMediaId[pm.media.id] ? (
                          <span className="text-xs text-red-600">{altErrorByMediaId[pm.media.id]}</span>
                        ) : null}
                      </div>
                      {pm.recommendedPlacement ? (
                        <div className="mt-3 rounded-lg border border-black/10 bg-black/[0.02] p-3">
                          <p className="text-[10px] uppercase tracking-wide text-black/40">AI portfolio placement</p>
                          <p className="mt-1 text-xs font-medium text-black/75">
                            {pm.recommendedPlacement}
                            {pm.confidenceScore !== null ? ` · ${pm.confidenceScore}% confidence` : ""}
                          </p>
                          {pm.reason ? <p className="mt-1 text-xs text-black/55">{pm.reason}</p> : null}
                        </div>
                      ) : null}
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    {isHero && (
                      <span className="text-xs text-black/50">Hero</span>
                    )}
                    {homepageFeaturedMediaId === pm.media.id && (
                      <span className="rounded bg-black/10 px-1.5 py-0.5 text-xs text-black/60">
                        Featured
                      </span>
                    )}
                    {isVideo && (
                      <span className="rounded bg-black/10 px-1.5 py-0.5 text-xs text-black/60">
                        Video
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {!isHero && (
                    <button
                      type="button"
                      onClick={() => void setAsHero(pm.media.id)}
                      className="btn btn-ghost text-xs"
                    >
                      Set hero
                    </button>
                  )}
                  {!isVideo && (
                    <>
                      <button
                        type="button"
                        onClick={() => void analyzePortfolioPlacement([pm.media.id])}
                        className="btn btn-ghost text-xs"
                        disabled={placementLoadingByMediaId[pm.media.id]}
                      >
                        {placementLoadingByMediaId[pm.media.id] ? "Analyzing…" : "Analyze placement"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAsHomepageFeatured(pm.media.id)}
                        className="btn btn-ghost text-xs"
                      >
                        {homepageFeaturedMediaId === pm.media.id ? "Featured" : "Set as homepage featured"}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(pm.media.id)}
                    className="btn btn-ghost text-xs text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {orderedMedia.length === 0 && (
          <p className="mt-4 text-sm text-black/50">No media. Upload images or videos above.</p>
        )}
      </div>
    </div>
  );
}
