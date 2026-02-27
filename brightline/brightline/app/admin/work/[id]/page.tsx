"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { getPillarBySlug, SECTION_TO_PILLAR } from "@/lib/portfolioPillars";
import type { WorkSection } from "@prisma/client";
import R2BrowserModal from "../R2BrowserModal";

const R2_BASE = typeof process.env.NEXT_PUBLIC_R2_PUBLIC_URL === "string"
  ? process.env.NEXT_PUBLIC_R2_PUBLIC_URL.replace(/\/+$/, "")
  : "";

function mediaUrl(key: string | null): string {
  if (!key || !R2_BASE) return "";
  return `${R2_BASE}/${key.replace(/^\//, "")}`;
}

type MediaAsset = {
  id: string;
  kind: string;
  keyFull: string | null;
  keyThumb: string | null;
  alt: string | null;
  providerId?: string | null;
  posterKey?: string | null;
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
};

export default function AdminWorkEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
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
  const [newKeyFull, setNewKeyFull] = useState("");
  const [addMediaStatus, setAddMediaStatus] = useState<"idle" | "adding" | "error">("idle");
  const [addSuccessCount, setAddSuccessCount] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [showR2Browser, setShowR2Browser] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoPosterKey, setVideoPosterKey] = useState("");

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
          slug: slug.trim() || undefined,
          summary: summary.trim() || undefined,
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          year: year === "" ? undefined : Number(year),
          published,
          isFeatured,
          sortOrder,
          heroMediaId,
        }),
      });
      const data = (await res.json()) as { ok: boolean; project?: WorkProject; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Save failed (${res.status})`);
      if (data.project) setProject(data.project);
      setSaveStatus("idle");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
      setSaveStatus("error");
    }
  }

  async function handleAddByKey() {
    const lines = newKeyFull
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    setAddMediaStatus("adding");
    setSaveError("");
    try {
      const res = await fetch(`/api/admin/work-projects/${id}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: lines }),
      });
      const data = (await res.json()) as { ok: boolean; project?: WorkProject; error?: string; added?: number };
      if (!res.ok) throw new Error(data.error ?? "Add failed");
      if (data.project) {
        setProject(data.project);
        setNewKeyFull("");
        setAddSuccessCount(lines.length);
        setTimeout(() => setAddSuccessCount(null), 3000);
      }
      setAddMediaStatus("idle");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Add failed");
      setAddMediaStatus("error");
    }
  }

  async function handleAddKeys(keys: string[]) {
    setAddMediaStatus("adding");
    setSaveError("");
    try {
      const res = await fetch(`/api/admin/work-projects/${id}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
      });
      const data = (await res.json()) as { ok: boolean; project?: WorkProject; error?: string; added?: number };
      if (!res.ok) throw new Error(data.error ?? "Add failed");
      if (data.project) setProject(data.project);
      setAddMediaStatus("idle");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Add failed");
      setAddMediaStatus("error");
      throw err;
    }
  }

  async function handleAddVideo() {
    if (!videoUrl.trim()) return;
    setAddMediaStatus("adding");
    setSaveError("");
    try {
      const res = await fetch(`/api/admin/work-projects/${id}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video: {
            url: videoUrl.trim(),
            posterKey: videoPosterKey.trim() || undefined,
          },
        }),
      });
      const data = (await res.json()) as { ok: boolean; project?: WorkProject; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Add failed");
      if (data.project) {
        setProject(data.project);
        setVideoUrl("");
        setVideoPosterKey("");
        setAddSuccessCount(1);
        setTimeout(() => setAddSuccessCount(null), 3000);
      }
      setAddMediaStatus("idle");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Add failed");
      setAddMediaStatus("error");
    }
  }

  async function handleUploadAndAdd() {
    if (!uploadFile) return;
    setAddMediaStatus("adding");
    setSaveError("");
    try {
      const uploadRes = await fetch(`/api/admin/work-projects/${id}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: uploadFile.name,
          contentType: uploadFile.type || "image/jpeg",
        }),
      });
      const uploadData = (await uploadRes.json()) as { ok: boolean; url?: string; key?: string; error?: string };
      if (!uploadRes.ok || !uploadData.url || !uploadData.key) {
        throw new Error(uploadData.error ?? "Failed to get upload URL");
      }
      const putRes = await fetch(uploadData.url, {
        method: "PUT",
        body: uploadFile,
        headers: { "Content-Type": uploadFile.type || "image/jpeg" },
      });
      if (!putRes.ok) throw new Error("Upload to storage failed");
      const mediaRes = await fetch(`/api/admin/work-projects/${id}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyFull: uploadData.key }),
      });
      const mediaData = (await mediaRes.json()) as { ok: boolean; project?: WorkProject; error?: string };
      if (!mediaRes.ok) throw new Error(mediaData.error ?? "Failed to add media");
      if (mediaData.project) {
        setProject(mediaData.project);
        setUploadFile(null);
      }
      setAddMediaStatus("idle");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Upload failed");
      setAddMediaStatus("error");
    }
  }

  async function setAsHero(mediaId: string) {
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

  async function removeMedia(mediaId: string) {
    try {
      const res = await fetch(`/api/admin/work-projects/${id}/media?mediaId=${encodeURIComponent(mediaId)}`, {
        method: "DELETE",
      });
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <Link href="/admin/work" className="text-sm text-black/60 hover:underline">← Work projects</Link>
          <h1 className="mt-2 font-display text-2xl text-black">Edit: {project.title}</h1>
          <p className="text-xs text-black/50">/{pillarSlug}/{project.slug}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm("Delete this project? This cannot be undone.")) {
              fetch(`/api/admin/work-projects/${id}`, { method: "DELETE" })
                .then((r) => r.ok && router.push("/admin/work"));
            }
          }}
          className="btn btn-ghost text-red-600 text-sm"
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
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-black/60">Slug</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-black/60">Pillar</label>
              <p className="mt-1 text-sm text-black/70">{pillarLabel}</p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-wide text-black/60">Summary</label>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm" rows={2} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-wide text-black/60">Description (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm" rows={3} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-black/60">Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-black/60">Year</label>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value === "" ? "" : parseInt(e.target.value, 10))} className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm" min={1900} max={2100} />
            </div>
            <div className="flex gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
                Published
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm">
                Sort order:
                <input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)} className="w-16 rounded border border-black/20 px-2 py-1 text-sm" />
              </label>
            </div>
          </div>
        </div>

        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
        <button type="submit" className="btn btn-primary" disabled={saveStatus === "saving"}>
          {saveStatus === "saving" ? "Saving…" : "Save changes"}
        </button>
      </form>

      <div className="mt-10 rounded-xl border border-black/10 bg-white p-6">
        <h2 className="text-sm font-semibold text-black/80">Media</h2>
        <p className="mt-1 text-xs text-black/50">Hero: choose one below or leave none. Reorder by moving items.</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowR2Browser(true)}
            className="btn btn-ghost text-sm"
          >
            Browse R2
          </button>
          <span className="text-xs text-black/50">or paste key below</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <textarea
            value={newKeyFull}
            onChange={(e) => setNewKeyFull(e.target.value)}
            placeholder="R2 keys, one per line (e.g. portfolio/arc/web_full/xxx.webp)"
            className="min-h-[60px] min-w-[200px] flex-1 rounded border border-black/20 px-3 py-2 text-sm font-mono"
            rows={2}
          />
          <button type="button" onClick={handleAddByKey} className="btn btn-ghost text-sm self-end" disabled={addMediaStatus === "adding" || !newKeyFull.trim()}>
            Add
          </button>
        </div>
        {addSuccessCount != null && (
          <p className="mt-2 text-sm text-green-600">Added {addSuccessCount} item{addSuccessCount !== 1 ? "s" : ""}.</p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <button type="button" onClick={handleUploadAndAdd} className="btn btn-ghost text-sm" disabled={addMediaStatus === "adding" || !uploadFile}>
            Upload and add
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-black/10 bg-black/5 p-3">
          <p className="text-xs font-medium text-black/70">Add YouTube video</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div className="min-w-[200px] flex-1">
              <label className="sr-only">YouTube URL or video ID</label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or video ID"
                className="w-full rounded border border-black/20 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-[180px] flex-1">
              <label className="sr-only">Poster R2 key (optional)</label>
              <input
                type="text"
                value={videoPosterKey}
                onChange={(e) => setVideoPosterKey(e.target.value)}
                placeholder="Poster R2 key (optional)"
                className="w-full rounded border border-black/20 px-3 py-2 text-sm font-mono text-xs"
              />
            </div>
            <button
              type="button"
              onClick={handleAddVideo}
              className="btn btn-ghost text-sm"
              disabled={addMediaStatus === "adding" || !videoUrl.trim()}
            >
              Add video
            </button>
          </div>
        </div>

        <ul className="mt-6 space-y-3">
          {orderedMedia.map((pm, index) => {
            const isVideo = pm.media.kind === "VIDEO";
            const src = isVideo ? mediaUrl(pm.media.posterKey ?? null) : mediaUrl(pm.media.keyFull);
            const isHero = heroMediaId === pm.media.id;
            const label = isVideo
              ? `Video: ${pm.media.providerId ?? "—"}`
              : pm.media.keyFull || "—";
            return (
              <li key={pm.media.id} className="flex items-center gap-4 rounded-lg border border-black/10 p-3">
                {src ? (
                  <img src={src} alt={pm.media.alt ?? ""} className="h-16 w-24 object-cover rounded" />
                ) : (
                  <div className="flex h-16 w-24 items-center justify-center rounded bg-black/10 text-xs text-black/50">
                    {isVideo ? "Video" : "No preview"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-mono text-black/70">{label}</p>
                  {isHero && <span className="text-xs text-black/50">Hero</span>}
                </div>
                <div className="flex shrink-0 gap-2">
                  {!isHero && (
                    <button type="button" onClick={() => setAsHero(pm.media.id)} className="btn btn-ghost text-xs">
                      Set as hero
                    </button>
                  )}
                  <button type="button" onClick={() => removeMedia(pm.media.id)} className="btn btn-ghost text-xs text-red-600">
                    Remove
                  </button>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const ids = orderedMedia.map((m) => m.media.id);
                        const i = ids.indexOf(pm.media.id);
                        [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                        reorderMedia(ids);
                      }}
                      className="btn btn-ghost text-xs"
                    >
                      ↑
                    </button>
                  )}
                  {index < orderedMedia.length - 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const ids = orderedMedia.map((m) => m.media.id);
                        const i = ids.indexOf(pm.media.id);
                        [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]];
                        reorderMedia(ids);
                      }}
                      className="btn btn-ghost text-xs"
                    >
                      ↓
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {orderedMedia.length === 0 && <p className="mt-4 text-sm text-black/50">No media. Browse R2, add by key, or upload.</p>}
      </div>

      <R2BrowserModal
        isOpen={showR2Browser}
        onClose={() => setShowR2Browser(false)}
        onAddKeys={handleAddKeys}
      />
    </div>
  );
}
