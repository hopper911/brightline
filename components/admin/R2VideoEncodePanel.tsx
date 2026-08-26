"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { encodeVideoPortWebMp4 } from "@/lib/video-port/encode-web-mp4";
import {
  parseT9WebVideoPrefix,
} from "@/lib/video-port/parse-prefix";
import {
  filesFromDataTransfer,
  partitionVideoDrop,
} from "@/lib/video-port/pick-files";
import {
  defaultSegmentForRoot,
  segmentsForRoot,
} from "@/lib/t9-media-segments";
import type { T9MediaRoot } from "@/lib/t9-media-root";

const ROOT_OPTIONS: { id: T9MediaRoot; label: string }[] = [
  { id: "portfolio", label: "Brightline portfolio" },
  { id: "mirotech", label: "Mirotech" },
];

const ACCEPT =
  "video/*,.mp4,.webm,.mov,.m4v,.mkv,.avi,.mpeg,.mpg,.3gp,.mts,.m2ts,video/quicktime";

type QueueStatus =
  | "queued"
  | "encoding"
  | "uploading"
  | "poster"
  | "done"
  | "error";

type QueueItem = {
  id: string;
  file: File;
  status: QueueStatus;
  error?: string;
  progress?: string;
  videoKey?: string;
  posterKey?: string;
  previewUrl?: string;
};

type ResultItem = {
  id: string;
  fileName: string;
  videoKey: string;
  posterKey?: string;
  previewUrl: string;
  posterPreviewUrl?: string;
};

function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, credentials: "include" });
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function errorFrom(data: Record<string, unknown>, fallback: string): string {
  return typeof data.error === "string" && data.error.trim() ? data.error : fallback;
}

async function uploadEncodedVideo(
  videoBlob: Blob,
  segment: string,
  root: T9MediaRoot,
  withPoster: boolean
): Promise<{
  videoKey: string;
  posterKey: string | null;
  stagingPrefix: string;
  partSize: number;
}> {
  const initRes = await adminFetch("/api/admin/video-port/multipart/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pillar: segment,
      root,
      bytes: videoBlob.size,
      withPoster,
    }),
  });
  const init = await readJson(initRes);
  if (
    !initRes.ok ||
    init.ok !== true ||
    typeof init.videoKey !== "string" ||
    typeof init.stagingPrefix !== "string"
  ) {
    throw new Error(errorFrom(init, "Could not start upload."));
  }

  const videoKey = init.videoKey;
  const stagingPrefix = init.stagingPrefix;
  const posterKey = typeof init.posterKey === "string" ? init.posterKey : null;
  const partSize =
    typeof init.partSize === "number" && init.partSize > 0 ? init.partSize : 3 * 1024 * 1024;
  const totalParts = Math.max(1, Math.ceil(videoBlob.size / partSize));

  try {
    for (let i = 0; i < totalParts; i++) {
      const chunk = videoBlob.slice(i * partSize, Math.min(videoBlob.size, (i + 1) * partSize));
      const form = new FormData();
      form.set("stagingPrefix", stagingPrefix);
      form.set("partNumber", String(i + 1));
      form.set("chunk", chunk, `part-${i + 1}`);
      const partRes = await adminFetch("/api/admin/video-port/multipart/part", {
        method: "POST",
        body: form,
      });
      const partData = await readJson(partRes);
      if (!partRes.ok || partData.ok !== true) {
        throw new Error(errorFrom(partData, `Chunk ${i + 1} failed.`));
      }
    }

    const doneRes = await adminFetch("/api/admin/video-port/multipart/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoKey,
        stagingPrefix,
        contentType: "video/mp4",
        totalParts,
      }),
    });
    const done = await readJson(doneRes);
    if (!doneRes.ok || done.ok !== true) {
      throw new Error(errorFrom(done, "Could not assemble upload."));
    }
  } catch (err) {
    await adminFetch("/api/admin/video-port/multipart/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoKey,
        stagingPrefix,
        totalParts,
        abort: true,
      }),
    }).catch(() => undefined);
    throw err;
  }

  return { videoKey, posterKey, stagingPrefix, partSize };
}

