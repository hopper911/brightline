"use client";

import { useRef, useState } from "react";
import {
  blankBlogPostVideo,
  detectBlogVideoProviderFromUrl,
  extractInstagramPermalink,
  extractYouTubeId,
  type BlogPostVideo,
  type BlogPostVideoProvider,
} from "@/lib/blog-post-model";
import { getPublicR2Url } from "@/lib/r2";

const MONO_INPUT_CLASS =
  "w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/35";

type PosterOption = {
  label: string;
  value: string;
};

type BlogVideosEditorProps = {
  videos: BlogPostVideo[];
  slug: string;
  onChange: (videos: BlogPostVideo[]) => void;
  /** Cover + gallery stills for Instagram poster fallback. */
  posterOptions?: PosterOption[];
};

async function checkYouTubeEmbeddable(url: string): Promise<"ok" | "blocked" | "unknown"> {
  const id = extractYouTubeId(url);
  if (!id) return "unknown";
  try {
    const watch = `https://www.youtube.com/watch?v=${id}`;
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`
    );
    if (res.ok) return "ok";
    if (res.status === 401 || res.status === 403 || res.status === 404) return "blocked";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export default function BlogVideosEditor({
  videos,
  slug,
  onChange,
  posterOptions = [],
}: BlogVideosEditorProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [pasteUrl, setPasteUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [embedHints, setEmbedHints] = useState<Record<string, string>>({});
  const [posterPickerFor, setPosterPickerFor] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function updateVideo(id: string, patch: Partial<BlogPostVideo>) {
    onChange(videos.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  function removeVideo(id: string) {
    onChange(videos.filter((v) => v.id !== id));
    setEmbedHints((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function addFromUrl() {
    setError("");
    const provider = detectBlogVideoProviderFromUrl(pasteUrl);
    if (!provider) {
      setError("Paste a YouTube or Instagram Reel/post URL.");
      return;
    }
    const url =
      provider === "instagram"
        ? extractInstagramPermalink(pasteUrl) || pasteUrl.trim()
        : pasteUrl.trim();
    const video = blankBlogPostVideo({ provider, url });
    onChange([...videos, video]);
    setPasteUrl("");

    if (provider === "youtube") {
      const status = await checkYouTubeEmbeddable(url);
      if (status === "blocked") {
        setEmbedHints((prev) => ({
          ...prev,
          [video.id]:
            "This YouTube video may block embedding. Upload the file to R2 or enable embedding in YouTube Studio.",
        }));
      }
    }
  }

  async function uploadR2(file: File) {
    setError("");
    setUploading(true);
    try {
      const prefix = `site/blog/${slug || "draft"}/videos/`;
      const contentType = file.type || "video/mp4";
      const res = await fetch("/api/admin/r2/upload-url", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix,
          fileName: `${Date.now()}-${file.name}`,
          contentType,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        key?: string;
        uploadUrl?: string;
        headers?: Record<string, string>;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.uploadUrl || !json.key) {
        throw new Error(json.error || "Could not get upload URL.");
      }
      const put = await fetch(json.uploadUrl, {
        method: "PUT",
        headers: json.headers || { "Content-Type": contentType },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status}).`);
      onChange([
        ...videos,
        blankBlogPostVideo({
          provider: "r2",
          r2Key: json.key,
          caption: file.name.replace(/\.[^.]+$/, ""),
        }),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const ids = videos.map((v) => v.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...videos];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    onChange(next);
    setDraggedId(null);
    setDragOverId(null);
  }

  function providerLabel(provider: BlogPostVideoProvider) {
    if (provider === "instagram") return "Instagram";
    if (provider === "r2") return "R2 upload";
    if (provider === "ai") return "AI video";
    return "YouTube";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-[0.65rem] uppercase tracking-[0.16em] text-white/50">
            Add YouTube or Instagram URL
          </label>
          <input
            value={pasteUrl}
            onChange={(e) => setPasteUrl(e.target.value)}
            placeholder="https://youtu.be/… or instagram.com/reel/…"
            className={MONO_INPUT_CLASS}
          />
        </div>
        <button type="button" className="btn btn-ghost text-xs" onClick={() => void addFromUrl()}>
          Add embed
        </button>
        <button
          type="button"
          className="btn btn-ghost text-xs"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "Uploading…" : "Upload MP4 to R2"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadR2(file);
          }}
        />
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      <p className="text-xs text-white/45">
        Stack Instagram, YouTube, and R2 uploads. Drag to reorder. Instagram shows as a dark
        on-site card (opens Instagram — no white embed frame). YouTube uses a thumbnail card;
        if embedding is blocked, visitors get “Watch on YouTube”. For in-page playback of your
        own clips, upload an MP4 to R2.
      </p>

      <div className="space-y-3">
        {videos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-xs text-white/45">
            No videos yet.
          </p>
        ) : null}
        {videos.map((video) => {
          const isOver = dragOverId === video.id;
          return (
            <div
              key={video.id}
              draggable
              onDragStart={() => setDraggedId(video.id)}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedId && draggedId !== video.id) setDragOverId(video.id);
              }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(video.id);
              }}
              onDragEnd={() => {
                setDraggedId(null);
                setDragOverId(null);
              }}
              className={`rounded-xl border bg-black/30 p-4 ${
                isOver ? "border-violet-300/50" : "border-white/10"
              } ${draggedId === video.id ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="cursor-grab text-xs uppercase tracking-[0.16em] text-white/55 active:cursor-grabbing">
                  ⇅ {providerLabel(video.provider)}
                </p>
                <button
                  type="button"
                  className="text-xs uppercase tracking-[0.16em] text-red-300/80"
                  onClick={() => removeVideo(video.id)}
                >
                  Remove
                </button>
              </div>

              {video.provider === "youtube" || video.provider === "instagram" ? (
                <input
                  value={video.url}
                  onChange={(e) => {
                    const url = e.target.value;
                    const detected = detectBlogVideoProviderFromUrl(url);
                    updateVideo(video.id, {
                      url,
                      ...(detected ? { provider: detected } : {}),
                    });
                  }}
                  className={`${MONO_INPUT_CLASS} mt-3`}
                  placeholder="Video URL"
                />
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="truncate text-xs text-white/55">{video.r2Key}</p>
                  {video.r2Key ? (
                    <video
                      controls
                      playsInline
                      className="max-h-48 w-full rounded-lg border border-white/10 bg-black"
                      src={getPublicR2Url(video.r2Key)}
                    />
                  ) : null}
                </div>
              )}

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[0.65rem] uppercase tracking-[0.16em] text-white/45">
                    Caption
                  </label>
                  <input
                    value={video.caption}
                    onChange={(e) => updateVideo(video.id, { caption: e.target.value })}
                    className={MONO_INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.65rem] uppercase tracking-[0.16em] text-white/45">
                    Poster (optional)
                  </label>
                  <input
                    value={video.posterUrl}
                    onChange={(e) => updateVideo(video.id, { posterUrl: e.target.value })}
                    className={MONO_INPUT_CLASS}
                    placeholder="R2 key or Brightline media URL"
                  />
                  {(video.provider === "instagram" || video.provider === "youtube") &&
                  posterOptions.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-ghost text-[0.65rem]"
                        onClick={() =>
                          setPosterPickerFor((id) => (id === video.id ? null : video.id))
                        }
                      >
                        {posterPickerFor === video.id
                          ? "Hide gallery posters"
                          : "Choose poster from gallery/cover"}
                      </button>
                      {video.posterUrl ? (
                        <button
                          type="button"
                          className="text-[0.65rem] uppercase tracking-[0.14em] text-white/45"
                          onClick={() => updateVideo(video.id, { posterUrl: "" })}
                        >
                          Clear poster
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {(video.provider === "instagram" || video.provider === "youtube") &&
                  posterPickerFor === video.id ? (
                    <div className="mt-3 grid max-h-48 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                      {posterOptions.map((opt) => {
                        const preview = getPublicR2Url(opt.value) || opt.value;
                        const selected = video.posterUrl === opt.value;
                        return (
                          <button
                            key={`${video.id}-${opt.value}`}
                            type="button"
                            title={opt.label}
                            onClick={() => {
                              updateVideo(video.id, { posterUrl: opt.value });
                              setPosterPickerFor(null);
                            }}
                            className={`relative aspect-square overflow-hidden rounded-lg border ${
                              selected ? "border-white/60" : "border-white/15"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={preview}
                              alt=""
                              className="h-full w-full object-cover"
                              draggable={false}
                            />
                            <span className="absolute inset-x-0 bottom-0 bg-black/65 px-1 py-0.5 text-[0.55rem] uppercase tracking-[0.12em] text-white/80">
                              {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {(video.provider === "instagram" || video.provider === "youtube") &&
                  !posterOptions.length ? (
                    <p className="mt-2 text-[0.7rem] text-white/40">
                      Add a cover or gallery image to pick a Brightline still as the poster.
                    </p>
                  ) : null}
                </div>
              </div>

              {embedHints[video.id] ? (
                <p className="mt-3 text-xs text-amber-200/90">{embedHints[video.id]}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
