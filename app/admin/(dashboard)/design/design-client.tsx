"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { DesignSectionSettings } from "@/lib/design-section-settings";
import { DEFAULT_DESIGN_SECTION_SETTINGS } from "@/lib/design-section-settings";
import { getPublicR2Url } from "@/lib/r2";

type CoverMedia = {
  id: string;
  alt: string | null;
  keyFull: string | null;
  keyThumb: string | null;
};

type DesignProjectRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  published: boolean;
  featured: boolean;
  sortOrder: number;
  disciplines: string[];
  clientName: string | null;
  coverMedia: CoverMedia | null;
};

function coverSrc(m: CoverMedia | null): string | null {
  const key = m?.keyThumb || m?.keyFull;
  if (!key) return null;
  if (/^(https?:|\/)/i.test(key)) return key;
  return getPublicR2Url(key);
}

export default function AdminDesignClient() {
  const router = useRouter();
  const [settings, setSettings] = useState<DesignSectionSettings>(DEFAULT_DESIGN_SECTION_SETTINGS);
  const [projects, setProjects] = useState<DesignProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [search, setSearch] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const [settingsRes, listRes] = await Promise.all([
        fetch("/api/admin/design-section", { credentials: "include" }),
        fetch(`/api/admin/design-projects?${params}`, { credentials: "include" }),
      ]);
      if (settingsRes.ok) {
        const d = (await settingsRes.json()) as { settings?: DesignSectionSettings };
        if (d.settings) setSettings(d.settings);
      }
      if (listRes.ok) {
        const d = (await listRes.json()) as { projects?: DesignProjectRow[] };
        setProjects(d.projects ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings(next: DesignSectionSettings) {
    setSavingSettings(true);
    setSettingsMsg("");
    try {
      const res = await fetch("/api/admin/design-section", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const d = (await res.json()) as { ok?: boolean; settings?: DesignSectionSettings; error?: string };
      if (!res.ok || !d.settings) throw new Error(d.error || "Save failed");
      setSettings(d.settings);
      setSettingsMsg(d.settings.enabled ? "Design section is LIVE." : "Design section is HIDDEN.");
    } catch (err) {
      setSettingsMsg(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  }

  async function toggleLive() {
    await saveSettings({ ...settings, enabled: !settings.enabled });
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/design-projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), published: false }),
      });
      const d = (await res.json()) as { ok?: boolean; project?: { id: string }; error?: string };
      if (!res.ok || !d.project?.id) throw new Error(d.error || "Create failed");
      router.push(`/admin/design/${d.project.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Create failed");
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">Admin · Design</h1>
          <p className="section-subtitle">
            Graphic design portfolio — separate from photography Work. Toggle public visibility anytime.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void toggleLive()}
          disabled={savingSettings}
          className={`rounded-xl px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] ${
            settings.enabled
              ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40"
              : "bg-white/10 text-white/70 ring-1 ring-white/20"
          }`}
        >
          {settings.enabled ? "Live · click to hide" : "Hidden · click to go live"}
        </button>
      </div>
      {settingsMsg ? (
        <p className="mt-3 text-sm text-white/60">{settingsMsg}</p>
      ) : null}

      <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-6">
        <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">Section settings</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-white/70">
            Hub label
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
              value={settings.hubLabel}
              onChange={(e) => setSettings((s) => ({ ...s, hubLabel: e.target.value }))}
            />
          </label>
          <label className="block text-sm text-white/70">
            Nav label
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
              value={settings.navLabel}
              onChange={(e) => setSettings((s) => ({ ...s, navLabel: e.target.value }))}
            />
          </label>
          <label className="sm:col-span-2 block text-sm text-white/70">
            Hub description
            <textarea
              rows={2}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
              value={settings.hubDescription}
              onChange={(e) => setSettings((s) => ({ ...s, hubDescription: e.target.value }))}
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/70">
          {(
            [
              ["showInNav", "Top nav"],
              ["showOnHome", "Homepage"],
              ["showOnWorkHub", "Work hub band"],
              ["showOnAbout", "About"],
              ["showInFooter", "Footer"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-ghost mt-5"
          disabled={savingSettings}
          onClick={() => void saveSettings(settings)}
        >
          Save settings
        </button>
        {!settings.enabled ? (
          <p className="mt-3 text-xs text-amber-200/80">
            Section is hidden: /design returns 404 and no public links show. You can still edit projects here.
          </p>
        ) : null}
      </div>

      <form onSubmit={createProject} className="mt-10 flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-1 text-sm text-white/70">
          New project title
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Brand identity system"
            required
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={creating}>
          {creating ? "Creating…" : "Create project"}
        </button>
        <input
          className="min-w-[160px] rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>
      {createError ? <p className="mt-2 text-sm text-red-300">{createError}</p> : null}

      <div className="mt-8 space-y-3">
        {loading ? (
          <p className="text-sm text-white/50">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-white/50">No design projects yet.</p>
        ) : (
          projects.map((p) => {
            const src = coverSrc(p.coverMedia);
            return (
              <Link
                key={p.id}
                href={`/admin/design/${p.id}`}
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/40 p-3 hover:border-white/25"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-black/60">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{p.title}</p>
                  <p className="truncate text-xs text-white/50">
                    /design/{p.slug}
                    {p.clientName ? ` · ${p.clientName}` : ""}
                    {p.disciplines.length ? ` · ${p.disciplines.join(", ")}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right text-[0.65rem] uppercase tracking-[0.18em] text-white/45">
                  <div>{p.published ? "Published" : "Draft"}</div>
                  {p.featured ? <div className="text-white/70">Featured</div> : null}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
