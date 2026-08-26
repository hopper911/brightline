"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import R2VideoEncodePanel from "@/components/admin/R2VideoEncodePanel";
import { externalLinkProps } from "@/lib/external-link";
import type { R2VaultId } from "@/lib/r2-vaults-shared";
import {
  defaultPrefixForVault,
  inferVaultFromPrefix,
  isR2VaultId,
} from "@/lib/r2-vaults-shared";
import { isT9WebVideoPrefix } from "@/lib/video-port/parse-prefix";

type Root = { id: string; label: string; prefix: string };

type FolderPreview = {
  prefix: string;
  previewUrls: string[];
  previewKind: "image" | "video" | "empty";
};

type R2Object = {
  key: string;
  name: string;
  size: number;
  sizeLabel: string;
  lastModified: string | null;
  quality: string;
  qualityLabel: string;
  kind: "image" | "video" | "other";
  previewUrl: string;
  pairKey: string | null;
  pairPresent: boolean;
};

type Usage = {
  key: string;
  totalRefs: number;
  mediaAssets: Array<{ id: string; field: string; projectIds: string[] }>;
  galleryImages: Array<{ id: string; galleryId: string; field: string; galleryTitle: string | null }>;
  galleryVideos: Array<{ id: string; galleryId: string; galleryTitle: string | null; field: string }>;
  deliveryItems: Array<{ id: string; deliveryPackageId: string }>;
  other?: Array<{ source: string; id: string; field: string }>;
};

type SummaryRow = {
  id: string;
  label: string;
  prefix: string;
  objectCount: number;
  bytes: number;
  sizeLabel: string;
  truncated: boolean;
};

type HygieneItem = {
  key: string;
  name: string;
  sizeLabel: string;
  previewUrl: string;
};

type QualityFilter = "all" | "full" | "thumb" | "low_res" | "derivative" | "unclassified";
type KindFilter = "all" | "image" | "video" | "other";
type ViewMode = "grid" | "list";
type ToolOp = "orphans" | "pairs" | "summary" | "duplicates" | "heavy";

const PAGE_SIZE = 60;
const SINGLE_PUT_MAX = 3.5 * 1024 * 1024;

function qualityBadgeClass(q: string): string {
  switch (q) {
    case "full":
      return "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30";
    case "thumb":
      return "bg-sky-500/20 text-sky-200 ring-sky-400/30";
    case "low_res":
      return "bg-amber-500/20 text-amber-200 ring-amber-400/30";
    case "derivative":
      return "bg-violet-500/20 text-violet-200 ring-violet-400/30";
    default:
      return "bg-white/10 text-white/55 ring-white/15";
  }
}

function folderLabel(prefix: string): string {
  const parts = prefix.replace(/\/$/, "").split("/");
  return parts[parts.length - 1] || prefix;
}

function FolderPreviewThumb({ folder }: { folder: FolderPreview }) {
  const urls = folder.previewUrls.slice(0, 4);
  if (urls.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.03] text-[0.65rem] uppercase tracking-[0.2em] text-white/40">
        {folder.previewKind === "video" ? "Video" : "Empty"}
      </div>
    );
  }
  if (folder.previewKind === "video") {
    return (
      <div className="relative aspect-square overflow-hidden rounded-lg bg-black/60">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video src={urls[0]} muted playsInline preload="metadata" className="h-full w-full object-cover" />
      </div>
    );
  }
  if (urls.length === 1) {
    return (
      <div className="aspect-square overflow-hidden rounded-lg bg-black/60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }
  return (
    <div
      className={`grid aspect-square gap-0.5 overflow-hidden rounded-lg bg-black/60 ${
        urls.length === 2 ? "grid-cols-2 grid-rows-1" : "grid-cols-2 grid-rows-2"
      }`}
    >
      {urls.map((url) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url} src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ))}
    </div>
  );
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Direct PUT or multipart upload into any vault without WebP compact. */
async function uploadDirectToVault(file: File, destPrefix: string, vault: R2VaultId) {
  const contentType = file.type || "application/octet-stream";

  if (file.size <= SINGLE_PUT_MAX) {
    const initRes = await fetch("/api/admin/r2/upload-url", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prefix: destPrefix,
        fileName: file.name,
        contentType,
        vault,
      }),
    });
    const init = await readJson(initRes);
    if (!initRes.ok || typeof init.uploadUrl !== "string" || typeof init.key !== "string") {
      throw new Error(typeof init.error === "string" ? init.error : "Could not start upload.");
    }
    const headers =
      init.headers && typeof init.headers === "object"
        ? (init.headers as Record<string, string>)
        : {};
    const putRes = await fetch(init.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": contentType, ...headers },
    });
    if (!putRes.ok) {
      throw new Error(`Upload to R2 failed (${putRes.status}).`);
    }
    return;
  }

  const initRes = await fetch("/api/admin/r2/multipart/init", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prefix: destPrefix,
      fileName: file.name,
      contentType,
      bytes: file.size,
      vault,
    }),
  });
  const init = await readJson(initRes);
  if (
    !initRes.ok ||
    typeof init.stagingPrefix !== "string" ||
    typeof init.key !== "string"
  ) {
    throw new Error(typeof init.error === "string" ? init.error : "Could not start chunked upload.");
  }
  const stagingPrefix = init.stagingPrefix;
  const key = init.key;
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
      form.set("vault", vault);
      const partRes = await fetch("/api/admin/r2/multipart/part", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const partData = await readJson(partRes);
      if (!partRes.ok || partData.ok !== true) {
        throw new Error(typeof partData.error === "string" ? partData.error : `Chunk ${i + 1} failed.`);
      }
    }
    const doneRes = await fetch("/api/admin/r2/multipart/complete", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        stagingPrefix,
        contentType,
        totalParts,
        vault,
      }),
    });
    const done = await readJson(doneRes);
    if (!doneRes.ok || done.ok !== true) {
      throw new Error(typeof done.error === "string" ? done.error : "Could not assemble upload.");
    }
  } catch (err) {
    await fetch("/api/admin/r2/multipart/complete", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        stagingPrefix,
        totalParts,
        vault,
        abort: true,
      }),
    }).catch(() => undefined);
    throw err;
  }
}

