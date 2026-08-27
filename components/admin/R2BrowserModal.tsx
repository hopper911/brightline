"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import R2FolderPreviewThumb from "@/components/admin/R2FolderPreviewThumb";
import {
  ALL_MIROTECH_MEDIA_PREFIX,
  BROWSE_LIBRARY_GROUP_LABELS,
  browseBreadcrumbs,
  browseLibraryRoots,
  browsePreviewUrl,
  defaultFolderForRoot,
  filterBrowsePicks,
  folderSegmentLabel,
  isAllMirotechMediaPrefix,
  preferredQualityChildPrefix,
  type BrowseLibraryGroup,
  type PortfolioFolderFilter,
  type R2BrowserPick,
} from "@/lib/r2-browser-prefixes";
import type { R2VaultId } from "@/lib/r2-vaults-shared";
import type { T9MediaRoot } from "@/lib/t9-media-root";

const MEDIA_EXT = /\.(jpg|jpeg|png|webp|gif|avif|mp4|webm|mov|m4v)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

function isVideoKey(key: string): boolean {
  return VIDEO_EXT.test(key);
}

const PAGE_SIZE = 60;

export type { R2BrowserPick };

type NavLocation = {
  /** null = library home */
  prefix: string | null;
  vault: R2VaultId;
};

type ListedFolder = {
  prefix: string;
  vault: R2VaultId;
  label: string;
  description?: string;
  previewUrls?: string[];
  previewKind?: "image" | "video" | "empty";
  group?: BrowseLibraryGroup;
  special?: "all-mirotech-media";
};

type R2BrowserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAddKeys: (picks: R2BrowserPick[]) => Promise<void>;
  mode?: "multiple" | "single";
  projectId?: string;
  pillarSlug?: string;
  projectSlug?: string;
  initialCustomPrefix?: string;
  initialPortfolioFolder?: PortfolioFolderFilter;
  mediaRoot?: T9MediaRoot;
  /** Primary action label when mode is single */
  confirmLabel?: string;
};

function pickId(pick: R2BrowserPick): string {
  return `${pick.vault}:${pick.key}`;
}

function vaultBadge(folder: ListedFolder) {
  if (folder.special === "all-mirotech-media") {
    return (
      <span className="mt-1 inline-block rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-violet-300/90">
        Unified
      </span>
    );
  }
  if (folder.vault === "mirotech-site") {
    return (
      <span className="mt-1 inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-emerald-300/90">
        CMS bucket
      </span>
    );
  }
  if (folder.prefix.startsWith("portfolio/")) {
    return (
      <span className="mt-1 inline-block rounded bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/50">
        Portfolio
      </span>
    );
  }
  if (folder.prefix.startsWith("mirotech/")) {
    return (
      <span className="mt-1 inline-block rounded bg-sky-500/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-sky-300/90">
        T9
      </span>
    );
  }
  return null;
}

