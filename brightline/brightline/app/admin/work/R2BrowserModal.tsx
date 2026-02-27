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

const IMAGE_EXT = /\.(jpg|jpeg|png|webp|gif)$/i;

type R2BrowserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAddKeys: (keys: string[]) => Promise<void>;
};

export default function R2BrowserModal({
  isOpen,
  onClose,
  onAddKeys,
}: R2BrowserModalProps) {
  const [pillar, setPillar] = useState<string>("arc");
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setKeys([]);
    setSelected(new Set());
    async function load() {
      setLoading(true);
      try {
        const prefix = `portfolio/${pillar}/web_full`;
        const res = await fetch("/api/admin/r2-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prefix }),
        });
        const data = (await res.json()) as { ok: boolean; keys?: string[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to list");
        const raw = data.keys ?? [];
        const imageKeys = raw.filter((k) => IMAGE_EXT.test(k));
        setKeys(imageKeys);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
        setKeys([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [isOpen, pillar]);

  function toggleSelection(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
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
    setAdding(true);
    setError("");
    try {
      await onAddKeys(toAdd);
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
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-white/10 bg-[#0b0e12] shadow-xl">
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
          <label className="flex items-center gap-2 text-sm text-white/80">
            Pillar:
            <select
              value={pillar}
              onChange={(e) => setPillar(e.target.value)}
              className="rounded border border-white/20 bg-black/40 px-2 py-1.5 text-sm text-white"
            >
              {PILLAR_SLUGS.map((slug) => (
                <option key={slug} value={slug}>
                  {PILLARS.find((p) => p.slug === slug)?.label ?? slug}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={toggleAll}
            className="text-sm text-white/70 hover:text-white"
          >
            {selected.size === keys.length ? "Deselect all" : "Select all"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <p className="mb-4 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          {loading ? (
            <p className="text-sm text-white/50">Loading…</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-white/50">No images in this folder.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
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
                    <img
                      src={getImageUrl(key)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    {isSelected && (
                      <span className="absolute right-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-black">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
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
            {adding ? "Adding…" : `Add ${selected.size} selected`}
          </button>
        </div>
      </div>
    </div>
  );
}
