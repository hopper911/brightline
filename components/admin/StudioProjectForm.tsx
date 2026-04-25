"use client";

/**
 * Studio CMS for `StudioProject`. Proofing/delivery galleries will use `StudioGallery` (admin UI TODO).
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { MediaAsset } from "@prisma/client";
import { getPublicR2Url } from "@/lib/r2";
import { slugify } from "@/lib/slugify";
import R2BrowserModal from "@/components/admin/R2BrowserModal";
import { GenerateCopyButton } from "@/components/admin/studio-os/GenerateCopyButton";
import { ProjectStatusBadge } from "@/components/admin/studio-os/ProjectStatusBadge";
import { PublishProjectButton } from "@/components/admin/studio-os/PublishProjectButton";

const DRAFT_PLACEHOLDER = "—";

function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, credentials: "include" });
}

function mediaUrl(input?: string | null) {
  const value = input?.trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value) || value.startsWith("/")) return value;
  return getPublicR2Url(value);
}

function isVideoUrl(input?: string | null) {
  const value = mediaUrl(input);
  if (!value) return false;
  const decoded = decodeURIComponent(value);
  try {
    const parsed = new URL(decoded, "https://brightline.local");
    const key = parsed.searchParams.get("key") ?? "";
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(key || parsed.pathname);
  } catch {
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(decoded);
  }
}

type GalleryRow = {
  mediaId: string;
  sortOrder: number;
  media: MediaAsset;
};

type StudioProjectPayload = {
  id: string;
  title: string;
  slug: string;
  client: string;
  category: string;
  subcategory: string | null;
  location: string;
  year: number;
  opening: string;
  context: string;
  approach: string;
  highlight: string;
  execution: string | null;
  closing: string;
  seoTitle: string | null;
  seoDescription: string | null;
  tags: string[];
  credits: string | null;
  featured: boolean;
  published: boolean;
  publishedAt: string | null;
  heroImageId: string | null;
  heroImage: MediaAsset | null;
  backgroundMediaUrl: string | null;
  backgroundPosterUrl: string | null;
  galleryMedia?: GalleryRow[];
  contentStatus: string;
  captionDrafted: boolean;
  websiteCopyDrafted: boolean;
  contentPosted: boolean;
  reusableLater: boolean;
};

type Props = {
  projectId?: string;
};

function parseTags(raw: string): string[] {
  return raw
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function StudioProjectForm({ projectId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!projectId);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [client, setClient] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [location, setLocation] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [opening, setOpening] = useState("");
  const [context, setContext] = useState("");
  const [approach, setApproach] = useState("");
  const [highlight, setHighlight] = useState("");
  const [execution, setExecution] = useState("");
  const [closing, setClosing] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [credits, setCredits] = useState("");
  const [aiNotes, setAiNotes] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [published, setPublished] = useState(false);
  const [contentStatus, setContentStatus] = useState("NONE");
  const [captionDrafted, setCaptionDrafted] = useState(false);
  const [websiteCopyDrafted, setWebsiteCopyDrafted] = useState(false);
  const [contentPosted, setContentPosted] = useState(false);
  const [reusableLater, setReusableLater] = useState(false);
  const [heroImageId, setHeroImageId] = useState<string | null>(null);
  const [heroPreview, setHeroPreview] = useState<MediaAsset | null>(null);
  const [backgroundMediaUrl, setBackgroundMediaUrl] = useState("");
  const [backgroundPosterUrl, setBackgroundPosterUrl] = useState("");
  const [galleryMedia, setGalleryMedia] = useState<GalleryRow[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "error">("idle");
  const [pubBusy, setPubBusy] = useState(false);
  const [r2HeroOpen, setR2HeroOpen] = useState(false);
  const [r2GalleryOpen, setR2GalleryOpen] = useState(false);
  const [r2BackgroundTarget, setR2BackgroundTarget] = useState<"backgroundMedia" | "backgroundPoster" | null>(null);

  const computedSlug = slug.trim() || slugify(title) || "project";

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch(`/api/projects/${projectId}`);
      const data = (await res.json()) as {
        ok: boolean;
        project?: StudioProjectPayload;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      const p = data.project;
      if (!p) throw new Error("No project");
      setTitle(p.title);
      setSlug(p.slug);
      setClient(p.client);
      setCategory(p.category);
      setSubcategory(p.subcategory ?? "");
      setLocation(p.location);
      setYear(p.year);
      setOpening(p.opening);
      setContext(p.context);
      setApproach(p.approach);
      setHighlight(p.highlight);
      setExecution(p.execution ?? "");
      setClosing(p.closing);
      setSeoTitle(p.seoTitle ?? "");
      setSeoDescription(p.seoDescription ?? "");
      setTagsRaw((p.tags ?? []).join(", "));
      setCredits(p.credits ?? "");
      setIsFeatured(p.featured);
      setPublished(p.published);
      setContentStatus(p.contentStatus ?? "NONE");
      setCaptionDrafted(Boolean(p.captionDrafted));
      setWebsiteCopyDrafted(Boolean(p.websiteCopyDrafted));
      setContentPosted(Boolean(p.contentPosted));
      setReusableLater(Boolean(p.reusableLater));
      setHeroImageId(p.heroImageId);
      setHeroPreview(p.heroImage ?? null);
      setBackgroundMediaUrl(p.backgroundMediaUrl ?? "");
      setBackgroundPosterUrl(p.backgroundPosterUrl ?? "");
      setGalleryMedia(
        (p.galleryMedia ?? []).map((g, i) => ({
          mediaId: g.mediaId,
          sortOrder: typeof g.sortOrder === "number" ? g.sortOrder : i,
          media: g.media,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  function yearNumber(): number {
    if (year === "") return new Date().getFullYear();
    const n = Number(year);
    if (!Number.isFinite(n)) throw new Error("Year must be a number.");
    return Math.trunc(n);
  }

  function buildGalleryJson(rows: GalleryRow[]) {
    return rows.map((g, i) => ({
      mediaId: g.mediaId,
      key: g.media.keyFull ?? "",
      sortOrder: i,
      alt: g.media.alt ?? undefined,
    }));
  }

  async function saveDraft() {
    setStatus("saving");
    setError("");
    const tags = parseTags(tagsRaw);
    const y = yearNumber();

    const baseFields = {
      title: title.trim() || "Untitled",
      slug: slug.trim() || undefined,
      client: client.trim() || DRAFT_PLACEHOLDER,
      category: category.trim() || DRAFT_PLACEHOLDER,
      subcategory: subcategory.trim() || null,
      location: location.trim() || DRAFT_PLACEHOLDER,
      year: y,
      opening: opening.trim() || DRAFT_PLACEHOLDER,
      context: context.trim() || DRAFT_PLACEHOLDER,
      approach: approach.trim() || DRAFT_PLACEHOLDER,
      highlight: highlight.trim() || DRAFT_PLACEHOLDER,
      closing: closing.trim() || DRAFT_PLACEHOLDER,
      execution: execution.trim() || null,
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
      tags,
      credits: credits.trim() || null,
      featured: isFeatured,
      contentStatus,
      captionDrafted,
      websiteCopyDrafted,
      contentPosted,
      reusableLater,
      heroImageId,
      backgroundMediaUrl: backgroundMediaUrl.trim() || null,
      backgroundPosterUrl: backgroundPosterUrl.trim() || null,
      gallery: buildGalleryJson(galleryMedia),
    };

    try {
      if (projectId) {
        const res = await adminFetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(baseFields),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Save failed");
        await load();
      } else {
        const res = await adminFetch("/api/projects/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...baseFields,
            published: false,
            gallery: [],
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          project?: { id: string };
        };
        if (!res.ok) throw new Error(data.error ?? "Create failed");
        if (data.project?.id) {
          router.push(`/admin/projects/${data.project.id}/edit`);
          return;
        }
      }
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function publishNow() {
    if (!projectId) {
      await saveDraft();
      return;
    }
    setPubBusy(true);
    setError("");
    try {
      const res = await adminFetch("/api/projects/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId, published: true }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      setPublished(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPubBusy(false);
    }
  }

  async function unpublishNow() {
    if (!projectId) return;
    setPubBusy(true);
    setError("");
    try {
      const res = await adminFetch("/api/projects/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId, published: false }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Unpublish failed");
      setPublished(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unpublish failed");
    } finally {
      setPubBusy(false);
    }
  }

  async function generateAi() {
    setAiStatus("loading");
    setError("");
    if (
      !client.trim() ||
      !category.trim() ||
      !location.trim()
    ) {
      setError("Fill client, category, and location before generating.");
      setAiStatus("idle");
      return;
    }
    try {
      const y = yearNumber();
      const res = await adminFetch("/api/projects/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: client.trim(),
          category: category.trim(),
          location: location.trim(),
          year: y,
          notes: aiNotes.trim(),
          title: title.trim() || undefined,
          ...(subcategory.trim() ? { subcategory: subcategory.trim() } : {}),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        opening?: string;
        context?: string;
        approach?: string;
        highlight?: string;
        execution?: string;
        closing?: string;
        seoTitle?: string;
        seoDescription?: string;
        tags?: string[];
      };
      if (!res.ok) throw new Error(data.error ?? "AI request failed");
      if (data.opening) setOpening(data.opening);
      if (data.context) setContext(data.context);
      if (data.approach) setApproach(data.approach);
      if (data.highlight) setHighlight(data.highlight);
      if (data.execution !== undefined) setExecution(data.execution);
      if (data.closing) setClosing(data.closing);
      if (data.seoTitle) setSeoTitle(data.seoTitle);
      if (data.seoDescription) setSeoDescription(data.seoDescription);
      if (data.tags?.length) setTagsRaw(data.tags.join(", "));
      setWebsiteCopyDrafted(true);
      setContentStatus((current) => current === "NONE" ? "WEBSITE_COPY_DRAFTED" : current);
      setAiStatus("idle");
    } catch (e) {
      setAiStatus("error");
      setError(e instanceof Error ? e.message : "AI failed");
    }
  }

  async function attachR2Keys(keys: string[], setFirstAsHero: boolean) {
    if (!projectId || keys.length === 0) return;
    setStatus("saving");
    setError("");
    try {
      const res = await adminFetch("/api/media/attach-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studioProjectId: projectId,
          keys,
          setFirstAsHero,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to attach from R2");
      await load();
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Attach failed");
    }
  }

  async function uploadToStudio(files: FileList | null, asHero: boolean) {
    if (!files?.length || !projectId) return;
    setStatus("saving");
    setError("");
    try {
      const list = Array.from(files);
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const form = new FormData();
        form.set("file", file);
        form.set("studioProjectId", projectId);
        form.set("projectTitle", title.trim() || "Project");
        const wantHero = asHero || (i === 0 && !heroImageId);
        if (wantHero) form.set("setAsHero", "true");
        const res = await adminFetch("/api/media/upload", { method: "POST", body: form });
        const data = (await res.json()) as { ok?: boolean; error?: string; mediaId?: string };
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        if (data.mediaId && wantHero) setHeroImageId(data.mediaId);
      }
      await load();
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  async function uploadBackgroundMedia(file: File, target: "backgroundMedia" | "backgroundPoster") {
    setStatus("saving");
    setError("");
    try {
      const contentType = file.type || "application/octet-stream";
      if (target === "backgroundPoster" && !contentType.startsWith("image/")) {
        throw new Error("Poster must be an image file.");
      }
      if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
        throw new Error("Only image and video uploads are supported.");
      }
      const res = await adminFetch("/api/admin/site-media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType,
          folder: "projects",
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        url?: string;
        key?: string;
        headers?: Record<string, string>;
        error?: string;
      };
      if (!res.ok || !data.url || !data.key) {
        throw new Error(data.error ?? "Could not prepare background upload.");
      }
      const put = await fetch(data.url, {
        method: "PUT",
        headers: { "Content-Type": contentType, ...(data.headers ?? {}) },
        body: file,
      });
      if (!put.ok) throw new Error(`Background upload failed (${put.status}).`);
      if (target === "backgroundMedia") {
        setBackgroundMediaUrl(data.key);
        await saveBackgroundSettings(data.key, backgroundPosterUrl);
      } else {
        setBackgroundPosterUrl(data.key);
        await saveBackgroundSettings(backgroundMediaUrl, data.key);
      }
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Background upload failed");
    }
  }

  async function saveBackgroundSettings(nextMedia: string, nextPoster: string) {
    if (!projectId) return;
    const res = await adminFetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        backgroundMediaUrl: nextMedia.trim() || null,
        backgroundPosterUrl: nextPoster.trim() || null,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to save background.");
    await load();
  }

  async function persistGallery(nextRows: GalleryRow[], nextHero: string | null) {
    if (!projectId) return;
    const res = await adminFetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        heroImageId: nextHero,
        gallery: buildGalleryJson(nextRows),
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Update failed");
    setGalleryMedia(nextRows);
    setHeroImageId(nextHero);
    await load();
  }

  async function moveMedia(mediaId: string, dir: -1 | 1) {
    const idx = galleryMedia.findIndex((g) => g.mediaId === mediaId);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= galleryMedia.length) return;
    const next = [...galleryMedia];
    [next[idx], next[j]] = [next[j], next[idx]];
    try {
      await persistGallery(next, heroImageId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reorder failed");
    }
  }

  async function removeMedia(mediaId: string) {
    if (!projectId) return;
    const next = galleryMedia.filter((g) => g.mediaId !== mediaId);
    let nextHero = heroImageId;
    if (nextHero === mediaId) {
      nextHero = next[0]?.mediaId ?? null;
    }
    try {
      await persistGallery(next, nextHero);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    }
  }

  async function setHero(mediaId: string) {
    if (!projectId) return;
    setHeroImageId(mediaId);
    try {
      const res = await adminFetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroImageId: mediaId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to set hero");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Set hero failed");
    }
  }

  if (loading) {
    return <p className="text-sm text-black/60">Loading…</p>;
  }

  return (
    <div className="space-y-10">
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-black/10 bg-white/70 p-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-black/50">Basic info</h2>
        <input
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <div className="rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-black/60">
          Slug preview: {computedSlug}
          <input
            className="mt-2 w-full rounded border border-black/10 px-2 py-1 text-black"
            placeholder="Override slug (optional)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={!projectId}
          />
        </div>
        <input
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Client"
          value={client}
          onChange={(e) => setClient(e.target.value)}
        />
        <input
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Category (e.g. Campaign)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <input
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Subcategory (optional, e.g. Lookbook)"
          value={subcategory}
          onChange={(e) => setSubcategory(e.target.value)}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
            placeholder="Year"
            type="number"
            value={year}
            onChange={(e) =>
              setYear(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-black/10 bg-white/70 p-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-black/50">Content</h2>
        <textarea
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Opening"
          rows={3}
          value={opening}
          onChange={(e) => setOpening(e.target.value)}
        />
        <textarea
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Context"
          rows={4}
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
        <textarea
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Approach"
          rows={4}
          value={approach}
          onChange={(e) => setApproach(e.target.value)}
        />
        <input
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Highlight (one line)"
          value={highlight}
          onChange={(e) => setHighlight(e.target.value)}
        />
        <textarea
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Execution (optional)"
          rows={3}
          value={execution}
          onChange={(e) => setExecution(e.target.value)}
        />
        <input
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Closing"
          value={closing}
          onChange={(e) => setClosing(e.target.value)}
        />
        <textarea
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Credits (optional)"
          rows={3}
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-black/10 bg-white/70 p-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-black/50">Content pipeline</h2>
        <select
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          value={contentStatus}
          onChange={(e) => setContentStatus(e.target.value)}
        >
          <option value="NONE">None</option>
          <option value="CAPTION_DRAFTED">Caption drafted</option>
          <option value="WEBSITE_COPY_DRAFTED">Website copy drafted</option>
          <option value="READY_TO_POST">Ready to post</option>
          <option value="POSTED">Posted</option>
          <option value="REUSABLE">Reusable later</option>
        </select>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-black/70">
            <input
              type="checkbox"
              checked={captionDrafted}
              onChange={(e) => setCaptionDrafted(e.target.checked)}
            />
            Caption drafted
          </label>
          <label className="flex items-center gap-2 text-sm text-black/70">
            <input
              type="checkbox"
              checked={websiteCopyDrafted}
              onChange={(e) => setWebsiteCopyDrafted(e.target.checked)}
            />
            Website copy drafted
          </label>
          <label className="flex items-center gap-2 text-sm text-black/70">
            <input
              type="checkbox"
              checked={contentPosted}
              onChange={(e) => setContentPosted(e.target.checked)}
            />
            Posted
          </label>
          <label className="flex items-center gap-2 text-sm text-black/70">
            <input
              type="checkbox"
              checked={reusableLater}
              onChange={(e) => setReusableLater(e.target.checked)}
            />
            Reusable later
          </label>
        </div>
        <p className="text-xs text-black/50">
          Manual checklist only. Studio OS will suggest opportunities but will never post automatically.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-black/10 bg-white/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-black/50">AI generation</h2>
          <GenerateCopyButton
            loading={aiStatus === "loading"}
            onClick={() => void generateAi()}
          />
        </div>
        <p className="text-xs text-black/50">
          Fills content and SEO from basic info, year, and optional notes. Requires client, category, and location.
        </p>
        <textarea
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Notes for AI (brief, deliverables, tone)"
          rows={4}
          value={aiNotes}
          onChange={(e) => setAiNotes(e.target.value)}
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-black/10 bg-white/70 p-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-black/50">Media</h2>
        {!projectId ? (
          <p className="text-sm text-black/60">Save a draft once to enable image uploads.</p>
        ) : (
          <>
            <div className="space-y-3 rounded-xl border border-black/10 bg-black/[0.02] p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-black/50">Page background</p>
                <p className="mt-1 text-xs text-black/45">
                  Optional image or looping video behind the public project/case study page.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs text-black/50">Background image/video</label>
                  <input
                    value={backgroundMediaUrl}
                    onChange={(e) => setBackgroundMediaUrl(e.target.value)}
                    className="mt-1 w-full rounded border border-black/10 px-3 py-2 font-mono text-xs"
                    placeholder="R2 key, /path, or https://..."
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost text-xs"
                      onClick={() => setR2BackgroundTarget("backgroundMedia")}
                    >
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
                          if (file) void uploadBackgroundMedia(file, "backgroundMedia");
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {backgroundMediaUrl ? (
                      <button type="button" className="btn btn-ghost text-xs" onClick={() => setBackgroundMediaUrl("")}>
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-black/50">Video poster image</label>
                  <input
                    value={backgroundPosterUrl}
                    onChange={(e) => setBackgroundPosterUrl(e.target.value)}
                    className="mt-1 w-full rounded border border-black/10 px-3 py-2 font-mono text-xs"
                    placeholder="Optional poster key or URL"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost text-xs"
                      onClick={() => setR2BackgroundTarget("backgroundPoster")}
                    >
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
                          if (file) void uploadBackgroundMedia(file, "backgroundPoster");
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {backgroundPosterUrl ? (
                      <button type="button" className="btn btn-ghost text-xs" onClick={() => setBackgroundPosterUrl("")}>
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              {backgroundMediaUrl ? (
                <div className="overflow-hidden rounded-xl border border-black/10 bg-black">
                  {isVideoUrl(backgroundMediaUrl) ? (
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
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-black/50">Hero image</p>
              {heroPreview && (heroPreview.keyThumb || heroPreview.keyFull) ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-black/10 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getPublicR2Url(heroPreview.keyThumb || heroPreview.keyFull || "")}
                    alt={heroPreview.alt ?? ""}
                    className="h-24 w-36 rounded object-cover"
                  />
                  <span className="text-xs text-black/50">Current hero (replace by uploading below)</span>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  className="text-sm"
                  onChange={(e) => void uploadToStudio(e.target.files, true)}
                />
                <button
                  type="button"
                  className="btn btn-ghost text-sm"
                  onClick={() => setR2HeroOpen(true)}
                >
                  Browse R2
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-black/50">Gallery images</p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="text-sm"
                  onChange={(e) => void uploadToStudio(e.target.files, false)}
                />
                <button
                  type="button"
                  className="btn btn-ghost text-sm"
                  onClick={() => setR2GalleryOpen(true)}
                >
                  Browse R2
                </button>
              </div>
            </div>
            <ul className="space-y-3">
              {galleryMedia.map((m, i) => {
                const url = m.media.keyThumb
                  ? getPublicR2Url(m.media.keyThumb)
                  : m.media.keyFull
                    ? getPublicR2Url(m.media.keyFull)
                    : "";
                const isHero = heroImageId === m.mediaId;
                return (
                  <li
                    key={m.mediaId}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-black/10 p-3"
                  >
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={m.media.alt ?? ""}
                        className="h-20 w-28 rounded object-cover"
                      />
                    ) : null}
                    <span className="text-xs text-black/50">
                      {isHero ? "Hero · " : ""}
                      {m.media.alt ?? m.mediaId}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-ghost text-xs"
                        onClick={() => void moveMedia(m.mediaId, -1)}
                        disabled={i === 0}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost text-xs"
                        onClick={() => void moveMedia(m.mediaId, 1)}
                        disabled={i === galleryMedia.length - 1}
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost text-xs"
                        onClick={() => void setHero(m.mediaId)}
                      >
                        Set hero
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost text-xs text-red-700"
                        onClick={() => void removeMedia(m.mediaId)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <R2BrowserModal
        isOpen={r2HeroOpen}
        onClose={() => setR2HeroOpen(false)}
        mode="single"
        onAddKeys={async (keys) => {
          await attachR2Keys(keys.slice(0, 1), true);
        }}
      />
      <R2BrowserModal
        isOpen={r2GalleryOpen}
        onClose={() => setR2GalleryOpen(false)}
        mode="multiple"
        onAddKeys={async (keys) => {
          await attachR2Keys(keys, false);
        }}
      />
      <R2BrowserModal
        isOpen={r2BackgroundTarget !== null}
        onClose={() => setR2BackgroundTarget(null)}
        mode="single"
        onAddKeys={async (keys) => {
          const key = keys[0]?.trim();
          if (key && r2BackgroundTarget === "backgroundMedia") {
            setBackgroundMediaUrl(key);
            await saveBackgroundSettings(key, backgroundPosterUrl);
          }
          if (key && r2BackgroundTarget === "backgroundPoster") {
            setBackgroundPosterUrl(key);
            await saveBackgroundSettings(backgroundMediaUrl, key);
          }
          setR2BackgroundTarget(null);
        }}
      />

      <section className="space-y-4 rounded-2xl border border-black/10 bg-white/70 p-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-black/50">SEO</h2>
        <input
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="SEO title"
          value={seoTitle}
          onChange={(e) => setSeoTitle(e.target.value)}
        />
        <textarea
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="SEO description"
          rows={3}
          value={seoDescription}
          onChange={(e) => setSeoDescription(e.target.value)}
        />
        <input
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Tags (comma-separated)"
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-black/10 bg-white/70 p-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-black/50">Publishing</h2>
        <p className="flex flex-wrap items-center gap-2 text-sm text-black/60">
          <span>Status:</span> <ProjectStatusBadge published={published} />
          {published ? <span>· Use Unpublish to return to draft.</span> : null}
        </p>
        <label className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-black/60">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
          />
          Featured
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-primary"
            disabled={status === "saving"}
            onClick={() => void saveDraft()}
          >
            {status === "saving" ? "Saving…" : "Save draft"}
          </button>
          <PublishProjectButton
            busy={pubBusy}
            disabled={!projectId}
            published={published}
            onPublish={() => void publishNow()}
            onUnpublish={() => void unpublishNow()}
          />
          <Link href="/admin/projects" className="btn btn-ghost">
            Back to list
          </Link>
        </div>
      </section>
    </div>
  );
}
