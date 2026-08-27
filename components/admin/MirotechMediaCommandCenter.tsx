"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MirotechCmsMediaRef } from "@/lib/admin-r2-mirotech-cms-keys";
import type { MirotechMediaAuditItem, MirotechProposedMove } from "@/lib/admin-r2-mirotech-audit";
import type { R2VaultId } from "@/lib/r2-vaults-shared";

type AuditResponse = {
  ok?: boolean;
  error?: string;
  items?: MirotechMediaAuditItem[];
  filteredTotal?: number;
  offset?: number;
  limit?: number;
  truncated?: boolean;
  orphanCount?: number;
  duplicateGroupCount?: number;
  proposedMoveCount?: number;
};

type UsageResponse = {
  ok?: boolean;
  cmsRefs?: MirotechCmsMediaRef[];
  usage?: { totalRefs?: number };
  error?: string;
};

type ManifestResponse = {
  ok?: boolean;
  moves?: MirotechProposedMove[];
  blocked?: Array<{ key: string; reason: string }>;
};

function parentPrefix(key: string): string {
  const parts = key.replace(/^\/+/, "").split("/");
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/") + "/";
}

function r2FolderHref(key: string, vault: R2VaultId): string {
  const prefix = parentPrefix(key);
  return `/admin/r2?prefix=${encodeURIComponent(prefix)}&vault=${encodeURIComponent(vault)}&view=folder`;
}

