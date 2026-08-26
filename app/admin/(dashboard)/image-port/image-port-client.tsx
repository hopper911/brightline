"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  defaultSegmentForRoot,
  segmentsForRoot,
} from "@/lib/t9-media-segments";
import type { T9MediaRoot } from "@/lib/t9-media-root";

const ROOT_OPTIONS: { id: T9MediaRoot; label: string }[] = [
  { id: "portfolio", label: "Brightline portfolio" },
  { id: "mirotech", label: "Mirotech" },
];

const ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const SINGLE_PUT_MAX = 3.5 * 1024 * 1024;

type QueueStatus = "queued" | "uploading" | "finalizing" | "done" | "error";

type QueueItem = {
  id: string;
  file: File;
  status: QueueStatus;
  error?: string;
  fullKey?: string;
  thumbKey?: string;
  previewUrl?: string;
};

type ResultItem = {
  id: string;
  fileName: string;
  fullKey: string;
  thumbKey: string;
  previewUrl: string;
};

type StoredResult = {
  fullKey: string;
  thumbKey: string;
  previewUrl: string;
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

function guessContentType(file: File): string {
  if (file.type) return file.type;
  if (/\.png$/i.test(file.name)) return "image/png";
  if (/\.webp$/i.test(file.name)) return "image/webp";
  return "image/jpeg";
}

function errorFrom(data: Record<string, unknown>, fallback: string): string {
  return typeof data.error === "string" && data.error.trim() ? data.error : fallback;
}

async function ingestSingle(
  file: File,
  segment: string,
  root: T9MediaRoot
): Promise<StoredResult> {
  const form = new FormData();
  form.set("file", file);
  form.set("pillar", segment);
  form.set("root", root);
  const res = await adminFetch("/api/admin/image-port/ingest", {
    method: "POST",
    body: form,
  });
  const data = await readJson(res);
  if (
    !res.ok ||
    data.ok !== true ||
    typeof data.fullKey !== "string" ||
    typeof data.thumbKey !== "string" ||
    typeof data.previewUrl !== "string"
  ) {
    throw new Error(errorFrom(data, `Ingest failed (${res.status}).`));
  }
  return {
    fullKey: data.fullKey,
    thumbKey: data.thumbKey,
    previewUrl: data.previewUrl,
  };
}

async function ingestChunked(
  file: File,
  segment: string,
  root: T9MediaRoot,
  onStatus: (status: QueueStatus) => void
): Promise<StoredResult> {
  const contentType = guessContentType(file);
  const initRes = await adminFetch("/api/admin/image-port/multipart/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType,
      pillar: segment,
      root,
      bytes: file.size,
    }),
  });
  const init = await readJson(initRes);
  if (
    !initRes.ok ||
    init.ok !== true ||
    typeof init.tempKey !== "string" ||
    typeof init.stagingPrefix !== "string"
  ) {
    throw new Error(errorFrom(init, "Could not start upload."));
  }

  const tempKey = init.tempKey;
  const stagingPrefix = init.stagingPrefix;
  const partSize =
    typeof init.partSize === "number" && init.partSize > 0 ? init.partSize : 3 * 1024 * 1024;
  const totalParts = Math.max(1, Math.ceil(file.size / partSize));

  try {
    for (let i = 0; i < totalParts; i++) {
      const blob = file.slice(i * partSize, Math.min(file.size, (i + 1) * partSize));
      const form = new FormData();
      form.set("stagingPrefix", stagingPrefix);
      form.set("partNumber", String(i + 1));
      form.set("chunk", blob, `part-${i + 1}`);
      const partRes = await adminFetch("/api/admin/image-port/multipart/part", {
        method: "POST",
        body: form,
      });
      const partData = await readJson(partRes);
      if (!partRes.ok || partData.ok !== true) {
        throw new Error(errorFrom(partData, `Chunk ${i + 1} failed.`));
      }
    }

    const doneRes = await adminFetch("/api/admin/image-port/multipart/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tempKey,
        stagingPrefix,
        contentType,
        totalParts,
      }),
    });
    const done = await readJson(doneRes);
    if (!doneRes.ok || done.ok !== true) {
      throw new Error(errorFrom(done, "Could not assemble upload."));
    }
  } catch (err) {
    await adminFetch("/api/admin/image-port/multipart/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tempKey,
        stagingPrefix,
        totalParts,
        abort: true,
      }),
    }).catch(() => undefined);
    throw err;
  }

  onStatus("finalizing");
  const finRes = await adminFetch("/api/admin/image-port/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tempKey, pillar: segment, root }),
  });
  const fin = await readJson(finRes);
  if (
    !finRes.ok ||
    fin.ok !== true ||
    typeof fin.fullKey !== "string" ||
    typeof fin.thumbKey !== "string" ||
    typeof fin.previewUrl !== "string"
  ) {
    throw new Error(errorFrom(fin, "Finalize failed."));
  }
  return {
    fullKey: fin.fullKey,
    thumbKey: fin.thumbKey,
    previewUrl: fin.previewUrl,
  };
}

