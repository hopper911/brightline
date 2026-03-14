"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { getPillarBySlug, SECTION_TO_PILLAR } from "@/lib/portfolioPillars";
import type { WorkSection } from "@prisma/client";
import { getPublicR2Url } from "@/lib/r2";
import R2BrowserModal from "../R2BrowserModal";

function mediaUrl(key: string | null): string {
  if (!key) return "";
  return getPublicR2Url(key);
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
  media: MediaAsset;
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
};

const VIDEO_EXT = new Set(["mp4", "webm", "mov"]);

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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [r2BrowserOpen, setR2BrowserOpen] = useState(false);
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
    void loadHomepageFeatured();
  }, [loadHomepageFeatured]);

  const loadProject = useCallback(async () => {
    if (id === "new") return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/work-projects/${id}`);
      const data = (await res.json()) as { ok: boolean; project?: WorkProject; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      const p = data.project;
      if (p) {
        setProject(p);
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

  async function handleSaveProject(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus("saving");
    setSaveError("");
    try {
      const res = await fetch(`/api/admin/work-projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || null,
          summary: summary.trim() ? summary.trim() : null,
          description: description.trim() ? description.trim() : null,
          location: location.trim() ? location.trim() : null,
          year: year === "" ? null : (Number.isFinite(Number(year)) ? Number(year) : null),
          published,
          isFeatured,
          sortOrder,
          heroMediaId,
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
        }),
      });
      const data = (await res.json()) as { ok: boolean; project?: WorkProject; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      if (data.project) setProject(data.project);
      setSaveStatus("idle");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
      setSaveStatus("error");
    }
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
      const uploadData = (await uploadRes.json()) as { ok: boolean; url?: string; key?: string; error?: string };
      if (!uploadRes.ok || !uploadData.url || !uploadData.key) {
        const msg = uploadData.error ?? (uploadRes.status === 401 ? "Please log in again" : "Failed to get upload URL");
        throw new Error(msg);
      }

      const putRes = await fetch(uploadData.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
      });
      if (!putRes.ok) {
        const hint = putRes.status === 403 ? " (R2 CORS or bucket config)" : "";
        throw new Error(`Upload to storage failed${hint}`);
      }

      const keyFull = uploadData.key;
      let keyThumb: string | undefined;
      let width: number | undefined;
      let height: number | undefined;

      if (isVideo) {
        await addMedia({ keyFull, kind: "VIDEO" });
      } else {
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
        const thumbUploadData = (await thumbUploadRes.json()) as { ok: boolean; url?: string; key?: string; error?: string };
        if (!thumbUploadRes.ok || !thumbUploadData.url || !thumbUploadData.key) {
          throw new Error(thumbUploadData.error ?? "Failed to get thumb upload URL");
        }
        const thumbPutRes = await fetch(thumbUploadData.url, {
          method: "PUT",
          body: thumbBlob,
          headers: { "Content-Type": "image/jpeg" },
        });
        if (!thumbPutRes.ok) throw new Error("Thumb upload failed");
        keyThumb = thumbUploadData.key;

        const img = await createImageBitmap(file);
        width = img.width;
        height = img.height;
        img.close();

        await addMedia({ keyFull, keyThumb, kind: "IMAGE", width, height });
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

  async function addMedia(payload: {
    keyFull: string;
    keyThumb?: string;
    kind: "IMAGE" | "VIDEO";
    width?: number;
    height?: number;
  }) {
    const mediaRes = await fetch(`/api/admin/work-projects/${id}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const mediaData = (await mediaRes.json()) as { ok: boolean; project?: WorkProject; error?: string };
    if (!mediaRes.ok) throw new Error(mediaData.error ?? "Failed to add media");
    if (mediaData.project) setProject(mediaData.project);
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

  const pillarSlug = SECTION_TO_PILLAR[project.section];
  const pillarLabel = getPillarBySlug(pillarSlug)?.label ?? project.section;
  const orderedMedia = [...(project.media ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const uploadProgressEntries = Object.entries(uploadProgress);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <Link href="/admin/work" className="text-sm text-black/60 hover:underline">
            ← Work projects
          </Link>
          <h1 className="mt-2 font-display text-2xl text-black">Edit: {project.title}</h1>
          <p className="text-xs text-black/50">
            /{pillarSlug}/{project.slug}
          </p>
        </div>
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
              <p className="mt-1 text-sm text-black/70">{pillarLabel}</p>
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

        <div className="rounded-xl border border-black/10 bg-white p-6">
          <button
            type="button"
            onClick={() => setCaseStudyExpanded(!caseStudyExpanded)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-sm font-semibold text-black/80">Case study / SEO</h2>
            <span className="text-black/50">{caseStudyExpanded ? "−" : "+"}</span>
          </button>
          {caseStudyExpanded && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-black/60">Client</label>
                  <input
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
                    placeholder="e.g. JA Jennings Inc."
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-black/60">Project type</label>
                  <input
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
                    placeholder="e.g. Office Renovation"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wide text-black/60">Scope</label>
                  <input
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
                    placeholder="e.g. Commercial interior and workplace photography"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wide text-black/60">Overview extended (2nd paragraph)</label>
                  <textarea
                    value={overviewExtended}
                    onChange={(e) => setOverviewExtended(e.target.value)}
                    className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wide text-black/60">What was photographed</label>
                  <textarea
                    value={whatWasPhotographed}
                    onChange={(e) => setWhatWasPhotographed(e.target.value)}
                    className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wide text-black/60">Visual approach</label>
                  <textarea
                    value={visualApproach}
                    onChange={(e) => setVisualApproach(e.target.value)}
                    className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wide text-black/60">Location context</label>
                  <textarea
                    value={locationContext}
                    onChange={(e) => setLocationContext(e.target.value)}
                    className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wide text-black/60">Who this photography serves</label>
                  <textarea
                    value={whoIsThisFor}
                    onChange={(e) => setWhoIsThisFor(e.target.value)}
                    className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
                    rows={2}
                    placeholder="general contractors, developers, architects..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wide text-black/60">SEO title (optional override)</label>
                  <input
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wide text-black/60">Meta description (optional override)</label>
                  <textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wide text-black/60">CTA copy (optional override)</label>
                  <textarea
                    value={ctaCopy}
                    onChange={(e) => setCtaCopy(e.target.value)}
                    className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
        <button type="submit" className="btn btn-primary" disabled={saveStatus === "saving"}>
          {saveStatus === "saving" ? "Saving…" : "Save changes"}
        </button>
      </form>

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
            <div className="mt-4 flex items-center gap-4 rounded-lg border border-black/10 bg-black/[0.02] p-3">
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
              </div>
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
              onClick={() => setR2BrowserOpen(true)}
              className="btn btn-ghost"
            >
              Browse R2
            </button>
          </div>
          <p className="mt-2 text-xs text-black/50">
            Drag and drop images or videos here, or browse existing R2 files
          </p>
        </div>

        <R2BrowserModal
          isOpen={r2BrowserOpen}
          onClose={() => setR2BrowserOpen(false)}
          onAddKeys={handleAddKeysFromR2}
          projectId={id}
          pillarSlug={pillarSlug}
          projectSlug={project?.slug}
        />

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
                  <div className="flex items-center gap-2">
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
                      onClick={() => setAsHero(pm.media.id)}
                      className="btn btn-ghost text-xs"
                    >
                      Set hero
                    </button>
                  )}
                  {!isVideo && (
                    <button
                      type="button"
                      onClick={() => setAsHomepageFeatured(pm.media.id)}
                      className="btn btn-ghost text-xs"
                    >
                      {homepageFeaturedMediaId === pm.media.id ? "Featured" : "Set as homepage featured"}
                    </button>
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