export default function MirotechMediaCommandCenter() {
  const [items, setItems] = useState<MirotechMediaAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "image" | "video">("all");
  const [vaultFilter, setVaultFilter] = useState<"all" | R2VaultId>("all");
  const [liveFilter, setLiveFilter] = useState<"all" | "live" | "not">("all");
  const [orphanFilter, setOrphanFilter] = useState(false);
  const [duplicateFilter, setDuplicateFilter] = useState(false);
  const [reorgFilter, setReorgFilter] = useState(false);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [stats, setStats] = useState({ orphan: 0, duplicates: 0, reorg: 0 });
  const [truncated, setTruncated] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [usageItem, setUsageItem] = useState<MirotechMediaAuditItem | null>(null);
  const [usageRefs, setUsageRefs] = useState<MirotechCmsMediaRef[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [manifestOpen, setManifestOpen] = useState(false);
  const [manifestMoves, setManifestMoves] = useState<MirotechProposedMove[]>([]);
  const [manifestBlocked, setManifestBlocked] = useState<Array<{ key: string; reason: string }>>([]);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [reorgRunning, setReorgRunning] = useState(false);
  const [renameItem, setRenameItem] = useState<MirotechMediaAuditItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [moveDest, setMoveDest] = useState("");
  const [mergeGroup, setMergeGroup] = useState<MirotechMediaAuditItem[] | null>(null);
  const [mergeCanonical, setMergeCanonical] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/r2/tools", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "mirotech-media-audit",
          maxKeys: 8000,
          kind: kindFilter,
          limit: 500,
          offset: 0,
          search: debouncedSearch || undefined,
          vault: vaultFilter,
          liveInCms: liveFilter === "live" ? true : liveFilter === "not" ? false : undefined,
          orphan: orphanFilter ? true : undefined,
          duplicate: duplicateFilter ? true : undefined,
          hasProposedMove: reorgFilter ? true : undefined,
        }),
      });
      const data = (await res.json()) as AuditResponse;
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to load audit");
      setItems(data.items ?? []);
      setFilteredTotal(data.filteredTotal ?? 0);
      setTruncated(Boolean(data.truncated));
      setStats({
        orphan: data.orphanCount ?? 0,
        duplicates: data.duplicateGroupCount ?? 0,
        reorg: data.proposedMoveCount ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [
    kindFilter,
    vaultFilter,
    liveFilter,
    orphanFilter,
    duplicateFilter,
    reorgFilter,
    debouncedSearch,
  ]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const selectedItems = useMemo(
    () => items.filter((i) => selected.has(`${i.vault}:${i.key}`)),
    [items, selected]
  );

  async function openUsage(item: MirotechMediaAuditItem) {
    setUsageItem(item);
    setUsageLoading(true);
    setUsageRefs([]);
    try {
      const res = await fetch(
        `/api/admin/r2/usage?key=${encodeURIComponent(item.key)}&vault=${encodeURIComponent(item.vault)}`,
        { credentials: "include" }
      );
      const data = (await res.json()) as UsageResponse;
      setUsageRefs(data.cmsRefs ?? []);
    } catch {
      setUsageRefs([]);
    } finally {
      setUsageLoading(false);
    }
  }

  async function loadManifest() {
    setManifestLoading(true);
    try {
      const res = await fetch("/api/admin/r2/tools", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "mirotech-reorg-manifest" }),
      });
      const data = (await res.json()) as ManifestResponse;
      if (!res.ok || !data.ok) throw new Error("Failed to load manifest");
      setManifestMoves(data.moves ?? []);
      setManifestBlocked(data.blocked ?? []);
      setManifestOpen(true);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Manifest failed");
    } finally {
      setManifestLoading(false);
    }
  }

  async function executeMoves(moves: MirotechProposedMove[], override = false) {
    if (!moves.length) return;
    if (!override && moves.some((m) => manifestBlocked.some((b) => b.key === m.from))) {
      setStatus("Some keys are blocked — review manifest.");
      return;
    }
    setReorgRunning(true);
    setStatus("");
    try {
      const byVault = new Map<R2VaultId, MirotechProposedMove[]>();
      for (const m of moves) {
        const list = byVault.get(m.vault) ?? [];
        list.push(m);
        byVault.set(m.vault, list);
      }
      let moved = 0;
      let failed = 0;
      for (const [vault, vaultMoves] of byVault) {
        const res = await fetch("/api/admin/r2/move", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vault,
            items: vaultMoves.map((m) => ({ from: m.from, to: m.to })),
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          moved?: number;
          failed?: number;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Move failed");
        moved += data.moved ?? 0;
        failed += data.failed ?? 0;
      }
      setStatus(`Reorg batch: ${moved} moved, ${failed} failed.`);
      setManifestOpen(false);
      void loadAudit();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Reorg failed");
    } finally {
      setReorgRunning(false);
    }
  }

  async function moveKeys(keys: Array<{ key: string; vault: R2VaultId }>, destPrefix: string) {
    const dest = destPrefix.trim().replace(/^\/+/, "");
    if (!dest.endsWith("/")) return;
    setStatus("");
    try {
      const byVault = new Map<R2VaultId, string[]>();
      for (const { key, vault } of keys) {
        const list = byVault.get(vault) ?? [];
        list.push(key);
        byVault.set(vault, list);
      }
      for (const [vault, vaultKeys] of byVault) {
        const res = await fetch("/api/admin/r2/move", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vault,
            keys: vaultKeys,
            destinationPrefix: dest,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Move failed");
      }
      setStatus(`Moved ${keys.length} file(s).`);
      setMoveDest("");
      setSelected(new Set());
      void loadAudit();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Move failed");
    }
  }

  async function renameKey(item: MirotechMediaAuditItem, newName: string) {
    const parent = parentPrefix(item.key);
    const to = `${parent}${newName.trim()}`;
    if (!newName.trim() || to === item.key) return;
    try {
      const res = await fetch("/api/admin/r2/move", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vault: item.vault,
          items: [{ from: item.key, to }],
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Rename failed");
      setRenameItem(null);
      setStatus("Renamed.");
      void loadAudit();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Rename failed");
    }
  }

  async function deleteKeys(keys: Array<{ key: string; vault: R2VaultId }>) {
    for (const { key, vault } of keys) {
      const usageRes = await fetch(
        `/api/admin/r2/usage?key=${encodeURIComponent(key)}&vault=${encodeURIComponent(vault)}`,
        { credentials: "include" }
      );
      const usageData = (await usageRes.json()) as UsageResponse;
      const refCount =
        (usageData.usage?.totalRefs ?? 0) + (usageData.cmsRefs?.length ?? 0);
      if (refCount > 0) {
        setStatus(`Cannot delete ${key}: ${refCount} reference(s). Open Usage first.`);
        return;
      }
    }
    const typed = window.prompt(`Type DELETE to remove ${keys.length} object(s) from R2:`);
    if (typed !== "DELETE") return;
    try {
      for (const { key, vault } of keys) {
        const res = await fetch("/api/admin/r2/delete", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: [key], vault }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Delete failed");
      }
      setStatus(`Deleted ${keys.length} object(s).`);
      setSelected(new Set());
      void loadAudit();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Delete failed");
    }
  }

  function openMergeWizard(item: MirotechMediaAuditItem) {
    const group = items.filter((i) => i.duplicateGroupId === item.duplicateGroupId);
    if (group.length < 2) return;
    setMergeGroup(group);
    setMergeCanonical(item.key);
  }

  async function runMerge() {
    if (!mergeGroup || !mergeCanonical) return;
    const extras = mergeGroup.filter((i) => i.key !== mergeCanonical);
    setStatus("");
    try {
      for (const extra of extras) {
        const res = await fetch("/api/admin/r2/rewrite-refs", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from: extra.key,
            to: mergeCanonical,
            vault: extra.vault,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Rewrite failed");
        await fetch("/api/admin/r2/delete", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: [extra.key], vault: extra.vault, force: true }),
        });
      }
      setMergeGroup(null);
      setStatus("Duplicate merge complete.");
      void loadAudit();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Merge failed");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Mirotech</p>
        <h1 className="mt-2 font-display text-2xl text-white sm:text-3xl">Media command center</h1>
        <p className="mt-1 text-sm text-white/70">
          Unified view across Mirotech CMS bucket and Brightline portfolio / T9 paths. Search,
          filter orphans and duplicates, and run safe reorg batches.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-wider text-white/45">
          <span>{filteredTotal} shown</span>
          {truncated ? <span className="text-amber-200/80">Scan truncated</span> : null}
          <span>{stats.orphan} orphans</span>
          <span>{stats.duplicates} duplicate groups</span>
          <span>{stats.reorg} reorg candidates</span>
        </div>
      </div>

      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-white/10 bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder="Search keys, slugs, paths…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none sm:min-w-[220px] sm:flex-none"
          />
          <button
            type="button"
            className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 sm:hidden"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            Filters
          </button>
          <Link
            href="/admin/r2?view=mirotech-all-media&vault=mirotech-site"
            className="hidden rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:border-white/40 sm:inline-block"
          >
            R2 hub
          </Link>
          <Link
            href="/admin/r2?upload=1&root=mirotech&segment=product&quality=web_full"
            className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
          >
            Upload
          </Link>
          <button
            type="button"
            disabled={manifestLoading}
            className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:border-white/40 disabled:opacity-50"
            onClick={() => void loadManifest()}
          >
            {manifestLoading ? "…" : "Reorg plan"}
          </button>
        </div>

        <div
          className={`mt-3 flex flex-wrap gap-2 ${filtersOpen ? "block" : "hidden sm:flex"}`}
        >
          {(["all", "image", "video"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKindFilter(k)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                kindFilter === k ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10"
              }`}
            >
              {k === "all" ? "All types" : k}
            </button>
          ))}
          <select
            value={vaultFilter}
            onChange={(e) => setVaultFilter(e.target.value as "all" | R2VaultId)}
            className="rounded-lg border border-white/20 bg-black/40 px-2 py-1.5 text-sm text-white"
          >
            <option value="all">All vaults</option>
            <option value="brightline">Brightline bucket</option>
            <option value="mirotech-site">Mirotech CMS bucket</option>
          </select>
          <select
            value={liveFilter}
            onChange={(e) => setLiveFilter(e.target.value as "all" | "live" | "not")}
            className="rounded-lg border border-white/20 bg-black/40 px-2 py-1.5 text-sm text-white"
          >
            <option value="all">CMS: any</option>
            <option value="live">In CMS</option>
            <option value="not">Not in CMS</option>
          </select>
          <button
            type="button"
            onClick={() => setOrphanFilter((v) => !v)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              orphanFilter ? "bg-amber-500/20 text-amber-100" : "text-white/60 hover:bg-white/10"
            }`}
          >
            Orphans
          </button>
          <button
            type="button"
            onClick={() => setDuplicateFilter((v) => !v)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              duplicateFilter ? "bg-violet-500/20 text-violet-100" : "text-white/60 hover:bg-white/10"
            }`}
          >
            Duplicates
          </button>
          <button
            type="button"
            onClick={() => setReorgFilter((v) => !v)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              reorgFilter ? "bg-emerald-500/20 text-emerald-100" : "text-white/60 hover:bg-white/10"
            }`}
          >
            Reorg candidates
          </button>
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}
      {status ? <p className="mb-4 text-sm text-white/70">{status}</p> : null}

      {moveDest || selected.size > 0 ? (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-white/15 bg-white/[0.03] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/50">{selected.size} selected</span>
            <input
              type="text"
              placeholder="Move to prefix e.g. mirotech/product/web_full/"
              value={moveDest}
              onChange={(e) => setMoveDest(e.target.value)}
              className="min-w-0 flex-1 rounded border border-white/20 bg-black/40 px-2 py-1.5 text-sm text-white"
            />
            <button
              type="button"
              className="btn btn-ghost text-xs"
              disabled={!moveDest.trim() || selectedItems.length === 0}
              onClick={() =>
                void moveKeys(
                  selectedItems.map((i) => ({ key: i.key, vault: i.vault })),
                  moveDest
                )
              }
            >
              Move
            </button>
            <button
              type="button"
              className="btn btn-ghost text-xs text-red-200"
              disabled={selectedItems.length === 0}
              onClick={() =>
                void deleteKeys(selectedItems.map((i) => ({ key: i.key, vault: i.vault })))
              }
            >
              Delete
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {[
              "mirotech/product/web_full/",
              "mirotech/editorial/web_full/",
              "mirotech/portfolio/cor/web_full/",
              "mirotech/_review/web_full/",
              "projects/",
            ].map((prefix) => (
              <button
                key={prefix}
                type="button"
                className="rounded border border-white/15 px-2 py-0.5 text-[0.65rem] text-white/55 hover:border-white/30 hover:text-white"
                onClick={() => setMoveDest(prefix)}
              >
                {prefix}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-white/50">Loading audit…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-white/50">No media matches filters.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item) => {
            const id = `${item.vault}:${item.key}`;
            const isSelected = selected.has(id);
            return (
              <div
                key={id}
                className={`group flex flex-col overflow-hidden rounded-xl border bg-white/[0.03] transition ${
                  isSelected ? "border-white/50" : "border-white/10 hover:border-white/25"
                }`}
              >
                <div className="relative aspect-square bg-black/50">
                  <button
                    type="button"
                    className="absolute left-2 top-2 z-10 h-6 w-6 rounded border border-white/40 bg-black/60 text-[10px] text-white"
                    onClick={() => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        return next;
                      });
                    }}
                  >
                    {isSelected ? "✓" : ""}
                  </button>
                  {item.liveInCms ? (
                    <span className="absolute right-2 top-2 z-10 rounded-full bg-emerald-500/25 px-2 py-0.5 text-[0.55rem] uppercase text-emerald-100">
                      CMS {item.cmsRefs.length > 1 ? `×${item.cmsRefs.length}` : ""}
                    </span>
                  ) : item.orphan ? (
                    <span className="absolute right-2 top-2 z-10 rounded-full bg-amber-500/20 px-2 py-0.5 text-[0.55rem] uppercase text-amber-100">
                      Orphan
                    </span>
                  ) : null}
                  {item.duplicateGroupSize >= 2 ? (
                    <span className="absolute bottom-2 left-2 z-10 rounded-full bg-violet-500/25 px-2 py-0.5 text-[0.55rem] text-violet-100">
                      Dup ×{item.duplicateGroupSize}
                    </span>
                  ) : null}
                  <button type="button" className="block h-full w-full" onClick={() => void openUsage(item)}>
                    {item.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.previewUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : item.kind === "video" ? (
                      <video
                        src={item.previewUrl}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-white/40">File</div>
                    )}
                  </button>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-2">
                  <p className="truncate text-xs font-medium text-white">{item.name}</p>
                  <p className="truncate text-[0.65rem] text-white/45">{item.key}</p>
                  <p className="text-[0.6rem] uppercase tracking-wider text-white/35">
                    {item.vault === "mirotech-site" ? "CMS bucket" : "Brightline"} · {item.sizeLabel}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Link
                      href={r2FolderHref(item.key, item.vault)}
                      className="text-[0.6rem] uppercase tracking-wider text-white/50 hover:text-white"
                    >
                      Folder
                    </Link>
                    <button
                      type="button"
                      className="text-[0.6rem] uppercase tracking-wider text-white/50 hover:text-white"
                      onClick={() => {
                        setRenameItem(item);
                        setRenameValue(item.name);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="text-[0.6rem] uppercase tracking-wider text-white/50 hover:text-white"
                      onClick={() => void openUsage(item)}
                    >
                      Usage
                    </button>
                    {item.duplicateGroupSize >= 2 ? (
                      <button
                        type="button"
                        className="text-[0.6rem] uppercase tracking-wider text-violet-300/80 hover:text-violet-200"
                        onClick={() => openMergeWizard(item)}
                      >
                        Merge
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected.size > 0 ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 flex gap-2 border-t border-white/10 bg-black/95 p-3 sm:hidden">
          <button
            type="button"
            className="flex-1 rounded-lg border border-white/25 py-2 text-sm text-white"
            onClick={() => setMoveDest("mirotech/_review/web_full/")}
          >
            Queue move
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg bg-white/15 py-2 text-sm text-white"
            onClick={() =>
              void deleteKeys(selectedItems.map((i) => ({ key: i.key, vault: i.vault })))
            }
          >
            Delete
          </button>
        </div>
      ) : null}

      {usageItem ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/15 bg-[#111] p-4 sm:rounded-2xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/45">Usage</p>
                <p className="mt-1 text-sm text-white">{usageItem.key}</p>
              </div>
              <button type="button" className="text-white/50" onClick={() => setUsageItem(null)}>
                ✕
              </button>
            </div>
            {usageLoading ? (
              <p className="mt-4 text-sm text-white/50">Loading…</p>
            ) : usageRefs.length === 0 ? (
              <p className="mt-4 text-sm text-white/50">No Mirotech CMS references.</p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm text-white/80">
                {usageRefs.map((ref) => (
                  <li key={`${ref.slug}-${ref.field}`} className="rounded-lg bg-white/5 px-3 py-2">
                    <p>{ref.sourceLabel}</p>
                    <Link
                      href={`/api/admin/mirotech/handoff?next=/admin/projects`}
                      className="mt-1 text-xs text-white/45 hover:text-white"
                    >
                      Open Mirotech admin →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {renameItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#111] p-4">
            <p className="text-sm text-white">Rename file</p>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="mt-3 w-full rounded border border-white/20 bg-black/40 px-3 py-2 text-sm text-white"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setRenameItem(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void renameKey(renameItem, renameValue)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mergeGroup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#111] p-4">
            <p className="text-sm font-medium text-white">Merge duplicates</p>
            <p className="mt-1 text-xs text-white/50">Pick canonical key; others rewrite refs then delete.</p>
            <div className="mt-3 space-y-2">
              {mergeGroup.map((item) => (
                <label key={item.key} className="flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="radio"
                    name="canonical"
                    checked={mergeCanonical === item.key}
                    onChange={() => setMergeCanonical(item.key)}
                  />
                  <span className="truncate">{item.key}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setMergeGroup(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void runMerge()}>
                Merge
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {manifestOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-white/15 bg-[#111] p-4 sm:rounded-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/45">Reorg manifest</p>
                <p className="mt-1 text-sm text-white/70">
                  {manifestMoves.length} moves · {manifestBlocked.length} blocked
                </p>
              </div>
              <button type="button" onClick={() => setManifestOpen(false)} className="text-white/50">
                ✕
              </button>
            </div>
            {manifestMoves.length > 0 ? (
              <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto text-xs text-white/70">
                {manifestMoves.slice(0, 40).map((m) => (
                  <li key={`${m.from}-${m.to}`} className="truncate">
                    {m.from} → {m.to}
                  </li>
                ))}
                {manifestMoves.length > 40 ? (
                  <li className="text-white/40">+{manifestMoves.length - 40} more</li>
                ) : null}
              </ul>
            ) : null}
            {manifestBlocked.length > 0 ? (
              <p className="mt-3 text-xs text-amber-200/80">
                {manifestBlocked.length} keys blocked (Brightline DB refs).
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={reorgRunning || manifestMoves.length === 0}
                className="btn btn-primary"
                onClick={() => void executeMoves(manifestMoves)}
              >
                {reorgRunning ? "Running…" : `Run ${manifestMoves.length} moves`}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setManifestOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
