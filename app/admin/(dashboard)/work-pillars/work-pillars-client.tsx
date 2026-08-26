"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PillarConfig } from "@/lib/portfolioPillars";
import {
  DEFAULT_MIROTECH_HUB_PILLAR,
  WORK_SECTIONS,
  isDualBrandHub,
} from "@/lib/portfolioPillars";
import R2BrowserModal from "../work/R2BrowserModal";

const SECTION_LABELS: Record<string, string> = {
  ACD: "Advertising / campaign (ACD)",
  CUL: "Culinary (CUL)",
  REA: "Real estate (REA)",
  TRI: "Travel / hospitality (TRI)",
  BIZ: "Corporate / business (BIZ)",
};

function publicPreviewUrl(keyOrUrl: string): string {
  const v = keyOrUrl.trim();
  if (!v) return "";
  if (/^(https?:|\/)/i.test(v)) return v;
  return `/api/media/public?key=${encodeURIComponent(v.replace(/^\//, ""))}`;
}

function blankPillar(sortOrder: number): PillarConfig {
  return {
    slug: "",
    label: "New pillar",
    description:
      "Short summary for the pillar index page (SEO and hero copy underneath the title).",
    homeMeta: "",
    sections: ["REA"],
    hub: "none",
    visible: true,
    coverImageKey: "",
    coverAlt: "",
    sortOrder,
  };
}

function normalizeSort(list: PillarConfig[]): PillarConfig[] {
  return list.map((p, i) => ({
    ...p,
    hub: p.hub === "dual-brand" ? "dual-brand" : "none",
    sortOrder: i,
  }));
}

type Props = {
  initialPillars: PillarConfig[];
};