export default function ImagePortClient() {
  const [segment, setSegment] = useState(defaultSegmentForRoot("portfolio"));
  const [mediaRoot, setMediaRoot] = useState<T9MediaRoot>("portfolio");
  const segmentOptions = useMemo(() => segmentsForRoot(mediaRoot), [mediaRoot]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const running = useRef(false);

  queueRef.current = queue;

  const patchItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const next: QueueItem[] = [];
    for (const file of Array.from(files)) {
      const type = (file.type || "").toLowerCase();
      const ok =
        type === "image/jpeg" ||
        type === "image/jpg" ||
        type === "image/png" ||
        type === "image/webp" ||
        /\.(jpe?g|png|webp)$/i.test(file.name);
      if (!ok) continue;
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        status: "queued",
      });
    }
    if (next.length) setQueue((prev) => [...prev, ...next]);
  }, []);

  async function processOne(
    item: QueueItem,
    activeSegment: string,
    activeRoot: T9MediaRoot
  ) {
    patchItem(item.id, { status: "uploading", error: undefined });
    const stored =
      item.file.size <= SINGLE_PUT_MAX
        ? await ingestSingle(item.file, activeSegment, activeRoot)
        : await ingestChunked(item.file, activeSegment, activeRoot, (status) =>
            patchItem(item.id, { status })
          );

    patchItem(item.id, {
      status: "done",
      fullKey: stored.fullKey,
      thumbKey: stored.thumbKey,
      previewUrl: stored.previewUrl,
    });
    setResults((prev) => [
      {
        id: item.id,
        fileName: item.file.name,
        fullKey: stored.fullKey,
        thumbKey: stored.thumbKey,
        previewUrl: stored.previewUrl,
      },
      ...prev,
    ]);
  }

  async function runQueue() {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    const activeSegment = segment;
    const activeRoot = mediaRoot;
    try {
      const pending = queueRef.current.filter((q) => q.status === "queued");
      for (const item of pending) {
        try {
          await processOne(item, activeSegment, activeRoot);
        } catch (err) {
          patchItem(item.id, {
            status: "error",
            error: err instanceof Error ? err.message : "Upload failed.",
          });
        }
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  async function retryFailed() {
    const next = queueRef.current.map((q) =>
      q.status === "error" ? { ...q, status: "queued" as const, error: undefined } : q
    );
    queueRef.current = next;
    setQueue(next);
    await runQueue();
  }

  const pendingCount = queue.filter((q) => q.status === "queued").length;
  const errorCount = queue.filter((q) => q.status === "error").length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-white sm:px-6">
      <header className="mb-8 border-b border-white/10 pb-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Assets</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">Image Port</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
          Upload from any device when Lightroom/T9 is unavailable. JPEG is converted; only WebP is
          stored. Same paths as Lightroom T9 exports (
          <code className="text-white/80">
            {"{portfolio}/{arc|cam|cor}"} or {"{mirotech}/{product|editorial|…}/web_full|web_thumb/"}
          </code>
          ).
        </p>
        <p className="mt-2 text-xs text-white/40">
          HEIC / Live Photos: convert to JPEG on the device first (not supported in this version).
        </p>
      </header>

      <section className="mb-6 space-y-4">
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

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
          }}
          className={`cursor-pointer rounded border border-dashed px-4 py-12 text-center transition-colors ${
            dragOver
              ? "border-white/50 bg-white/10"
              : "border-white/20 bg-white/[0.03] hover:border-white/35"
          }`}
        >
          <p className="text-sm text-white/80">Drop images here or tap to choose</p>
          <p className="mt-2 text-xs text-white/45">JPEG, PNG, or WebP · multi-file OK</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || pendingCount === 0}
            onClick={() => void runQueue()}
            className="rounded border border-white/25 bg-white/10 px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            {busy ? "Uploading…" : pendingCount ? `Upload ${pendingCount}` : "Upload"}
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
              onClick={() => setQueue([])}
              className="rounded border border-transparent px-4 py-2 text-sm text-white/50 hover:text-white/80 disabled:opacity-40"
            >
              Clear queue
            </button>
          ) : null}
        </div>
      </section>

      {queue.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-3 text-xs uppercase tracking-[0.16em] text-white/45">Queue</h2>
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
                  {item.status === "error" ? item.error || "error" : item.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {results.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xs uppercase tracking-[0.16em] text-white/45">
            Stored WebP ({results.length})
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {results.map((r) => (
              <figure
                key={r.id}
                className="overflow-hidden rounded border border-white/10 bg-black/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.previewUrl}
                  alt={r.fileName}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
                <figcaption className="space-y-1 p-2 text-[10px] leading-snug text-white/50">
                  <p className="truncate text-white/70">{r.fileName}</p>
                  <p className="break-all text-white/80" title="Copy this key into Studio Hub / CMS">
                    {r.fullKey}
                  </p>
                  <p className="break-all opacity-60">{r.thumbKey}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