async function uploadCompactFile(file: File, destPrefix: string, vault: R2VaultId) {
  if (vault === "mirotech-site") {
    await uploadDirectToVault(file, destPrefix, vault);
    return;
  }
  const isVideo = /^video\//i.test(file.type) || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
  if (isVideo && file.size > SINGLE_PUT_MAX) {
    throw new Error(
      "Videos over 3.5MB need Encode video (1080p H.264). Use Upload & encode video above."
    );
  }
  if (file.size <= SINGLE_PUT_MAX) {
    const form = new FormData();
    form.set("file", file);
    form.set("prefix", destPrefix);
    form.set("vault", vault);
    const res = await fetch("/api/admin/r2/compact-upload", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const data = await readJson(res);
    if (!res.ok || data.ok !== true) {
      throw new Error(typeof data.error === "string" ? data.error : `Upload failed (${res.status}).`);
    }
    return;
  }

  const contentType = file.type || "image/jpeg";
  const initRes = await fetch("/api/admin/image-port/multipart/init", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType,
      pillar: "arc",
      bytes: file.size,
    }),
  });
  const init = await readJson(initRes);
  if (!initRes.ok || typeof init.tempKey !== "string" || typeof init.stagingPrefix !== "string") {
    throw new Error(typeof init.error === "string" ? init.error : "Could not start chunked upload.");
  }
  const partSize = typeof init.partSize === "number" && init.partSize > 0 ? init.partSize : 3 * 1024 * 1024;
  const totalParts = Math.max(1, Math.ceil(file.size / partSize));
  try {
    for (let i = 0; i < totalParts; i++) {
      const blob = file.slice(i * partSize, Math.min(file.size, (i + 1) * partSize));
      const form = new FormData();
      form.set("stagingPrefix", init.stagingPrefix);
      form.set("partNumber", String(i + 1));
      form.set("chunk", blob, `part-${i + 1}`);
      const partRes = await fetch("/api/admin/image-port/multipart/part", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const partData = await readJson(partRes);
      if (!partRes.ok || partData.ok !== true) {
        throw new Error(typeof partData.error === "string" ? partData.error : `Chunk ${i + 1} failed.`);
      }
    }
    const doneRes = await fetch("/api/admin/image-port/multipart/complete", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tempKey: init.tempKey,
        stagingPrefix: init.stagingPrefix,
        contentType,
        totalParts,
      }),
    });
    const done = await readJson(doneRes);
    if (!doneRes.ok || done.ok !== true) {
      throw new Error(typeof done.error === "string" ? done.error : "Could not assemble upload.");
    }
  } catch (err) {
    await fetch("/api/admin/image-port/multipart/complete", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tempKey: init.tempKey,
        stagingPrefix: init.stagingPrefix,
        totalParts,
        abort: true,
      }),
    }).catch(() => undefined);
    throw err;
  }

  const compactRes = await fetch("/api/admin/r2/compact-upload", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prefix: destPrefix,
      tempKey: init.tempKey,
      fileName: file.name,
      vault: "brightline",
    }),
  });
  const compact = await readJson(compactRes);
  if (!compactRes.ok || compact.ok !== true) {
    throw new Error(typeof compact.error === "string" ? compact.error : "Compact failed.");
  }
}

function normalizePrefixParam(raw: string): string {
  const cleaned = raw.trim().replace(/^\/+/, "");
  if (!cleaned) return "";
  return cleaned.endsWith("/") ? cleaned : `${cleaned}/`;
}

function buildR2Href(
  vault: R2VaultId,
  prefix: string,
  kind: KindFilter,
  encode: boolean
): string {
  const params = new URLSearchParams();
  if (vault !== "brightline") params.set("vault", vault);
  const cleanPrefix = prefix.replace(/^\/+/, "").replace(/\/$/, "");
  if (cleanPrefix) params.set("prefix", `${cleanPrefix}/`);
  if (kind !== "all") params.set("kind", kind);
  if (encode) params.set("mode", "encode");
  const qs = params.toString();
  return qs ? `/admin/r2?${qs}` : "/admin/r2";
}

