"use client";

import { useCallback, useState } from "react";
import { externalLinkProps } from "@/lib/external-link";
import Link from "next/link";
import { getPublicR2Url } from "@/lib/r2";
import {
  BACKGROUND_SHARE_PLATFORMS,
  linkedInShareUrl,
  xShareUrl,
  youtubeStudioUploadUrl,
} from "@/lib/site-background-share";
import { encodeBackgroundWebMp4, readVideoFileMeta } from "@/lib/encode-background-web";
import R2BrowserModal from "../work/R2BrowserModal";
import PageAssignmentsPanel from "./page-assignments-panel";

export type BgVideoRow = {
  id: string;
  title: string;
  slug: string;
  storageKey: string;
  webStorageKey: string | null;
  posterKey: string | null;
  sortOrder: number;
  width: number | null;
  height: number | null;
  bytes: number | null;
  durationSec: number | null;
  enabled: boolean;
  isActive: boolean;
  updatedAt: string;
};

type R2Target = "storage" | "poster" | "web" | null;

const API = "/api/admin/site-backgrounds";

function formatBytes(bytes: number | null) {
  if (bytes == null || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function thumbUrl(key: string | null) {
  if (!key) return "";
  return getPublicR2Url(key.replace(/^\/+/, ""));
}

function friendlyFetchError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return `${fallback} Check your connection and try again, or use Choose from R2.`;
  }
  if (/413|too large|payload/i.test(message)) {
    return "File too large for a single request — retry Upload high-res (chunked).";
  }
  if (/minimum allowed object size|entity too small|part.*small/i.test(message)) {
    return "Upload part size rejected by storage — retry; small files now use a single put.";
  }
  if (/wasm|webassembly|encoder|ffmpeg|sharedarraybuffer/i.test(message)) {
    return message;
  }
  return message || fallback;
}

function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  return /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(file.name);
}

function friendlyEncodeError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? "");
  if (/failed to fetch|networkerror|load failed|wasm|webassembly/i.test(message)) {
    return "Browser web-encode could not load (network/CSP/WASM). Master is already on R2 — click Add to library, or upload a ≤1080p MP4 via Choose web encode from R2.";
  }
  if (/memory|out of memory|oom/i.test(message)) {
    return "Web encode ran out of memory on this file. Master is uploaded — Add to library, or attach a smaller web MP4 from R2.";
  }
  return (
    message ||
    "Web encode failed. Master is uploaded — Add to library, or choose a web MP4 from R2."
  );
}

async function readJson(res: Response) {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    throw new Error(`Bad response (${res.status}).`);
  }
}

/** Under Vercel’s ~4.5MB body limit — use one-shot server PUT (no R2 multipart). */
const SINGLE_PUT_MAX = 3.5 * 1024 * 1024;