async function uploadPoster(posterBlob: Blob, posterKey: string): Promise<string> {
  const key =
    posterBlob.type === "image/png" && posterKey.endsWith(".webp")
      ? posterKey.replace(/\.webp$/i, ".png")
      : posterKey;
  const form = new FormData();
  form.set("posterKey", key);
  form.set(
    "file",
    posterBlob,
    key.endsWith(".png") ? "poster.png" : "poster.webp"
  );
  const res = await adminFetch("/api/admin/video-port/poster", {
    method: "POST",
    body: form,
  });
  const data = await readJson(res);
  if (!res.ok || data.ok !== true || typeof data.posterKey !== "string") {
    throw new Error(errorFrom(data, "Poster upload failed."));
  }
  return data.posterKey;
}

export type R2VideoEncodePanelProps = {
  /** Current R2 folder prefix — auto-fills pillar/root when under web_video */
  prefix?: string;
  defaultOpen?: boolean;
  /** Hide page header when embedded in R2 hub */
  embedded?: boolean;
  /** Skip inner collapse chrome — parent controls visibility */
  inline?: boolean;
  onEncoded?: (videoKey: string) => void;
};

export default function R2VideoEncodePanel({
  prefix = "",
  defaultOpen = false,
  embedded = false,
  inline = false,
  onEncoded,
}: R2VideoEncodePanelProps) {
  const parsed = parseT9WebVideoPrefix(prefix);
  const [open, setOpen] = useState(defaultOpen || (embedded && !inline));
  const [segment, setSegment] = useState(parsed?.segment ?? defaultSegmentForRoot("portfolio"));
  const [mediaRoot, setMediaRoot] = useState<T9MediaRoot>(parsed?.root ?? "portfolio");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [encoderHint, setEncoderHint] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const running = useRef(false);
  const pillarRef = useRef(segment);
  const mediaRootRef = useRef(mediaRoot);
  const autoStartRef = useRef(false);

  queueRef.current = queue;
  pillarRef.current = segment;
  mediaRootRef.current = mediaRoot;

  const segmentOptions = useMemo(() => segmentsForRoot(mediaRoot), [mediaRoot]);

  useEffect(() => {
    const ctx = parseT9WebVideoPrefix(prefix);
    if (ctx) {
      setSegment(ctx.segment);
      setMediaRoot(ctx.root);
    }
  }, [prefix]);

  useEffect(() => {
    setSegment(defaultSegmentForRoot(mediaRoot));
  }, [mediaRoot]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setEncoderHint("Preparing encoder…");
        const { loadFfmpegBrowser } = await import("@/lib/ffmpeg-load");
        const ffmpeg = await loadFfmpegBrowser();
        try {
          ffmpeg.terminate();
        } catch {
          /* ignore */
        }
        if (!cancelled) setEncoderHint("Encoder ready.");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Encoder preload failed.";
        if (!cancelled) setEncoderHint(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patchItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }, []);

  const processOne = useCallback(
    async (item: QueueItem, activeSegment: string, activeRoot: T9MediaRoot) => {
      patchItem(item.id, {
        status: "encoding",
        error: undefined,
        progress: "Loading encoder…",
      });

      const encoded = await encodeVideoPortWebMp4(item.file, (p) => {
        patchItem(item.id, {
          status: p.phase === "poster" ? "poster" : "encoding",
          progress: p.message,
        });
      });

      patchItem(item.id, { status: "uploading", progress: "Uploading web MP4…" });
      const uploaded = await uploadEncodedVideo(
        encoded.videoBlob,
        activeSegment,
        activeRoot,
        Boolean(encoded.posterBlob)
      );

      let posterKey: string | undefined;
      if (encoded.posterBlob && uploaded.posterKey) {
        patchItem(item.id, { status: "poster", progress: "Uploading poster…" });
        posterKey = await uploadPoster(encoded.posterBlob, uploaded.posterKey);
      }

      const previewUrl = `/api/media/public?key=${encodeURIComponent(uploaded.videoKey)}`;
      const posterPreviewUrl = posterKey
        ? `/api/media/public?key=${encodeURIComponent(posterKey)}`
        : undefined;

      patchItem(item.id, {
        status: "done",
        videoKey: uploaded.videoKey,
        posterKey,
        previewUrl,
        progress: undefined,
      });
      setResults((prev) => [
        {
          id: item.id,
          fileName: item.file.name,
          videoKey: uploaded.videoKey,
          posterKey,
          previewUrl,
          posterPreviewUrl,
        },
        ...prev,
      ]);
      onEncoded?.(uploaded.videoKey);
    },
    [onEncoded, patchItem]
  );

  const runQueue = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    const activeSegment = pillarRef.current;
    const activeRoot = mediaRootRef.current;
    try {
      for (;;) {
        const pending = queueRef.current.filter((q) => q.status === "queued");
        if (!pending.length) break;
        for (const item of pending) {
          if (queueRef.current.find((q) => q.id === item.id)?.status !== "queued") continue;
          try {
            await processOne(item, activeSegment, activeRoot);
          } catch (err) {
            patchItem(item.id, {
              status: "error",
              error: err instanceof Error ? err.message : "Upload failed.",
              progress: undefined,
            });
          }
        }
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [patchItem, processOne]);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) {
      setNotice("No files received. Try Choose file again.");
      return;
    }

    const { videos, skippedReasons, ignoredStills } = await partitionVideoDrop(list);
    const notices: string[] = [];
    if (skippedReasons.length) {
      notices.push(
        skippedReasons.slice(0, 2).join(" ") +
          (skippedReasons.length > 2 ? ` (+${skippedReasons.length - 2} more)` : "")
      );
    }
    if (ignoredStills > 0 && videos.length) {
      notices.push(
        `Ignored ${ignoredStills} still image${ignoredStills === 1 ? "" : "s"} (Live Photo companions).`
      );
    }
    setNotice(notices.length ? notices.join(" ") : null);

    if (!videos.length) return;

    const next: QueueItem[] = videos.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      status: "queued" as const,
    }));

    setQueue((prev) => {
      const merged = [...prev, ...next];
      queueRef.current = merged;
      return merged;
    });
    autoStartRef.current = true;
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!autoStartRef.current) return;
    if (!queue.some((q) => q.status === "queued")) return;
    autoStartRef.current = false;
    void runQueue();
  }, [queue, runQueue]);

  async function retryFailed() {
    const next = queueRef.current.map((q) =>
      q.status === "error" ? { ...q, status: "queued" as const, error: undefined } : q
    );
    queueRef.current = next;
    setQueue(next);
    autoStartRef.current = true;
  }

  const pendingCount = queue.filter((q) => q.status === "queued").length;
  const errorCount = queue.filter((q) => q.status === "error").length;
  const showContextSelectors = !parseT9WebVideoPrefix(prefix);

  const panelBody = (
    <section className={embedded ? "space-y-4" : "mb-6 space-y-4"}>
      {showContextSelectors ? (
        <>
          <label className="block text-sm text-white/70">
            Destination
            <select
              className="mt-2 w-full max-w-xs rounded border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-white/40"
              value={mediaRoot}
              disabled={busy}
              onChange={(e) => {
              const next = e.target.value as T9MediaRoot;
              setMediaRoot(next);
              setSegment(defaultSegmentForRoot(next));
            }}
            >
              {ROOT_OPTIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-white/70">
            {mediaRoot === "mirotech" ? "Work category" : "Portfolio pillar"}
            <select
              className="mt-2 w-full max-w-xs rounded border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-white/40"
              value={segment}
              disabled={busy}
              onChange={(e) => setSegment(e.target.value)}
            >
              {segmentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <p className="text-xs text-white/50">
          Destination:{" "}
          <code className="text-white/75">
            {mediaRoot}/{segment}/web_video/
          </code>
        </p>
      )}

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          void (async () => {
            const files = await filesFromDataTransfer(e.dataTransfer);
            if (files.length) await addFiles(files);
            else setNotice("Drop did not include files. Try Choose file.");
          })();
        }}
        className={`cursor-pointer rounded border border-dashed px-4 py-10 text-center transition-colors ${
          dragOver
            ? "border-white/50 bg-white/10"
            : "border-white/20 bg-white/[0.03] hover:border-white/35"
        }`}
      >
        <p className="text-sm text-white/80">Drop videos here or tap to choose</p>
        <p className="mt-2 text-xs text-white/45">
          MP4, WebM, MOV · multi-file OK · encodes to 1080p H.264 automatically
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {notice ? (
        <p className="rounded border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100/90">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || pendingCount === 0}
          onClick={() => void runQueue()}
          className="rounded border border-white/25 bg-white/10 px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          {busy ? "Working…" : pendingCount ? `Encode & upload ${pendingCount}` : "Encode & upload"}
        </button>
        {errorCount > 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void retryFailed()}
            className="rounded border border-white/15 px-4 py-2 text-sm text-white/80 disabled:opacity-40"
          >
            Retry failed ({errorCount})
          </button>
        ) : null}
        {queue.length > 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setQueue([]);
              queueRef.current = [];
              setNotice(null);
            }}
            className="rounded border border-transparent px-4 py-2 text-sm text-white/50 hover:text-white/80 disabled:opacity-40"
          >
            Clear queue
          </button>
        ) : null}
      </div>

      {queue.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs uppercase tracking-[0.16em] text-white/45">Queue</h3>
          <ul className="divide-y divide-white/10 rounded border border-white/10">
            {queue.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2.5 text-sm"
              >
                <span className="truncate text-white/85">{item.file.name}</span>
                <span
                  className={
                    item.status === "error"
                      ? "text-red-300/90"
                      : item.status === "done"
                        ? "text-emerald-300/90"
                        : "text-white/50"
                  }
                >
                  {item.status === "error"
                    ? item.error || "error"
                    : item.progress || item.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {results.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs uppercase tracking-[0.16em] text-white/45">
            Stored web video ({results.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {results.map((r) => (
              <figure
                key={r.id}
                className="overflow-hidden rounded border border-white/10 bg-black/30"
              >
                <video
                  src={r.previewUrl}
                  poster={r.posterPreviewUrl}
                  muted
                  playsInline
                  controls
                  preload="metadata"
                  className="aspect-video w-full bg-black object-cover"
                />
                <figcaption className="space-y-1 p-2 text-[10px] leading-snug text-white/50">
                  <p className="truncate text-white/70">{r.fileName}</p>
                  <p className="break-all text-white/80">{r.videoKey}</p>
                  {r.posterKey ? <p className="break-all opacity-60">{r.posterKey}</p> : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );

  if (inline) {
    return (
      <div className="mt-4 rounded-xl border border-white/10 bg-black/30 px-4 pb-4 pt-3">
        {encoderHint ? (
          <p className="mb-3 text-xs text-white/50" role="status">
            {encoderHint}
          </p>
        ) : null}
        {panelBody}
      </div>
    );
  }

  if (embedded) {
    return (
      <div className="mt-4 rounded-xl border border-white/10 bg-black/30">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-white/80"
          onClick={() => setOpen((v) => !v)}
        >
          <span>Encode video (1080p H.264 → web_video/)</span>
          <span className="text-white/40">{open ? "−" : "+"}</span>
        </button>
        {open ? (
          <div className="border-t border-white/10 px-4 pb-4 pt-2">
            {encoderHint ? (
              <p className="mb-3 text-xs text-white/50" role="status">
                {encoderHint}
              </p>
            ) : null}
            {panelBody}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-white sm:px-6">
      <header className="mb-8 border-b border-white/10 pb-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Assets</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">Video Port</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
          Drop clips here for case studies and Studio Hub. Encoding happens in your browser to
          efficient 1080p H.264 — the original is never uploaded or stored. Output lands at{" "}
          <code className="text-white/80">
            {"{portfolio}/{arc|cam|cor}"} or {"{mirotech}/{product|editorial|…}/web_video/"}
          </code>
          .
        </p>
        {encoderHint ? (
          <p className="mt-2 text-xs text-white/50" role="status">
            {encoderHint}
          </p>
        ) : null}
      </header>
      {panelBody}
    </div>
  );
}