export default function R2ManagerClient({
  initialPrefix = "",
  initialVault = "brightline",
  initialMode,
  initialKindFilter: initialKind = "all",
}: {
  initialPrefix?: string;
  initialVault?: R2VaultId;
  initialMode?: "encode";
  initialKindFilter?: KindFilter;
}) {
  const router = useRouter();
  const normalizedInitialPrefix = normalizePrefixParam(initialPrefix);
  const inferredVault = inferVaultFromPrefix(normalizedInitialPrefix);
  const resolvedInitialVault: R2VaultId =
    inferredVault ?? (isR2VaultId(initialVault) ? initialVault : "brightline");

  const [prefix, setPrefix] = useState(normalizedInitialPrefix);
  const [vault, setVault] = useState<R2VaultId>(resolvedInitialVault);
  const vaultRef = useRef<R2VaultId>(resolvedInitialVault);
  vaultRef.current = vault;
  const [siteWideBrowse, setSiteWideBrowse] = useState(false);
  const [encodeOpen, setEncodeOpen] = useState(initialMode === "encode");
  const [roots, setRoots] = useState<Root[]>([]);
  const [folders, setFolders] = useState<FolderPreview[]>([]);
  const [objects, setObjects] = useState<R2Object[]>([]);
  const [usedMap, setUsedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>("grid");
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>(initialKind);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<R2Object | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [moveDest, setMoveDest] = useState("");
  const [showMovePicker, setShowMovePicker] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<SummaryRow[] | null>(null);
  const [orphanKeys, setOrphanKeys] = useState<string[] | null>(null);
  const [heavyItems, setHeavyItems] = useState<HygieneItem[] | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<Array<{ stem: string; keys: string[] }> | null>(
    null
  );
  const [pairReport, setPairReport] = useState<{
    missingThumb: string[];
    missingFull: string[];
    missingPoster: string[];
    missingVideo: string[];
  } | null>(null);
  const [orderedKeys, setOrderedKeys] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingMore = useRef(false);

  const syncUrl = useCallback(
    (nextVault: R2VaultId, nextPrefix: string, kind: KindFilter, encode: boolean) => {
      router.replace(buildR2Href(nextVault, nextPrefix, kind, encode), { scroll: false });
    },
    [router]
  );

  const crumbs = useMemo(() => {
    if (!prefix) return [{ label: "Root", prefix: "" }];
    const parts = prefix.replace(/\/$/, "").split("/");
    const out: Array<{ label: string; prefix: string }> = [{ label: "Root", prefix: "" }];
    let acc = "";
    for (const part of parts) {
      acc += `${part}/`;
      out.push({ label: part, prefix: acc });
    }
    return out;
  }, [prefix]);

  const loadUsed = useCallback(async (keys: string[]) => {
    if (!keys.length) return;
    try {
      const res = await fetch("/api/admin/r2/usage-batch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys, vault: vaultRef.current }),
      });
      const data = (await res.json()) as { ok?: boolean; used?: Record<string, boolean> };
      if (res.ok && data.used) {
        setUsedMap((prev) => ({ ...prev, ...data.used }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(
    async (nextPrefix: string, token?: string | null, append = false) => {
      if (append) loadingMore.current = true;
      setSiteWideBrowse(false);
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/r2/list", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prefix: nextPrefix,
            maxKeys: PAGE_SIZE,
            continuationToken: token || undefined,
            vault: vaultRef.current,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          warning?: string;
          prefixes?: string[];
          folders?: FolderPreview[];
          objects?: R2Object[];
          roots?: Root[];
          nextContinuationToken?: string | null;
        };
        if (!res.ok || !data.ok) throw new Error(data.error || "List failed");
        setPrefix(nextPrefix);
        if (!append) {
          syncUrl(vaultRef.current, nextPrefix, kindFilter, encodeOpen);
        }
        if (data.roots) setRoots(data.roots);
        const nextFolders =
          data.folders ??
          (data.prefixes ?? []).map((p) => ({
            prefix: p,
            previewUrls: [] as string[],
            previewKind: "empty" as const,
          }));
        setFolders(nextFolders);
        const incoming = data.objects ?? [];
        setObjects((prev) => (append ? [...prev, ...incoming] : incoming));
        setNextToken(data.nextContinuationToken ?? null);
        if (data.warning) setStatus(data.warning);
        if (!append) {
          setSelected(new Set());
          setOrderedKeys(incoming.map((o) => o.key));
          setQualityFilter("all");
          setSearch("");
          setUsedMap({});
        } else {
          setOrderedKeys((prev) => [...prev, ...incoming.map((o) => o.key)]);
        }
        void loadUsed(incoming.map((o) => o.key));
      } catch (err) {
        setError(err instanceof Error ? err.message : "List failed");
      } finally {
        setLoading(false);
        loadingMore.current = false;
      }
    },
    [encodeOpen, kindFilter, loadUsed, syncUrl]
  );

  const loadSiteVideos = useCallback(async () => {
    setSiteWideBrowse(true);
    setKindFilter("video");
    setLoading(true);
    setError("");
    setPrefix("");
    setFolders([]);
    syncUrl(vaultRef.current, "", "video", encodeOpen);
    try {
      const res = await fetch("/api/admin/r2/tools", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "videos",
          maxKeys: 5000,
          vault: vaultRef.current,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        objects?: R2Object[];
        truncated?: boolean;
        scanned?: number;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || "Video scan failed");
      const incoming = data.objects ?? [];
      setObjects(incoming);
      setNextToken(null);
      setSelected(new Set());
      setOrderedKeys(incoming.map((o) => o.key));
      setUsedMap({});
      setStatus(
        `Site-wide videos: ${incoming.length}${data.truncated ? " (truncated — narrow prefix to see more)" : ""}.`
      );
      void loadUsed(incoming.map((o) => o.key));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Video scan failed");
    } finally {
      setLoading(false);
    }
  }, [encodeOpen, loadUsed, syncUrl]);

  useEffect(() => {
    if (initialKind === "video" && !normalizedInitialPrefix) {
      void loadSiteVideos();
    } else {
      void load(normalizedInitialPrefix || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (!nextToken || loading || loadingMore.current) return;
        void load(prefix, nextToken, true);
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [load, prefix, nextToken, loading]);

  const filteredFolders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter(
      (f) =>
        f.prefix.toLowerCase().includes(q) || folderLabel(f.prefix).toLowerCase().includes(q)
    );
  }, [folders, search]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byKey = new Map(objects.map((o) => [o.key, o]));
    const order = orderedKeys.filter((k) => byKey.has(k));
    const rest = objects.filter((o) => !order.includes(o.key)).map((o) => o.key);
    return [...order, ...rest]
      .map((k) => byKey.get(k)!)
      .filter((o) => {
        if (qualityFilter !== "all" && o.quality !== qualityFilter) return false;
        if (kindFilter !== "all" && o.kind !== kindFilter) return false;
        if (q && !o.name.toLowerCase().includes(q) && !o.key.toLowerCase().includes(q)) return false;
        return true;
      });
  }, [objects, orderedKeys, qualityFilter, kindFilter, search]);

  const summaryByPrefix = useMemo(() => {
    const map = new Map<string, SummaryRow>();
    for (const row of summary ?? []) map.set(row.prefix, row);
    return map;
  }, [summary]);

  const moveTargets = useMemo(() => {
    const set = new Set<string>();
    for (const r of roots) set.add(r.prefix);
    for (const f of folders) set.add(f.prefix);
    if (prefix) set.add(prefix);
    return [...set];
  }, [roots, folders, prefix]);

  function toggleSelect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function openUsage(obj: R2Object) {
    setPreview(obj);
    setUsage(null);
    setUsageLoading(true);
    setRenameValue(obj.name);
    try {
      const res = await fetch(`/api/admin/r2/usage?key=${encodeURIComponent(obj.key)}&vault=${encodeURIComponent(vaultRef.current)}`, {
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; usage?: Usage };
      if (res.ok && data.usage) setUsage(data.usage);
    } finally {
      setUsageLoading(false);
    }
  }

  async function runMove(destOverride?: string) {
    const keys = [...selected];
    const dest = (destOverride ?? moveDest).trim();
    if (!keys.length || !dest) {
      setError("Pick a destination folder.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/r2/move", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keys,
          destinationPrefix: dest.endsWith("/") ? dest : `${dest}/`,
          vault: vaultRef.current,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; moved?: number; failed?: number };
      if (!res.ok) throw new Error(data.error || "Move failed");
      setStatus(`Moved ${data.moved ?? 0}${data.failed ? `, ${data.failed} failed` : ""}.`);
      setSelected(new Set());
      setShowMovePicker(false);
      await load(prefix);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Move failed");
    } finally {
      setBusy(false);
    }
  }

  async function runRename() {
    if (!preview) return;
    const nextName = renameValue.trim();
    if (!nextName || nextName === preview.name) return;
    const parent = preview.key.slice(0, preview.key.lastIndexOf("/") + 1);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/r2/move", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ from: preview.key, to: `${parent}${nextName}` }],
          vault: vaultRef.current,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Rename failed");
      setStatus(`Renamed to ${nextName}`);
      setPreview(null);
      await load(prefix);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setBusy(false);
    }
  }

  async function runDelete(force = false, keysOverride?: string[]) {
    const keys = keysOverride ?? (preview && selected.size === 0 ? [preview.key] : [...selected]);
    if (!keys.length) return;
    const usedSelected = keys.filter((k) => usedMap[k]);
    if (!force) {
      if (keys.length > 1) {
        const typed = window.prompt(`Type DELETE to remove ${keys.length} objects from R2:`);
        if (typed !== "DELETE") return;
      } else if (!window.confirm(`Delete ${keys[0]} from R2?`)) {
        return;
      }
      if (usedSelected.length && !window.confirm(`${usedSelected.length} selected file(s) are still used in the database.`)) {
        return;
      }
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/r2/delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keys,
          force,
          confirm: keys.length > 1 ? "DELETE" : undefined,
          vault: vaultRef.current,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; deleted?: string[] };
      if (res.status === 409) {
        setBusy(false);
        const okForce = window.confirm(`${data.error}\n\nForce delete anyway?`);
        if (okForce) await runDelete(true, keys);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setStatus(`Deleted ${data.deleted?.length ?? keys.length} object(s).`);
      setSelected(new Set());
      setPreview(null);
      await load(prefix);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function runCompactSelected() {
    const keys = preview && selected.size === 0 ? [preview.key] : [...selected];
    const images = keys.filter((k) => {
      const o = objects.find((x) => x.key === k);
      return !o || o.kind === "image";
    });
    if (!images.length) return;
    if (!window.confirm(`Compact ${images.length} image(s) to WebP? Originals are replaced.`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/r2/compact-selected", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: images, vault: vaultRef.current }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; compacted?: number; failed?: number };
      if (!res.ok) throw new Error(data.error || "Compact failed");
      setStatus(`Compacted ${data.compacted ?? 0}${data.failed ? `, ${data.failed} failed` : ""}.`);
      setSelected(new Set());
      setPreview(null);
      await load(prefix);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compact failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    if (!prefix) {
      setError("Open a folder before uploading.");
      return;
    }
    setBusy(true);
    setError("");
    let okCount = 0;
    try {
      for (const file of Array.from(files)) {
        await uploadCompactFile(file, prefix, vaultRef.current);
        okCount += 1;
      }
      setStatus(
        vaultRef.current === "mirotech-site"
          ? `Uploaded ${okCount} file(s) to Mirotech site.`
          : `Uploaded ${okCount} compact file(s). JPEG/PNG converted to WebP.`
      );
      await load(prefix);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function runTool(op: ToolOp) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/r2/tools", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op,
          prefix: prefix || (vaultRef.current === "mirotech-site" ? "projects/" : "portfolio/"),
          maxKeys: 3000,
          vault: vaultRef.current,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        summary?: SummaryRow[];
        orphans?: HygieneItem[];
        heavy?: HygieneItem[];
        duplicates?: Array<{ stem: string; keys: string[] }>;
        missingThumb?: string[];
        missingFull?: string[];
        missingPoster?: string[];
        missingVideo?: string[];
        scanned?: number;
        truncated?: boolean;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || "Tool failed");
      const trunc = data.truncated ? " (truncated)" : "";
      if (op === "summary") {
        setSummary(data.summary ?? []);
        setStatus("Storage summary loaded.");
      } else if (op === "orphans") {
        setOrphanKeys((data.orphans ?? []).map((o) => o.key));
        setHeavyItems(null);
        setDuplicateGroups(null);
        setStatus(`Unused: ${(data.orphans ?? []).length} of ${data.scanned ?? 0}${trunc}.`);
      } else if (op === "heavy") {
        setHeavyItems(data.heavy ?? []);
        setOrphanKeys(null);
        setDuplicateGroups(null);
        setStatus(`Heavy files: ${(data.heavy ?? []).length} of ${data.scanned ?? 0}${trunc}.`);
      } else if (op === "duplicates") {
        setDuplicateGroups(data.duplicates ?? []);
        setOrphanKeys(null);
        setHeavyItems(null);
        setStatus(`Duplicate groups: ${(data.duplicates ?? []).length}${trunc}.`);
      } else {
        setPairReport({
          missingThumb: data.missingThumb ?? [],
          missingFull: data.missingFull ?? [],
          missingPoster: data.missingPoster ?? [],
          missingVideo: data.missingVideo ?? [],
        });
        setStatus("Pair scan complete.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tool failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/40">Assets</p>
          <h1 className="mt-1 font-display text-3xl text-white">R2 storage</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/55">
            Combined media hub — images, videos, and all storage-connected assets for Brightline and
            Mirotech site buckets. Buckets stay separate; switch vault below. Brightline compacts
            images to WebP; use <strong className="font-normal text-white/75">Encode video</strong>{" "}
            for T9 web clips.
          </p>
          {isT9WebVideoPrefix(prefix) ? (
            <p className="mt-1 text-xs text-white/45">Video Port destination folder</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-full border border-white/15 p-0.5">
            {(
              [
                { id: "brightline" as const, label: "Brightline" },
                { id: "mirotech-site" as const, label: "Mirotech site" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={busy || loading}
                onClick={() => {
                  if (opt.id === vault) return;
                  setVault(opt.id);
                  vaultRef.current = opt.id;
                  setSummary(null);
                  setOrphanKeys(null);
                  setHeavyItems(null);
                  setDuplicateGroups(null);
                  setPairReport(null);
                  setPreview(null);
                  setStatus("");
                  setSiteWideBrowse(false);
                  void load(defaultPrefixForVault(opt.id));
                }}
                className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.14em] disabled:opacity-40 ${
                  vault === opt.id
                    ? "bg-white/15 text-white"
                    : "text-white/55 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void runTool("summary")}>
            Summary
          </button>
          {vault === "brightline" ? (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => setEncodeOpen((v) => !v)}
            >
              {encodeOpen ? "Hide encode" : "Encode video"}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !prefix}
            onClick={() => fileInputRef.current?.click()}
          >
            {vault === "mirotech-site" ? "Upload" : "Upload compact"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
            onChange={(e) => void uploadFiles(e.target.files)}
          />
        </div>
      </div>

      {vault === "brightline" && encodeOpen ? (
        <R2VideoEncodePanel
          inline
          prefix={prefix}
          onEncoded={() => void load(prefix)}
        />
      ) : null}

      {vault === "brightline" && prefix.startsWith("site/backgrounds/") ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/65">
          Manage background video library and page assignments in{" "}
          <Link href="/admin/background-videos" className="text-white underline hover:text-white/90">
            Background videos
          </Link>
          . Raw files in this folder can still be browsed, uploaded, and deleted here.
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.16em] disabled:opacity-40 ${
            kindFilter === "video"
              ? "border-white/40 bg-white/10 text-white"
              : "border-white/15 text-white/70 hover:border-white/35 hover:text-white"
          }`}
          disabled={busy}
          onClick={() => {
            if (kindFilter === "video" && (siteWideBrowse || !prefix)) {
              setKindFilter("all");
              setSiteWideBrowse(false);
              syncUrl(vaultRef.current, prefix, "all", encodeOpen);
              if (!prefix) void load("");
              return;
            }
            if (!prefix) {
              void loadSiteVideos();
              return;
            }
            setKindFilter("video");
            syncUrl(vaultRef.current, prefix, "video", encodeOpen);
          }}
        >
          Videos
        </button>
        <button
          type="button"
          className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.16em] disabled:opacity-40 ${
            siteWideBrowse
              ? "border-white/40 bg-white/10 text-white"
              : "border-white/15 text-white/70 hover:border-white/35 hover:text-white"
          }`}
          disabled={busy}
          onClick={() => void loadSiteVideos()}
        >
          All site videos
        </button>
        {(["orphans", "duplicates", "heavy", "pairs"] as const).map((op) => (
          <button
            key={op}
            type="button"
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-white/70 hover:border-white/35 hover:text-white disabled:opacity-40"
            disabled={busy || !prefix}
            onClick={() => void runTool(op)}
          >
            {op === "orphans" ? "Unused" : op === "duplicates" ? "Duplicates" : op === "heavy" ? "Heavy" : "Missing pairs"}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      {status ? <p className="mt-2 text-sm text-white/55">{status}</p> : null}

      {summary ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summary.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => void load(row.prefix)}
              className="rounded-xl border border-white/10 bg-black/40 p-4 text-left hover:border-white/25"
            >
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-white/40">{row.label}</p>
              <p className="mt-2 text-lg text-white">{row.objectCount.toLocaleString()} objects</p>
              <p className="text-sm text-white/55">
                {row.sizeLabel}
                {row.truncated ? " · truncated" : ""}
              </p>
            </button>
          ))}
        </div>
      ) : null}

      {(orphanKeys || heavyItems || duplicateGroups || pairReport) && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
          {orphanKeys ? (
            <div className="flex flex-wrap items-center gap-3">
              <span>{orphanKeys.length} unused in this prefix</span>
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(new Set(orphanKeys))}>
                Select unused
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setOrphanKeys(null)}>
                Dismiss
              </button>
            </div>
          ) : null}
          {heavyItems ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span>{heavyItems.length} heavy files</span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setSelected(new Set(heavyItems.map((h) => h.key)))}
                >
                  Select heavy
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setHeavyItems(null)}>
                  Dismiss
                </button>
              </div>
              <ul className="max-h-40 overflow-y-auto text-xs text-white/50">
                {heavyItems.slice(0, 40).map((h) => (
                  <li key={h.key} className="truncate">
                    {h.sizeLabel} · {h.key}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {duplicateGroups ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span>{duplicateGroups.length} duplicate groups</span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setSelected(new Set(duplicateGroups.flatMap((g) => g.keys)))}
                >
                  Select all dupes
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setDuplicateGroups(null)}>
                  Dismiss
                </button>
              </div>
              <ul className="max-h-40 overflow-y-auto text-xs text-white/50">
                {duplicateGroups.slice(0, 20).map((g) => (
                  <li key={g.stem}>
                    {g.stem} · {g.keys.length} copies
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {pairReport ? (
            <div className="mt-2 space-y-1">
              <p>Full without thumb: {pairReport.missingThumb.length}</p>
              <p>Thumb without full: {pairReport.missingFull.length}</p>
              <p>Video without poster: {pairReport.missingPoster.length}</p>
              <p>Poster without video: {pairReport.missingVideo.length}</p>
              <button type="button" className="btn btn-ghost mt-2" onClick={() => setPairReport(null)}>
                Dismiss
              </button>
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr] lg:items-start">
        <aside
          data-lenis-prevent
          className="flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)]"
        >
          <p className="shrink-0 text-[0.65rem] uppercase tracking-[0.22em] text-white/40">Prefixes</p>
          <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1">
            <button
              type="button"
              onClick={() => void load("")}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                !prefix ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              Root
            </button>
            {roots.map((r) => {
              const stats = summaryByPrefix.get(r.prefix);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => void load(r.prefix)}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                    prefix === r.prefix || prefix.startsWith(r.prefix)
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="block truncate">{r.label}</span>
                  {stats ? (
                    <span className="mt-0.5 block text-[0.65rem] text-white/35">
                      {stats.objectCount.toLocaleString()} · {stats.sizeLabel}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
            <span className="rounded-full border border-white/15 px-2 py-0.5 uppercase tracking-[0.14em] text-white/70">
              {vault === "mirotech-site" ? "Mirotech site bucket" : "Brightline bucket"}
            </span>
            {siteWideBrowse ? (
              <span className="text-white/60">Site-wide video browse</span>
            ) : null}
            {crumbs.map((c, i) => (
              <span key={c.prefix || "root"} className="flex items-center gap-2">
                {i > 0 ? <span>/</span> : null}
                <button type="button" className="hover:text-white" onClick={() => void load(c.prefix)}>
                  {c.label}
                </button>
              </span>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              className="min-w-[180px] flex-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
              placeholder="Search folders and files…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value as QualityFilter)}
            >
              <option value="all">All quality</option>
              <option value="full">Full</option>
              <option value="thumb">Thumb</option>
              <option value="low_res">Low-res</option>
              <option value="derivative">Derivative</option>
              <option value="unclassified">Other</option>
            </select>
            <select
              className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as KindFilter)}
            >
              <option value="all">All kinds</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="other">Other</option>
            </select>
            <button
              type="button"
              className={`rounded-xl border px-3 py-2 text-xs uppercase tracking-wider ${
                view === "grid" ? "border-white/40 text-white" : "border-white/15 text-white/50"
              }`}
              onClick={() => setView("grid")}
            >
              Grid
            </button>
            <button
              type="button"
              className={`rounded-xl border px-3 py-2 text-xs uppercase tracking-wider ${
                view === "list" ? "border-white/40 text-white" : "border-white/15 text-white/50"
              }`}
              onClick={() => setView("list")}
            >
              List
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void load(prefix)}>
              Refresh
            </button>
          </div>

          {selected.size > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3">
              <span className="text-sm text-white">{selected.size} selected</span>
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(new Set(filtered.map((o) => o.key)))}>
                Select visible
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(new Set())}>
                Clear
              </button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setShowMovePicker(true)}>
                Move
              </button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void runCompactSelected()}>
                Compact to WebP
              </button>
              <button type="button" className="btn btn-ghost text-red-300" disabled={busy} onClick={() => void runDelete()}>
                Delete
              </button>
            </div>
          ) : null}

          {showMovePicker ? (
            <div className="mt-4 rounded-xl border border-white/15 bg-black/50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/45">Move to folder</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {moveTargets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 hover:border-white/40"
                    onClick={() => void runMove(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-sm text-white"
                  placeholder="Custom prefix…"
                  value={moveDest}
                  onChange={(e) => setMoveDest(e.target.value)}
                />
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void runMove()}>
                  Move
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowMovePicker(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {loading && objects.length === 0 && folders.length === 0 ? (
            <p className="mt-10 text-sm text-white/45">Loading…</p>
          ) : filteredFolders.length === 0 && filtered.length === 0 ? (
            <p className="mt-10 text-sm text-white/45">
              {folders.length > 0 || objects.length > 0
                ? "No folders or files match the current filters."
                : prefix
                  ? "This folder is empty."
                  : "No prefixes found in this bucket."}
            </p>
          ) : (
            <>
              {filteredFolders.length > 0 ? (
                <div className="mt-6">
                  <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/40">Folders</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                    {filteredFolders.map((f) => {
                      const stats = summaryByPrefix.get(f.prefix);
                      return (
                        <button
                          key={f.prefix}
                          type="button"
                          onClick={() => void load(f.prefix)}
                          className="overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4 text-left transition hover:border-white/30 hover:bg-white/[0.06]"
                        >
                          <FolderPreviewThumb folder={f} />
                          <p className="mt-3 truncate text-sm text-white">{folderLabel(f.prefix)}/</p>
                          <p className="mt-1 text-[0.65rem] text-white/40">
                            {stats
                              ? `${stats.objectCount.toLocaleString()} · ${stats.sizeLabel}`
                              : f.previewUrls.length > 0
                                ? "Folder"
                                : "Empty"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {filtered.length > 0 ? (
                <div className="mt-8">
                  <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/40">
                    Files ({filtered.length}
                    {objects.length !== filtered.length ? ` of ${objects.length}` : ""})
                  </p>
                  {view === "grid" ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                      {filtered.map((o) => (
                        <div
                          key={o.key}
                          className={`group relative overflow-hidden rounded-xl border bg-black/40 ${
                            selected.has(o.key) ? "border-white/50" : "border-white/10 hover:border-white/25"
                          }`}
                        >
                          <button
                            type="button"
                            className="absolute left-2 top-2 z-10 h-5 w-5 rounded border border-white/40 bg-black/60"
                            onClick={() => toggleSelect(o.key)}
                            aria-label="Select"
                          >
                            {selected.has(o.key) ? (
                              <span className="block text-center text-[10px] text-white">✓</span>
                            ) : null}
                          </button>
                          <span
                            className={`absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-[0.55rem] uppercase tracking-wider ${
                              usedMap[o.key]
                                ? "bg-emerald-500/25 text-emerald-100"
                                : "bg-white/10 text-white/50"
                            }`}
                          >
                            {usedMap[o.key] ? "Used" : "Unused"}
                          </span>
                          <button type="button" className="block w-full text-left" onClick={() => void openUsage(o)}>
                            <div className="aspect-square bg-black/60">
                              {o.kind === "image" ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={o.previewUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs uppercase tracking-wider text-white/35">
                                  {o.kind}
                                </div>
                              )}
                            </div>
                            <div className="space-y-1 p-2">
                              <p className="truncate text-xs text-white">{o.name}</p>
                              <div className="flex flex-wrap items-center gap-1">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[0.55rem] uppercase tracking-wider ring-1 ${qualityBadgeClass(
                                    o.quality
                                  )}`}
                                >
                                  {o.qualityLabel}
                                </span>
                                <span className="text-[0.6rem] text-white/40">{o.sizeLabel}</span>
                              </div>
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-[0.65rem] uppercase tracking-[0.18em] text-white/40">
                          <tr>
                            <th className="px-3 py-2"> </th>
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Quality</th>
                            <th className="px-3 py-2">Size</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((o) => (
                            <tr
                              key={o.key}
                              className={`border-t border-white/5 ${
                                selected.has(o.key) ? "bg-white/10" : "hover:bg-white/[0.03]"
                              }`}
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={selected.has(o.key)}
                                  onChange={() => toggleSelect(o.key)}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  className="text-left text-white hover:underline"
                                  onClick={() => void openUsage(o)}
                                >
                                  {o.name}
                                </button>
                              </td>
                              <td className="px-3 py-2 text-xs text-white/45">
                                {usedMap[o.key] ? "Used" : "Unused"}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[0.55rem] uppercase tracking-wider ring-1 ${qualityBadgeClass(
                                    o.quality
                                  )}`}
                                >
                                  {o.qualityLabel}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-white/50">{o.sizeLabel}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}

          <div ref={sentinelRef} className="h-8" />
          {loading && objects.length > 0 ? (
            <p className="mt-2 text-xs text-white/40">Loading more…</p>
          ) : null}
        </section>
      </div>

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0f1218] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/40">Object</p>
                <h2 className="mt-1 break-all font-display text-xl text-white">{preview.name}</h2>
                <p className="mt-1 break-all text-xs text-white/45">{preview.key}</p>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setPreview(null)}>
                Close
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/50">
              {preview.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.previewUrl} alt="" className="mx-auto max-h-[40vh] object-contain" />
              ) : preview.kind === "video" ? (
                <video src={preview.previewUrl} controls className="mx-auto max-h-[40vh]" />
              ) : (
                <p className="p-8 text-center text-white/40">No preview</p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-[0.65rem] uppercase tracking-wider ring-1 ${qualityBadgeClass(
                  preview.quality
                )}`}
              >
                {preview.qualityLabel}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[0.65rem] uppercase tracking-wider text-white/60">
                {preview.sizeLabel}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[0.65rem] uppercase tracking-wider text-white/60">
                {usage?.totalRefs ? "Used" : usedMap[preview.key] ? "Used" : "Unused"}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void navigator.clipboard.writeText(preview.key)}
              >
                Copy key
              </button>
              <a href={preview.previewUrl} {...externalLinkProps(preview.previewUrl)} className="btn btn-ghost">
                Open
              </a>
              {preview.kind === "image" ? (
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void runCompactSelected()}>
                  Compact to WebP
                </button>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
              />
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void runRename()}>
                Rename
              </button>
            </div>

            <div className="mt-6">
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/40">Used by</p>
              {usageLoading ? (
                <p className="mt-2 text-sm text-white/45">Checking…</p>
              ) : usage && usage.totalRefs > 0 ? (
                <div className="mt-2 space-y-2 text-sm text-white/70">
                  {usage.mediaAssets.map((a) => (
                    <div key={`${a.id}-${a.field}`}>
                      MediaAsset ({a.field})
                      {a.projectIds[0] ? (
                        <a className="ml-2 underline" href={`/admin/work/${a.projectIds[0]}`}>
                          Open work
                        </a>
                      ) : null}
                    </div>
                  ))}
                  {usage.galleryImages.map((g) => (
                    <div key={`${g.id}-${g.field}`}>
                      Gallery image · {g.galleryTitle || g.galleryId}
                      <a className="ml-2 underline" href={`/admin/galleries/${g.galleryId}`}>
                        Open gallery
                      </a>
                    </div>
                  ))}
                  {usage.galleryVideos.map((g) => (
                    <div key={g.id}>
                      Gallery video · {g.galleryTitle || g.galleryId}
                    </div>
                  ))}
                  {usage.deliveryItems.map((d) => (
                    <div key={d.id}>Delivery item {d.id.slice(0, 8)}…</div>
                  ))}
                  {(usage.other ?? []).map((o) => (
                    <div key={`${o.source}-${o.id}-${o.field}`}>
                      {o.source} · {o.field}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-white/45">No database references (possible orphan).</p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-ghost text-red-300"
                disabled={busy}
                onClick={() => void runDelete()}
              >
                Delete from R2
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
