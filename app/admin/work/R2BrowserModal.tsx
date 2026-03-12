"use client";

import { useEffect, useState } from "react";
import { PILLAR_SLUGS, PILLARS } from "@/lib/portfolioPillars";

const R2_BASE =
  typeof process.env.NEXT_PUBLIC_R2_PUBLIC_URL === "string"
    ? process.env.NEXT_PUBLIC_R2_PUBLIC_URL.replace(/\/+$/, "")
    : "";

function getImageUrl(key: string): string {
  if (!key || !R2_BASE) return "";
  return `${R2_BASE}/${key.replace(/^\//, "")}`;
}

const MEDIA_EXT = /\.(jpg|jpeg|png|webp|gif|mp4|webm)$/i;
const VIDEO_EXT = /\.(mp4|webm)$/i;

/** Maps portfolio pillar slugs to the 3-letter R2 folder names */
const PILLAR_TO_R2_FOLDER: Record<string, string> = {
  architecture: "arc",
  campaign: "cam",
  corporate: "cor",
};

function isVideoKey(key: string): boolean {
  return VIDEO_EXT.test(key);
}

type R2BrowserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAddKeys: (keys: string[]) => Promise<void>;
  /** When "single", only one selection is used; button says "Use as hero" */
  mode?: "multiple" | "single";
  /** When provided, enables "This project" source to browse R2 */
  projectId?: string;
  pillarSlug?: string;
  /** When provided with projectId, uses portfolio/{pillarSlug}/{projectSlug}/ for "This project" */
  projectSlug?: string;
};