async function uploadFileSingle(
  file: File,
  folder: "full" | "web" | "posters" | "social",
  onProgress?: (ratio: number, label: string) => void
): Promise<string> {
  onProgress?.(0.1, "Uploading…");
  const form = new FormData();
  form.set("file", file);
  form.set("folder", folder);
  const res = await fetch(`${API}/upload`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const data = (await readJson(res)) as { ok?: boolean; key?: string; error?: string };
  if (!res.ok || !data.ok || !data.key) {
    throw new Error(data.error ?? "Upload failed.");
  }
  onProgress?.(1, "Upload complete.");
  return data.key;
}

/**
 * Chunked upload: ≤3MB staging chunks through Vercel, then server assembles with
 * R2 multipart rules (≥5MB non-final parts). Small files use a single PUT instead.
 */
async function uploadFileChunked(
  file: File,
  folder: "full" | "web" | "posters" | "social",
  onProgress?: (ratio: number, label: string) => void
): Promise<string> {
  if (file.size <= SINGLE_PUT_MAX) {
    return uploadFileSingle(file, folder, onProgress);
  }

  onProgress?.(0, "Starting upload…");
  const initRes = await fetch(`${API}/upload/multipart/init`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      folder,
      bytes: file.size,
    }),
  });
  const init = (await readJson(initRes)) as {
    ok?: boolean;
    key?: string;
    stagingPrefix?: string;
    contentType?: string;
    partSize?: number;
    error?: string;
  };
  if (!initRes.ok || !init.ok || !init.key || !init.stagingPrefix) {
    throw new Error(init.error ?? "Could not start upload.");
  }

  const partSize = init.partSize && init.partSize > 0 ? init.partSize : 3 * 1024 * 1024;
  const totalParts = Math.max(1, Math.ceil(file.size / partSize));

  try {
    for (let i = 0; i < totalParts; i++) {
      const start = i * partSize;
      const end = Math.min(file.size, start + partSize);
      const blob = file.slice(start, end);
      const form = new FormData();
      form.set("stagingPrefix", init.stagingPrefix);
      form.set("partNumber", String(i + 1));
      form.set("chunk", blob, `part-${i + 1}`);

      const partRes = await fetch(`${API}/upload/multipart/part`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const partData = (await readJson(partRes)) as { ok?: boolean; error?: string };
      if (!partRes.ok || !partData.ok) {
        throw new Error(partData.error ?? `Part ${i + 1} failed.`);
      }
      onProgress?.((i + 1) / (totalParts + 1), `Uploading… ${i + 1}/${totalParts}`);
    }

    onProgress?.(totalParts / (totalParts + 1), "Finalizing…");
    const doneRes = await fetch(`${API}/upload/multipart/complete`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: init.key,
        stagingPrefix: init.stagingPrefix,
        contentType: init.contentType || file.type || "application/octet-stream",
        totalParts,
      }),
    });
    const done = (await readJson(doneRes)) as { ok?: boolean; error?: string };
    if (!doneRes.ok || !done.ok) throw new Error(done.error ?? "Could not finalize upload.");
    onProgress?.(1, "Upload complete.");
    return init.key;
  } catch (err) {
    try {
      await fetch(`${API}/upload/multipart/complete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: init.key,
          stagingPrefix: init.stagingPrefix,
          totalParts,
          abort: true,
        }),
      });
    } catch {
      /* ignore abort errors */
    }
    throw err;
  }
}

export default function BackgroundVideosClient({
  initialVideos = [],
  initialError = "",
}: {
  initialVideos?: BgVideoRow[];
  initialError?: string;
}) {
  const [videos, setVideos] = useState<BgVideoRow[]>(initialVideos);
  const [error, setError] = useState(initialError);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState("");
  const [title, setTitle] = useState("");
  const [storageKey, setStorageKey] = useState("");
  const [webStorageKey, setWebStorageKey] = useState("");
  const [posterKey, setPosterKey] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [meta, setMeta] = useState<{
    width: number | null;
    height: number | null;
    durationSec: number | null;
    bytes: number | null;
  }>({ width: null, height: null, durationSec: null, bytes: null });
  const [makeLive, setMakeLive] = useState(true);
  const [makeWebEncode, setMakeWebEncode] = useState(true);
  const [r2Target, setR2Target] = useState<R2Target>(null);
  const [busy, setBusy] = useState(false);
  const [shareForId, setShareForId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(API, { credentials: "include" });
      const data = (await readJson(res)) as {
        ok?: boolean;
        videos?: BgVideoRow[];
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to load.");
      setVideos(data.videos ?? []);
    } catch (e) {
      setError(friendlyFetchError(e, "Failed to refresh library."));
    }
  }, []);

  async function handleMasterFile(file: File) {
    setBusy(true);
    setError("");
    setStatus("");
    setProgress("");
    try {
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""));
      const fileMeta = await readVideoFileMeta(file);
      setMeta({
        width: fileMeta.width,
        height: fileMeta.height,
        durationSec: fileMeta.durationSec,
        bytes: file.size,
      });

      const masterKey = await uploadFileChunked(file, "full", (ratio, label) => {
        setProgress(`${label} (${Math.round(ratio * 100)}%)`);
      });
      setStorageKey(masterKey);

      let webKey = "";
      if (makeWebEncode && isVideoFile(file)) {
        try {
          setProgress("Preparing web encode (≤1080p)…");
          const encoded = await encodeBackgroundWebMp4(file, (p) => setProgress(p.message));
          const webFile = new File([encoded.blob], encoded.fileName, { type: "video/mp4" });
          webKey = await uploadFileChunked(webFile, "web", (ratio, label) => {
            setProgress(`Web upload… ${label} (${Math.round(ratio * 100)}%)`);
          });
          setWebStorageKey(webKey);
        } catch (encodeErr) {
          setProgress("");
          setWebStorageKey("");
          // Master already on R2 — do not treat encode failure as a failed upload.
          setError(friendlyEncodeError(encodeErr));
          setStatus(
            "Master uploaded successfully. You can Add to library now (playback uses master until a web encode is set)."
          );
          return;
        }
      }

      setProgress("");
      setStatus(
        webKey
          ? "Master + web encode uploaded. Review fields and click Add to library."
          : "Master uploaded. Review fields and click Add to library."
      );
    } catch (e) {
      setProgress("");
      setError(friendlyFetchError(e, "Upload failed."));
    } finally {
      setBusy(false);
    }
  }

  async function createVideo() {
    if (!title.trim() || !storageKey.trim()) {
      setError("Title and video storage key are required.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch(API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          storageKey: storageKey.trim(),
          webStorageKey: webStorageKey.trim() || null,
          posterKey: posterKey.trim() || null,
          sortOrder,
          isActive: makeLive,
          width: meta.width,
          height: meta.height,
          bytes: meta.bytes,
          durationSec: meta.durationSec,
        }),
      });
      const data = (await readJson(res)) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Create failed.");
      setTitle("");
      setStorageKey("");
      setWebStorageKey("");
      setPosterKey("");
      setSortOrder(0);
      setMeta({ width: null, height: null, durationSec: null, bytes: null });
      setStatus("Video added to library.");
      await load();
    } catch (e) {
      setError(friendlyFetchError(e, "Create failed."));
    } finally {
      setBusy(false);
    }
  }

  async function patchVideo(id: string, body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch(`${API}/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await readJson(res)) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Update failed.");
      setStatus("Updated.");
      await load();
    } catch (e) {
      setError(friendlyFetchError(e, "Update failed."));
    } finally {
      setBusy(false);
    }
  }

  async function deleteVideo(id: string, videoTitle: string) {
    if (!window.confirm(`Delete “${videoTitle}”? This does not delete the R2 object.`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await readJson(res)) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Delete failed.");
      setStatus("Deleted.");
      await load();
    } catch (e) {
      setError(friendlyFetchError(e, "Delete failed."));
    } finally {
      setBusy(false);
    }
  }

  function mediaHref(key: string | null) {
    if (!key) return "";
    if (typeof window === "undefined") return getPublicR2Url(key);
    const origin = window.location.origin;
    const path = getPublicR2Url(key);
    return path.startsWith("http") ? path : `${origin}${path}`;
  }

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(`${label} copied.`);
    } catch {
      setError(`Could not copy ${label}.`);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 text-white">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Assets</p>
          <h1 className="mt-2 font-display text-3xl">Background videos</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Upload high-res masters — they are chunked to R2 (no 413). Optionally create a ≤1080p web
            encode for site playback, then share to YouTube and social from the library.
          </p>
        </div>
        <Link
          href="/admin/r2?prefix=site%2Fbackgrounds%2F"
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          Open in R2
        </Link>
      </div>

      {(error || status || progress) && (
        <p
          className={`mt-6 text-sm ${
            error ? "text-rose-300" : progress ? "text-sky-200/90" : "text-emerald-300/90"
          }`}
        >
          {error || progress || status}
        </p>
      )}

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Add video</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-xs uppercase tracking-[0.2em] text-white/55">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white"
              placeholder="Homepage cinematic"
            />
          </label>
          <label className="block text-xs uppercase tracking-[0.2em] text-white/55">
            Sort order
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white"
            />
          </label>
          <label className="block text-xs uppercase tracking-[0.2em] text-white/55 md:col-span-2">
            Master storage key (full)
            <input
              value={storageKey}
              onChange={(e) => setStorageKey(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs normal-case tracking-normal text-white"
              placeholder="site/backgrounds/full/…"
            />
            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="button"
                className="text-xs uppercase tracking-[0.2em] text-white/55 underline"
                onClick={() => setR2Target("storage")}
              >
                Choose from R2
              </button>
              <label className="cursor-pointer text-xs uppercase tracking-[0.2em] text-white/55 underline">
                Upload high-res
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mov,.m4v"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.currentTarget.value = "";
                    if (file) void handleMasterFile(file);
                  }}
                />
              </label>
            </div>
          </label>
          <label className="block text-xs uppercase tracking-[0.2em] text-white/55 md:col-span-2">
            Web encode key (site playback)
            <input
              value={webStorageKey}
              onChange={(e) => setWebStorageKey(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs normal-case tracking-normal text-white"
              placeholder="site/backgrounds/web/… (auto-filled when encode is on)"
            />
            <button
              type="button"
              className="mt-2 text-xs uppercase tracking-[0.2em] text-white/55 underline"
              onClick={() => setR2Target("web")}
            >
              Choose web encode from R2
            </button>
          </label>
          <label className="block text-xs uppercase tracking-[0.2em] text-white/55 md:col-span-2">
            Poster key (optional)
            <input
              value={posterKey}
              onChange={(e) => setPosterKey(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs normal-case tracking-normal text-white"
              placeholder="site/backgrounds/posters/…"
            />
            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="button"
                className="text-xs uppercase tracking-[0.2em] text-white/55 underline"
                onClick={() => setR2Target("poster")}
              >
                Choose from R2
              </button>
              <label className="cursor-pointer text-xs uppercase tracking-[0.2em] text-white/55 underline">
                Upload poster
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.currentTarget.value = "";
                    if (!file) return;
                    setBusy(true);
                    void uploadFileChunked(file, "posters", (ratio, label) =>
                      setProgress(`${label} (${Math.round(ratio * 100)}%)`)
                    )
                      .then((key) => {
                        setPosterKey(key);
                        setProgress("");
                        setStatus("Poster uploaded.");
                      })
                      .catch((err) => {
                        setProgress("");
                        setError(friendlyFetchError(err, "Upload failed."));
                      })
                      .finally(() => setBusy(false));
                  }}
                />
              </label>
            </div>
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <label className="flex items-center gap-3 text-sm text-white/70">
            <input
              type="checkbox"
              checked={makeWebEncode}
              onChange={(e) => setMakeWebEncode(e.target.checked)}
            />
            Create ≤1080p web encode for site playback
          </label>
          <label className="flex items-center gap-3 text-sm text-white/70">
            <input
              type="checkbox"
              checked={makeLive}
              onChange={(e) => setMakeLive(e.target.checked)}
            />
            Set as Live site-wide background after save
          </label>
        </div>
        {(meta.width || meta.bytes) && (
          <p className="mt-3 text-xs text-white/45">
            Master meta: {meta.width && meta.height ? `${meta.width}×${meta.height}` : "—"}
            {meta.durationSec != null ? ` · ${meta.durationSec}s` : ""}
            {meta.bytes != null ? ` · ${formatBytes(meta.bytes)}` : ""}
          </p>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void createVideo()}
          className="mt-5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white transition hover:bg-white/15 disabled:opacity-40"
        >
          {busy ? "Working…" : "Add to library"}
        </button>
      </section>

      <PageAssignmentsPanel
        videos={videos.map((v) => ({ id: v.id, title: v.title, enabled: v.enabled }))}
      />

      <section className="mt-10">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Library</p>
        {videos.length === 0 ? (
          <p className="mt-4 text-sm text-white/50">No background videos yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {videos.map((video) => {
              const poster = thumbUrl(video.posterKey);
              const playKey = video.webStorageKey || video.storageKey;
              const playUrl = mediaHref(playKey);
              const masterUrl = mediaHref(video.storageKey);
              const openShare = shareForId === video.id;
              return (
                <li
                  key={video.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                      {poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={poster} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[0.6rem] uppercase tracking-widest text-white/35">
                          No poster
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">{video.title}</p>
                        {video.isActive ? (
                          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-emerald-200">
                            Live
                          </span>
                        ) : null}
                        {video.webStorageKey ? (
                          <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-sky-100">
                            Web encode
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-white/45">{video.storageKey}</p>
                      <p className="mt-1 text-xs text-white/40">
                        {formatBytes(video.bytes)}
                        {video.durationSec != null ? ` · ${video.durationSec}s` : ""}
                        {video.width && video.height ? ` · ${video.width}×${video.height}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!video.isActive ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void patchVideo(video.id, { isActive: true })}
                          className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.14em] text-emerald-100"
                        >
                          Set Live
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void patchVideo(video.id, { isActive: false })}
                          className="rounded-lg border border-white/15 px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.14em] text-white/70"
                        >
                          Clear Live
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShareForId(openShare ? null : video.id)}
                        className="rounded-lg border border-violet-400/25 bg-violet-400/10 px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.14em] text-violet-100"
                      >
                        Share / export
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void patchVideo(video.id, { enabled: !video.enabled })}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.14em] text-white/70"
                      >
                        {video.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void deleteVideo(video.id, video.title)}
                        className="rounded-lg border border-rose-400/25 px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.14em] text-rose-200/90"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {openShare ? (
                    <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                        Share & platform exports
                      </p>
                      <p className="mt-2 text-xs text-white/55">
                        Site playback uses the web encode when present. Use the master for archival /
                        YouTube high quality.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-white/15 px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.14em] text-white/75"
                          onClick={() => void copyText("Playback URL", playUrl)}
                        >
                          Copy playback URL
                        </button>
                        <a
                          href={playUrl} {...externalLinkProps(playUrl)}
                          className="rounded-lg border border-white/15 px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.14em] text-white/75"
                        >
                          Open web file
                        </a>
                        <a
                          href={masterUrl} {...externalLinkProps(masterUrl)}
                          className="rounded-lg border border-white/15 px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.14em] text-white/75"
                        >
                          Open master
                        </a>
                        <a
                          href={youtubeStudioUploadUrl()} {...externalLinkProps(youtubeStudioUploadUrl())}
                          className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.14em] text-rose-100"
                        >
                          YouTube Studio
                        </a>
                        <a
                          href={linkedInShareUrl(
                            typeof window !== "undefined" ? window.location.origin + "/" : playUrl
                          )} {...externalLinkProps(linkedInShareUrl(
                            typeof window !== "undefined" ? window.location.origin + "/" : playUrl
                          ))}
                          className="rounded-lg border border-sky-400/25 bg-sky-400/10 px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.14em] text-sky-100"
                        >
                          LinkedIn
                        </a>
                        <a
                          href={xShareUrl(
                            typeof window !== "undefined" ? window.location.origin + "/" : playUrl,
                            video.title
                          )} {...externalLinkProps(xShareUrl(
                            typeof window !== "undefined" ? window.location.origin + "/" : playUrl,
                            video.title
                          ))}
                          className="rounded-lg border border-white/15 px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.14em] text-white/75"
                        >
                          Share on X
                        </a>
                      </div>
                      <ul className="mt-4 space-y-2">
                        {BACKGROUND_SHARE_PLATFORMS.map((p) => (
                          <li
                            key={p.id}
                            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/60"
                          >
                            <span className="font-medium text-white/85">{p.label}</span>
                            <span className="text-white/40">
                              {" "}
                              · {p.aspect} · {p.width}×{p.height}
                            </span>
                            <p className="mt-1 text-white/45">{p.notes}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <R2BrowserModal
        isOpen={r2Target != null}
        onClose={() => setR2Target(null)}
        mode="single"
        initialCustomPrefix="site/backgrounds/"
        onAddKeys={async (keys) => {
          const key = keys[0];
          if (!key) return;
          if (r2Target === "storage") setStorageKey(key);
          if (r2Target === "poster") setPosterKey(key);
          if (r2Target === "web") setWebStorageKey(key);
          setR2Target(null);
        }}
      />
    </div>
  );
}