export default function R2BrowserModal({
  isOpen,
  onClose,
  onAddKeys,
  mode = "multiple",
  initialCustomPrefix,
  initialPortfolioFolder,
  mediaRoot: mediaRootProp = "portfolio",
  confirmLabel,
}: R2BrowserModalProps) {
  const [mediaRoot, setMediaRoot] = useState<T9MediaRoot>(mediaRootProp);
  const [qualityFilter, setQualityFilter] = useState<PortfolioFolderFilter>(() =>
    defaultFolderForRoot(mediaRootProp, initialPortfolioFolder)
  );
  const [nav, setNav] = useState<NavLocation | null>(null);
  const [folders, setFolders] = useState<ListedFolder[]>([]);
  const [libraryPreviews, setLibraryPreviews] = useState<
    Record<string, { previewUrls: string[]; previewKind: "image" | "video" | "empty" }>
  >({});
  const [picks, setPicks] = useState<R2BrowserPick[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const libraryRoots = useMemo(() => browseLibraryRoots(mediaRoot), [mediaRoot]);
  const atLibraryHome = nav === null || nav.prefix === null;
  const inAllMirotech = isAllMirotechMediaPrefix(nav?.prefix);
  const crumbs = useMemo(
    () =>
      browseBreadcrumbs(
        atLibraryHome ? null : inAllMirotech ? null : nav?.prefix ?? null,
        mediaRoot === "mirotech" ? "Mirotech library" : "Portfolio library"
      ).concat(
        inAllMirotech
          ? [{ label: "All Mirotech media", prefix: ALL_MIROTECH_MEDIA_PREFIX }]
          : []
      ),
    [atLibraryHome, nav?.prefix, mediaRoot, inAllMirotech]
  );

  const resetToLibrary = useCallback(() => {
    setNav(null);
    setFolders([]);
    setPicks([]);
    setSelected(new Set());
    setSearch("");
    setError("");
    setNextToken(null);
    setVisibleCount(PAGE_SIZE);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setMediaRoot(mediaRootProp);
    setQualityFilter(defaultFolderForRoot(mediaRootProp, initialPortfolioFolder));
    resetToLibrary();
  }, [isOpen, mediaRootProp, initialPortfolioFolder, resetToLibrary]);

  useEffect(() => {
    if (!isOpen || !initialCustomPrefix?.trim()) return;
    const p = initialCustomPrefix.trim().replace(/^\//, "");
    const prefix = p.endsWith("/") ? p : `${p}/`;
    if (isAllMirotechMediaPrefix(prefix)) {
      setNav({ prefix: ALL_MIROTECH_MEDIA_PREFIX, vault: "brightline" });
      return;
    }
    const vault: R2VaultId =
      prefix.startsWith("projects/") ||
      prefix.startsWith("journal/") ||
      prefix.startsWith("resume/") ||
      (prefix.startsWith("site/") && mediaRootProp === "mirotech")
        ? "mirotech-site"
        : "brightline";
    setNav({ prefix, vault });
  }, [isOpen, initialCustomPrefix, mediaRootProp]);

  // Library-home folder previews (batch, mixed vaults)
  useEffect(() => {
    if (!isOpen || !atLibraryHome) return;
    let cancelled = false;
    const foldersToSample = libraryRoots.filter((r) => !r.special);
    if (!foldersToSample.length) return;

    void (async () => {
      try {
        const res = await fetch("/api/admin/r2/folder-previews", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            folders: foldersToSample.map((r) => ({ prefix: r.prefix, vault: r.vault })),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          folders?: Array<{
            prefix: string;
            vault?: string;
            previewUrls?: string[];
            previewKind?: "image" | "video" | "empty";
          }>;
        };
        if (cancelled || !res.ok || !data.folders) return;
        const map: Record<string, { previewUrls: string[]; previewKind: "image" | "video" | "empty" }> =
          {};
        for (const f of data.folders) {
          const key = `${f.vault ?? "brightline"}:${f.prefix}`;
          map[key] = {
            previewUrls: f.previewUrls ?? [],
            previewKind: f.previewKind ?? "empty",
          };
        }
        setLibraryPreviews(map);
      } catch {
        /* non-blocking */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, atLibraryHome, libraryRoots]);

  const loadAllMirotechMedia = useCallback(async () => {
    setLoading(true);
    setError("");
    setPicks([]);
    setFolders([]);
    setSelected(new Set());
    setVisibleCount(PAGE_SIZE);
    setNextToken(null);
    try {
      const res = await fetch("/api/admin/r2/tools", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "mirotech-all-media", maxKeys: 2000, kind: "all" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        objects?: Array<{ key: string; sourceVault?: R2VaultId; kind?: string }>;
      };
      if (!res.ok || data.ok !== true) {
        setError(typeof data.error === "string" ? data.error : "Failed to load Mirotech media.");
        return;
      }
      const mediaPicks: R2BrowserPick[] = (data.objects ?? [])
        .map((o) => ({
          key: o.key.replace(/^\/+/, ""),
          vault: (o.sourceVault === "mirotech-site" ? "mirotech-site" : "brightline") as R2VaultId,
        }))
        .filter((p) => MEDIA_EXT.test(p.key));
      setPicks(mediaPicks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Mirotech media.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFolder = useCallback(
    async (location: NavLocation, appendToken?: string | null) => {
      if (!location.prefix || isAllMirotechMediaPrefix(location.prefix)) return;
      const appending = Boolean(appendToken);
      if (appending) setLoadingMore(true);
      else {
        setLoading(true);
        setError("");
        setPicks([]);
        setFolders([]);
        setSelected(new Set());
        setVisibleCount(PAGE_SIZE);
      }

      try {
        const prefix = location.prefix;
        const res = await fetch("/api/admin/r2/list", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prefix,
            maxKeys: 80,
            vault: location.vault,
            ...(appendToken ? { continuationToken: appendToken } : {}),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          folders?: Array<{
            prefix: string;
            previewUrls?: string[];
            previewKind?: "image" | "video" | "empty";
          }>;
          objects?: Array<{ key: string; name?: string; previewUrl?: string; kind?: string }>;
          nextContinuationToken?: string | null;
        };

        if (!res.ok) {
          if (
            location.vault === "mirotech-site" &&
            (res.status === 503 ||
              (typeof data.error === "string" &&
                data.error.toLowerCase().includes("not configured")))
          ) {
            setError("Mirotech CMS bucket is not configured on this environment.");
            setFolders([]);
            setPicks([]);
            return;
          }
          setError(data.error ?? "Failed to list folder.");
          return;
        }

        const childFolders: ListedFolder[] = (data.folders ?? []).map((f) => ({
          prefix: f.prefix,
          vault: location.vault,
          label: folderSegmentLabel(f.prefix),
          previewUrls: f.previewUrls,
          previewKind: f.previewKind,
        }));

        const mediaPicks: R2BrowserPick[] = (data.objects ?? [])
          .map((o) => ({ key: o.key.replace(/^\/+/, ""), vault: location.vault }))
          .filter((p) => MEDIA_EXT.test(p.key));

        if (appending) {
          setPicks((prev) => {
            const seen = new Set(prev.map(pickId));
            const next = [...prev];
            for (const p of mediaPicks) {
              if (!seen.has(pickId(p))) next.push(p);
            }
            return next;
          });
        } else {
          setFolders(childFolders);
          setPicks(mediaPicks);
        }
        setNextToken(data.nextContinuationToken ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load folder.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!isOpen || !nav?.prefix) return;
    if (isAllMirotechMediaPrefix(nav.prefix)) {
      void loadAllMirotechMedia();
      return;
    }
    void loadFolder(nav);
  }, [isOpen, nav, loadFolder, loadAllMirotechMedia]);

  async function enterFolder(folder: ListedFolder) {
    setSearch("");
    if (folder.special === "all-mirotech-media" || isAllMirotechMediaPrefix(folder.prefix)) {
      setNav({ prefix: ALL_MIROTECH_MEDIA_PREFIX, vault: "brightline" });
      return;
    }
    let prefix = folder.prefix;
    const preferred = preferredQualityChildPrefix(prefix, qualityFilter);
    if (preferred) {
      try {
        const probe = await fetch("/api/admin/r2/list", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prefix: preferred,
            maxKeys: 20,
            vault: folder.vault,
          }),
        });
        if (probe.ok) {
          const probeData = (await probe.json()) as {
            objects?: unknown[];
            folders?: unknown[];
          };
          if ((probeData.objects?.length ?? 0) > 0 || (probeData.folders?.length ?? 0) > 0) {
            prefix = preferred;
          }
        }
      } catch {
        /* stay on parent prefix */
      }
    }
    setNav({ prefix, vault: folder.vault });
  }

  function goBreadcrumb(prefix: string | null) {
    setSearch("");
    if (prefix === null || isAllMirotechMediaPrefix(prefix)) {
      if (isAllMirotechMediaPrefix(prefix)) {
        setNav({ prefix: ALL_MIROTECH_MEDIA_PREFIX, vault: "brightline" });
        return;
      }
      resetToLibrary();
      return;
    }
    const vault: R2VaultId =
      prefix.startsWith("projects/") ||
      prefix.startsWith("journal/") ||
      prefix.startsWith("resume/") ||
      (prefix.startsWith("site/") && mediaRoot === "mirotech")
        ? "mirotech-site"
        : "brightline";
    setNav({ prefix, vault });
  }

  const q = search.trim().toLowerCase();
  const filteredFolders = useMemo(() => {
    const source: ListedFolder[] = atLibraryHome
      ? libraryRoots.map((r) => {
          const previewKey = `${r.vault}:${r.prefix}`;
          const preview = libraryPreviews[previewKey];
          return {
            prefix: r.prefix,
            vault: r.vault,
            label: r.label,
            description: r.description,
            group: r.group,
            special: r.special,
            previewUrls: preview?.previewUrls ?? [],
            previewKind: preview?.previewKind ?? (r.special ? "empty" : "empty"),
          };
        })
      : folders;
    if (!q) return source;
    return source.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.prefix.toLowerCase().includes(q) ||
        (f.description?.toLowerCase().includes(q) ?? false)
    );
  }, [atLibraryHome, libraryRoots, folders, q, libraryPreviews]);

  const folderGroups = useMemo(() => {
    if (!atLibraryHome || mediaRoot !== "mirotech") {
      return [{ group: null as BrowseLibraryGroup | null, folders: filteredFolders }];
    }
    const order: BrowseLibraryGroup[] = ["portfolio", "t9", "cms", "all"];
    return order
      .map((group) => ({
        group,
        folders: filteredFolders.filter((f) => f.group === group),
      }))
      .filter((g) => g.folders.length > 0);
  }, [atLibraryHome, mediaRoot, filteredFolders]);

  const filteredPicks = useMemo(() => {
    let list = picks;
    if (qualityFilter !== "all") {
      const inQuality =
        Boolean(nav?.prefix) &&
        !inAllMirotech &&
        (nav!.prefix!.includes("/web_full/") ||
          nav!.prefix!.includes("/web_thumb/") ||
          nav!.prefix!.includes("/web_video/"));
      if (!inQuality) {
        list = filterBrowsePicks(list, qualityFilter, mediaRoot);
      }
    }
    if (!q) return list;
    return list.filter((p) => p.key.toLowerCase().includes(q));
  }, [picks, q, qualityFilter, nav, mediaRoot, inAllMirotech]);

  function toggleSelection(pick: R2BrowserPick) {
    const id = pickId(pick);
    setSelected((prev) => {
      const next = new Set(prev);
      if (mode === "single") {
        if (next.has(id)) next.clear();
        else return new Set([id]);
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    const visible = filteredPicks.slice(0, visibleCount);
    const ids = visible.map(pickId);
    if (ids.length > 0 && ids.every((id) => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(ids));
    }
  }

  async function handleAddSelected() {
    const toAdd = filteredPicks.filter((p) => selected.has(pickId(p)));
    if (toAdd.length === 0) return;
    const picksToUse = mode === "single" ? toAdd.slice(0, 1) : toAdd;
    setAdding(true);
    setError("");
    try {
      await onAddKeys(picksToUse);
      setSelected(new Set());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  }

  if (!isOpen) return null;

  const vaultLabel = mediaRoot === "mirotech" ? "Mirotech" : "Brightline";
  const isCmsFolder =
    Boolean(nav?.prefix) &&
    !inAllMirotech &&
    (nav?.vault === "mirotech-site" ||
      nav?.prefix?.startsWith("projects/") ||
      nav?.prefix?.startsWith("journal/") ||
      nav?.prefix?.startsWith("resume/"));

  function renderFolderCard(f: ListedFolder) {
    return (
      <button
        key={`${f.vault}:${f.prefix}`}
        type="button"
        onClick={() => void enterFolder(f)}
        className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-left transition hover:border-white/25 hover:bg-white/[0.06]"
      >
        <div className="p-2 pb-0">
          {f.special === "all-mirotech-media" ? (
            <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-violet-400/30 bg-violet-500/10 text-[0.65rem] uppercase tracking-[0.2em] text-violet-200/80">
              All media
            </div>
          ) : (
            <R2FolderPreviewThumb
              folder={{
                previewUrls: f.previewUrls ?? [],
                previewKind: f.previewKind,
              }}
            />
          )}
        </div>
        <span className="min-w-0 flex-1 px-3 pb-3 pt-2">
          <span className="block truncate text-sm font-medium text-white">{f.label}</span>
          <span className="mt-0.5 block truncate font-mono text-[11px] text-white/35">
            {f.description ?? f.prefix}
          </span>
          {vaultBadge(f)}
        </span>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:bg-black/60 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="r2-browser-title"
    >
      <div className="flex h-[100dvh] w-full max-h-[100dvh] flex-col overflow-hidden border-white/10 bg-[#0b0e12] shadow-xl sm:h-[90vh] sm:max-h-[90vh] sm:max-w-5xl sm:rounded-xl sm:border">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 id="r2-browser-title" className="font-display text-lg text-white">
              Browse R2
            </h2>
            <p className="mt-0.5 text-xs text-white/45">
              {vaultLabel} · open a folder to find images and videos
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/50">Vault</span>
            <select
              value={mediaRoot}
              onChange={(e) => {
                const next = e.target.value as T9MediaRoot;
                setMediaRoot(next);
                setQualityFilter(defaultFolderForRoot(next, initialPortfolioFolder));
                resetToLibrary();
              }}
              className="rounded border border-white/20 bg-black/40 px-2 py-1.5 text-sm text-white"
              aria-label="Media vault"
            >
              <option value="portfolio">Brightline portfolio</option>
              <option value="mirotech">Mirotech</option>
            </select>
            <span className="text-xs text-white/50">Prefer</span>
            <select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value as PortfolioFolderFilter)}
              className="rounded border border-white/20 bg-black/40 px-2 py-1.5 text-sm text-white"
              aria-label="Preferred quality folder"
              title="When opening a pillar folder, jump into this quality subfolder if present. CMS bucket keys ignore Prefer."
            >
              <option value="all">Any quality</option>
              <option value="web_full">web_full</option>
              <option value="web_thumb">web_thumb</option>
              <option value="web_video">web_video</option>
            </select>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={atLibraryHome ? "Filter folders…" : "Filter this folder…"}
            className="min-w-[12rem] flex-1 rounded border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-white placeholder:text-white/35"
          />
          {!atLibraryHome && filteredPicks.length > 0 ? (
            <button
              type="button"
              onClick={toggleAllVisible}
              className="text-sm text-white/70 hover:text-white"
            >
              Select visible
            </button>
          ) : null}
        </div>

        <nav
          className="flex flex-wrap items-center gap-1 border-b border-white/5 px-4 py-2 text-xs"
          aria-label="Folder path"
        >
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={`${c.label}-${i}`} className="flex items-center gap-1">
                {i > 0 ? <span className="text-white/25">/</span> : null}
                {isLast ? (
                  <span className="font-medium text-white/90">{c.label}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => goBreadcrumb(c.prefix)}
                    className="text-white/50 hover:text-white"
                  >
                    {c.label}
                  </button>
                )}
              </span>
            );
          })}
        </nav>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div
            ref={scrollRef}
            className="r2-modal-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:h-auto"
          >
            {error ? (
              <p className="mb-4 text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}

            {loading ? (
              <p className="text-sm text-white/50">Loading…</p>
            ) : (
              <>
                {atLibraryHome
                  ? folderGroups.map((g) => (
                      <section key={g.group ?? "default"} className="mb-6">
                        <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">
                          {g.group ? BROWSE_LIBRARY_GROUP_LABELS[g.group] : "Libraries"}
                        </h3>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                          {g.folders.map(renderFolderCard)}
                        </div>
                      </section>
                    ))
                  : filteredFolders.length > 0
                    ? (
                        <section className="mb-6">
                          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">
                            Folders
                          </h3>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                            {filteredFolders.map(renderFolderCard)}
                          </div>
                        </section>
                      )
                    : null}

                {!atLibraryHome ? (
                  <section>
                    <div className="mb-3 flex items-baseline justify-between gap-2">
                      <h3 className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">
                        Files
                        {filteredPicks.length > 0
                          ? ` · ${Math.min(visibleCount, filteredPicks.length)} of ${filteredPicks.length}`
                          : ""}
                      </h3>
                    </div>
                    {filteredPicks.length === 0 && filteredFolders.length === 0 ? (
                      <div className="space-y-2 text-sm text-white/45">
                        <p>No media in this folder.</p>
                        {isCmsFolder ? (
                          <p>
                            CMS bucket folders are often sparse — most Mirotech case-study images live under{" "}
                            <strong className="font-normal text-white/70">Portfolio</strong> or{" "}
                            <strong className="font-normal text-white/70">T9 Mirotech</strong>. Use{" "}
                            <strong className="font-normal text-white/70">All Mirotech media</strong> from the
                            library, or Prefer → <code className="text-white/60">Any quality</code>.
                          </p>
                        ) : qualityFilter !== "all" ? (
                          <p>
                            Try Prefer → Any quality, or open a{" "}
                            <code className="text-white/60">web_full</code> /{" "}
                            <code className="text-white/60">web_video</code> subfolder.
                          </p>
                        ) : (
                          <p>Go up a level or pick another library folder.</p>
                        )}
                      </div>
                    ) : filteredPicks.length === 0 ? (
                      <p className="text-sm text-white/40">Open a subfolder above to view files.</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
                          {filteredPicks.slice(0, visibleCount).map((pick) => {
                            const id = pickId(pick);
                            const isSelected = selected.has(id);
                            const preview = browsePreviewUrl(pick);
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => toggleSelection(pick)}
                                className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                                  isSelected
                                    ? "border-white ring-2 ring-white/30"
                                    : "border-white/10 hover:border-white/30"
                                }`}
                                title={`${pick.vault}: ${pick.key}`}
                              >
                                {isVideoKey(pick.key) ? (
                                  // eslint-disable-next-line jsx-a11y/media-has-caption
                                  <video
                                    src={preview}
                                    muted
                                    playsInline
                                    preload="metadata"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={preview}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover"
                                  />
                                )}
                                {pick.vault === "mirotech-site" ? (
                                  <span className="absolute left-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[9px] uppercase tracking-wide text-white/80">
                                    CMS
                                  </span>
                                ) : null}
                                {isSelected ? (
                                  <span className="absolute right-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-black">
                                    ✓
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                          {visibleCount < filteredPicks.length ? (
                            <button
                              type="button"
                              className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white/80 hover:bg-white/10 hover:text-white"
                              onClick={() =>
                                setVisibleCount((n) => Math.min(n + PAGE_SIZE, filteredPicks.length))
                              }
                            >
                              Show more
                            </button>
                          ) : null}
                          {nextToken && !inAllMirotech ? (
                            <button
                              type="button"
                              disabled={loadingMore}
                              className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50"
                              onClick={() => {
                                if (!nav?.prefix) return;
                                void loadFolder(nav, nextToken);
                              }}
                            >
                              {loadingMore ? "Loading…" : "Load more from R2"}
                            </button>
                          ) : null}
                        </div>
                      </>
                    )}
                  </section>
                ) : filteredFolders.length === 0 ? (
                  <p className="text-sm text-white/45">
                    {q ? "No folders match your filter." : "No libraries available for this vault."}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-between gap-2 border-t border-white/10 bg-[#0b0e12] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={resetToLibrary}
            className="text-xs uppercase tracking-[0.16em] text-white/45 hover:text-white/80"
            disabled={atLibraryHome}
          >
            {atLibraryHome ? "" : "← Library"}
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost text-sm">
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
                  ? confirmLabel ?? "Use selected"
                  : `Add ${selected.size} selected`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