export default function R2BrowserModal({
  isOpen,
  onClose,
  onAddKeys,
  mode = "multiple",
  projectId,
  pillarSlug = "architecture",
  projectSlug,
}: R2BrowserModalProps) {
  const [pillar, setPillar] = useState<string>(pillarSlug);
  const [source, setSource] = useState<"portfolio" | "project" | "custom">(
    projectId ? "portfolio" : "portfolio"
  );
  const [customPrefix, setCustomPrefix] = useState("");
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setErrorDetails] = useState<{
    timestamp: string;
    status: number;
    error: string;
    code?: string;
    details?: Record<string, unknown>;
  } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [lastFailureDetails, setLastFailureDetails] = useState<{
    error: string;
    timestamp: string;
    prefix: string;
    environment: string;
    status?: number;
    code?: string;
    details?: Record<string, unknown>;
  } | null>(null);

  const r2Folder = PILLAR_TO_R2_FOLDER[pillar] ?? pillar;

  const effectivePrefix =
    source === "portfolio"
      ? pillar === "all"
        ? "portfolio"
        : `portfolio/${r2Folder}`
      : source === "project" && projectId
        ? projectSlug
          ? `portfolio/${pillarSlug}/${projectSlug}`
          : `work/${pillarSlug}/${projectId}`
        : customPrefix.trim();

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setErrorDetails(null);
    setKeys([]);
    setSelected(new Set());
    setLastFailureDetails(null);
    if (source === "custom" && !customPrefix.trim()) return;
    async function load() {
      setLoading(true);
      const prefix = effectivePrefix.endsWith("/") ? effectivePrefix : `${effectivePrefix}/`;
      const env =
        typeof window !== "undefined" && window.location?.hostname === "localhost"
          ? "local"
          : "deployed";
      const timestamp = new Date().toISOString();
      try {
        const verifyRes = await fetch("/api/admin/r2-verify");
        const verifyData = (await verifyRes.json().catch(() => ({}))) as {
          ok?: boolean;
          connected?: boolean;
          error?: string;
          hint?: string;
        };
        if (!verifyRes.ok) {
          const msg = [verifyData.error, verifyData.hint].filter(Boolean).join(" ");
          setError(msg || "R2 storage not configured.");
          setKeys([]);
          setLoading(false);
          return;
        }
        const res = await fetch("/api/admin/r2-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prefix }),
        });
        let data: {
          ok?: boolean;
          keys?: string[];
          error?: string;
          code?: string;
          details?: Record<string, unknown>;
        };
        try {
          data = (await res.json()) as typeof data;
        } catch {
          data = { error: "Invalid response from server." };
        }
        if (!res.ok) {
          const errorMessage = data.error ?? "Failed to list";
          const detailsPayload = {
            timestamp,
            status: res.status,
            error: errorMessage,
            ...(data.code && { code: data.code }),
            ...(data.details && Object.keys(data.details).length > 0 && { details: data.details }),
          };
          setErrorDetails(detailsPayload);
          setLastFailureDetails({
            error: errorMessage,
            timestamp,
            prefix,
            environment: env,
            status: res.status,
            ...(data.code && { code: data.code }),
            ...(data.details && { details: data.details }),
          });
          setError(errorMessage);
          setKeys([]);
          return;
        }
        const raw = data.keys ?? [];
        const mediaKeys = raw.filter((k) => MEDIA_EXT.test(k));
        setKeys(mediaKeys);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load";
        setErrorDetails({
          timestamp,
          status: 0,
          error: message,
          details: { exception: e instanceof Error ? e.name : String(e) },
        });
        setLastFailureDetails({
          error: message,
          timestamp,
          prefix,
          environment: env,
          status: 0,
          details: { exception: e instanceof Error ? e.name : String(e) },
        });
        setError(message);
        setKeys([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [isOpen, pillar, source, customPrefix, effectivePrefix, pillarSlug, projectId]);

  function toggleSelection(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (mode === "single") {
        if (next.has(key)) next.clear();
        else return new Set([key]);
      }
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === keys.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(keys));
    }
  }

  async function handleAddSelected() {
    const toAdd = Array.from(selected);
    if (toAdd.length === 0) return;
    const keysToUse = mode === "single" ? (toAdd.slice(0, 1)) : toAdd;
    setAdding(true);
    setError("");
    try {
      await onAddKeys(keysToUse);
      setSelected(new Set());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="r2-browser-title"
    >
      <div className="flex h-[90vh] max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0b0e12] shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 id="r2-browser-title" className="font-display text-lg text-white">
            Browse R2
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-b border-white/10 px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            {projectId ? (
              <>
                <span className="text-xs text-white/50">Source:</span>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as "portfolio" | "project" | "custom")}
                  className="rounded border border-white/20 bg-black/40 px-2 py-1.5 text-sm text-white"
                >
                  <option value="portfolio">Portfolio (T9 uploads)</option>
                  <option value="project">This project</option>
                  <option value="custom">Custom prefix</option>
                </select>
              </>
            ) : (
              <span className="text-xs text-white/50">Portfolio</span>
            )}
            {source === "portfolio" && (
              <select
                value={pillar}
                onChange={(e) => setPillar(e.target.value)}
                className="rounded border border-white/20 bg-black/40 px-2 py-1.5 text-sm text-white"
              >
                <option value="all">All portfolio</option>
                {PILLAR_SLUGS.map((slug) => (
                  <option key={slug} value={slug}>
                    {PILLARS.find((p) => p.slug === slug)?.label ?? slug}
                  </option>
                ))}
              </select>
            )}
            {source === "custom" && (
              <input
                type="text"
                value={customPrefix}
                onChange={(e) => setCustomPrefix(e.target.value)}
                placeholder="portfolio/arc/web_full"
                className="min-w-[200px] rounded border border-white/20 bg-black/40 px-2 py-1.5 text-sm font-mono text-white placeholder:text-white/40"
              />
            )}
          </div>
          <button
            type="button"
            onClick={toggleAll}
            className="text-sm text-white/70 hover:text-white"
          >
            {selected.size === keys.length ? "Deselect all" : "Select all"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
              {lastFailureDetails && (
                <button
                  type="button"
                  onClick={() => {
                    const text = JSON.stringify(
                      {
                        error: lastFailureDetails.error,
                        timestamp: lastFailureDetails.timestamp,
                        prefix: lastFailureDetails.prefix,
                        environment: lastFailureDetails.environment,
                        ...(lastFailureDetails.status !== undefined && { status: lastFailureDetails.status }),
                        ...(lastFailureDetails.code && { code: lastFailureDetails.code }),
                        ...(lastFailureDetails.details && { details: lastFailureDetails.details }),
                        hint: "Paste into docs/r2-browser-verification-result.md and check server logs for R2_LIST_ERROR",
                      },
                      null,
                      2
                    );
                    void navigator.clipboard.writeText(text);
                  }}
                  className="rounded border border-white/20 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10 hover:text-white"
                >
                  Copy error details
                </button>
              )}
            </div>
          )}
          {loading ? (
            <p className="text-sm text-white/50">Loading…</p>
          ) : keys.length === 0 && !error ? (
            <p className="text-sm text-white/50">
              No images found in this folder.
              {source === "portfolio" && pillar !== "all" && (
                <> Try &quot;All portfolio&quot; to browse all images.</>
              )}
            </p>
          ) : keys.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {keys.map((key) => {
                const isSelected = selected.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSelection(key)}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                      isSelected ? "border-white ring-2 ring-white/30" : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    {isVideoKey(key) ? (
                      <video
                        src={getImageUrl(key)}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- dynamic R2 URLs
                      <img
                        src={getImageUrl(key)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                    {isSelected && (
                      <span className="absolute right-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-black">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAddSelected}
            disabled={adding || selected.size === 0}
            className="btn btn-primary text-sm"
          >
            {adding
              ? "…"
              : mode === "single"
                ? (selected.size > 0 ? "Use as hero" : "Use as hero")
                : `Add ${selected.size} selected`}
          </button>
        </div>
      </div>
    </div>
  );
}