export default function WorkPillarsClient({ initialPillars }: Props) {
  const [draft, setDraft] = useState<PillarConfig[]>(() => normalizeSort([...initialPillars]));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [r2Index, setR2Index] = useState<number | null>(null);

  const sorted = useMemo(() => normalizeSort(draft), [draft]);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const payload = normalizeSort(sorted).map((p) => ({
        ...p,
        slug: p.slug.trim().toLowerCase(),
      }));
      const res = await fetch("/api/admin/work-pillars", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pillars: payload }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        pillars?: PillarConfig[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Save failed");
      }
      if (data.pillars) setDraft(normalizeSort(data.pillars));
      setMessage({
        kind: "ok",
        text: "Saved. Homepage, /work, and navigation update on the next request.",
      });
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  function updateAt(index: number, patch: Partial<PillarConfig>) {
    setDraft((rows) => {
      const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
      return normalizeSort(next);
    });
  }

  function toggleSection(index: number, section: (typeof WORK_SECTIONS)[number]) {
    const row = sorted[index];
    if (!row) return;
    const has = row.sections.includes(section);
    const nextSections = has
      ? row.sections.filter((s) => s !== section)
      : [...row.sections, section];
    if (nextSections.length === 0) return;
    updateAt(index, { sections: nextSections });
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= sorted.length) return;
    setDraft((rows) => {
      const list = normalizeSort([...rows]);
      const [sp] = list.splice(index, 1);
      list.splice(j, 0, sp);
      return normalizeSort(list);
    });
  }

  function addPillar() {
    setDraft((rows) => [...rows, blankPillar(rows.length)]);
  }

  function addMirotechHub() {
    if (sorted.some(isDualBrandHub)) {
      setMessage({
        kind: "err",
        text: "A Mirotech / dual-brand hub already exists. Toggle Show or reorder it instead.",
      });
      return;
    }
    setDraft((rows) =>
      normalizeSort([
        ...rows,
        {
          ...DEFAULT_MIROTECH_HUB_PILLAR,
          sortOrder: rows.length,
        },
      ])
    );
    setMessage({
      kind: "ok",
      text: "Mirotech hub added — set cover/order and Save to publish on /work.",
    });
  }

  function removePillar(index: number) {
    if (sorted.length <= 1) {
      setMessage({ kind: "err", text: "Keep at least one pillar." });
      return;
    }
    setDraft((rows) => normalizeSort(rows.filter((_, i) => i !== index)));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">Publish</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-3xl text-black">Work</h1>
          <div className="flex items-center gap-2">
            <Link href="/admin/work" className="btn btn-ghost text-sm">
              Projects
            </Link>
            <Link href="/admin/work-pillars" className="btn btn-primary text-sm">
              Pillars
            </Link>
          </div>
        </div>
        <p className="text-sm text-black/70">
          Define work categories for the site: URL slug, copy, which database work sections belong here,
          visibility, and optional cover image. Each work section (ACD, REA, …) may only belong to one
          pillar.
        </p>
        <p className="text-xs text-black/55">
          Turning off <strong>Show</strong> hides a pillar from the homepage grid, the /work hub, and the
          header links after Work. Adding pillars creates new routes at{" "}
          <span className="font-mono">/work/your-slug</span>. Use{" "}
          <strong>Add Mirotech hub</strong> for a dual-brand card that lists shared Mirotech projects
          (no photography work section required).
        </p>
      </div>

      {message ? (
        <p
          className={`mt-6 text-sm ${message.kind === "ok" ? "text-emerald-700" : "text-red-700"}`}
          role="status"
        >
          {message.text}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost text-sm" onClick={addPillar}>
          Add pillar
        </button>
        <button type="button" className="btn btn-ghost text-sm" onClick={addMirotechHub}>
          Add Mirotech hub
        </button>
      </div>

      <div className="mt-8 flex flex-col gap-8">
        {sorted.map((pillar, index) => (
          <div
            key={`${pillar.slug || "new"}-${index}`}
            className="rounded-xl border border-black/10 bg-white p-4 shadow-sm space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-xs uppercase tracking-wide text-black/50">
                {isDualBrandHub(pillar) ? "Mirotech hub" : `Pillar ${index + 1}`}
                {pillar.slug ? (
                  <span className="ml-2 font-mono text-[0.7rem] normal-case text-black/45">
                    /work/{pillar.slug}
                  </span>
                ) : null}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-black/70">
                  <input
                    type="checkbox"
                    checked={pillar.visible}
                    onChange={(e) => updateAt(index, { visible: e.target.checked })}
                    className="rounded border-black/30"
                  />
                  Show
                </label>
                <button
                  type="button"
                  className="text-xs text-black/55 hover:text-black"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="text-xs text-black/55 hover:text-black"
                  onClick={() => move(index, 1)}
                  disabled={index === sorted.length - 1}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="text-xs text-red-700 hover:underline"
                  onClick={() => removePillar(index)}
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-xs font-medium text-black/70">
                URL slug
                <input
                  className="mt-1 w-full rounded border border-black/15 bg-white px-2 py-1.5 text-sm text-black font-mono"
                  value={pillar.slug}
                  onChange={(e) =>
                    updateAt(index, { slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
                  }
                  placeholder="e.g. hospitality"
                />
              </label>
              <label className="block text-xs font-medium text-black/70">
                Nav / card label
                <input
                  className="mt-1 w-full rounded border border-black/15 bg-white px-2 py-1.5 text-sm text-black"
                  value={pillar.label}
                  onChange={(e) => updateAt(index, { label: e.target.value })}
                />
              </label>
            </div>

            <label className="block text-xs font-medium text-black/70">
              Pillar index description (below H1 on /work/…)
              <textarea
                className="mt-1 w-full rounded border border-black/15 bg-white px-2 py-1.5 text-sm text-black min-h-[4.5rem]"
                value={pillar.description}
                onChange={(e) => updateAt(index, { description: e.target.value })}
              />
            </label>

            <label className="block text-xs font-medium text-black/70">
              Subtitle / meta (homepage card + /work hub)
              <textarea
                className="mt-1 w-full rounded border border-black/15 bg-white px-2 py-1.5 text-sm text-black min-h-[3rem]"
                value={pillar.homeMeta}
                onChange={(e) => updateAt(index, { homeMeta: e.target.value })}
              />
            </label>

            {isDualBrandHub(pillar) ? (
              <div className="rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2 text-xs text-black/65">
                Dual-brand hub — lists projects published to Brightline from the Mirotech CMS at{" "}
                <span className="font-mono">/work/{pillar.slug || "mirotech"}</span>. No photography work
                section mapping is required.
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-black/70">Work sections in this pillar</p>
                <p className="mt-0.5 text-[0.65rem] text-black/50">
                  Projects in these sections appear on this pillar index. Each section can only be selected once
                  across all pillars (save will error if duplicated).
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {WORK_SECTIONS.map((section) => (
                    <label key={section} className="flex items-center gap-2 text-xs text-black/80">
                      <input
                        type="checkbox"
                        checked={pillar.sections.includes(section)}
                        onChange={() => toggleSection(index, section)}
                        className="rounded border-black/30"
                      />
                      {SECTION_LABELS[section] ?? section}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="relative aspect-[4/3] max-h-48 overflow-hidden rounded-lg border border-black/10 bg-black/5">
              {(() => {
                const preview = publicPreviewUrl(pillar.coverImageKey);
                return preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full min-h-[120px] items-center justify-center px-3 text-center text-xs text-black/40">
                    {isDualBrandHub(pillar)
                      ? "No cover override — uses first dual-brand project hero when available"
                      : "No cover override — uses featured project hero from the first section"}
                  </div>
                );
              })()}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-black/70">
                Cover image (R2 key, /path, or URL)
                <input
                  className="mt-1 w-full rounded border border-black/15 bg-white px-2 py-1.5 text-sm text-black font-mono text-[0.8rem]"
                  value={pillar.coverImageKey}
                  onChange={(e) => updateAt(index, { coverImageKey: e.target.value })}
                  placeholder="portfolio/advertising/…"
                />
              </label>
              <button
                type="button"
                className="btn btn-ghost text-xs px-2 py-1"
                onClick={() => setR2Index(index)}
              >
                Choose from R2…
              </button>
            </div>

            <label className="block text-xs font-medium text-black/70">
              Cover alt text (optional)
              <input
                className="mt-1 w-full rounded border border-black/15 bg-white px-2 py-1.5 text-sm text-black"
                value={pillar.coverAlt}
                onChange={(e) => updateAt(index, { coverAlt: e.target.value })}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <R2BrowserModal
        isOpen={r2Index !== null}
        onClose={() => setR2Index(null)}
        pillarSlug={
          r2Index != null && sorted[r2Index]?.slug ? sorted[r2Index]!.slug : "architecture"
        }
        mode="single"
        onAddKeys={async (keys) => {
          if (r2Index === null || !keys[0]) return;
          updateAt(r2Index, { coverImageKey: keys[0] });
          setR2Index(null);
        }}
      />
    </div>
  );
}
