/**
 * Unified asset health index — bucket scan + registry refs + broken / duplicate / pair status.
 */

import {
  detectR2Kind,
  fileNameFromKey,
  formatBytes,
  pairKeyCandidate,
  previewUrlForKey,
  qualityLabel,
} from "@/lib/admin-r2-manager";
import { collectBrightlineAllMedia } from "@/lib/admin-r2-brightline-all-media";
import { duplicateStem, groupDuplicateKeys } from "@/lib/admin-r2-hygiene";
import { collectMirotechAllMedia } from "@/lib/admin-r2-mirotech-all-media";
import {
  proposeMirotechPortfolioMove,
  proposeMirotechReviewMove,
  type MirotechMediaAuditItem,
  type MirotechProposedMove,
} from "@/lib/admin-r2-mirotech-audit";
import type { MirotechCmsMediaRef } from "@/lib/admin-r2-mirotech-cms-keys";
import type { UnifiedMediaKindFilter } from "@/lib/admin-r2-unified-media";
import type { R2VaultId } from "@/lib/r2-vaults-shared";
import { headObject } from "@/lib/storage-r2";
import {
  collectAllAssetRefs,
  groupRefsByKey,
  type AssetRef,
} from "@/lib/asset-health/registry";

export type AssetHealthItem = MirotechMediaAuditItem & {
  refs: AssetRef[];
  live: boolean;
  broken: boolean;
  missingPair: boolean;
  pairKey: string | null;
  pairPresent: boolean;
  inBucket: boolean;
};

export type AssetHealthStats = {
  liveCount: number;
  orphanCount: number;
  duplicateGroups: number;
  brokenCount: number;
  missingPairCount: number;
};

export type AssetHealthResult = {
  items: AssetHealthItem[];
  total: number;
  truncated: boolean;
  scanned: number;
  stats: AssetHealthStats;
};

export type AssetHealthFilters = {
  kind?: UnifiedMediaKindFilter;
  search?: string;
  live?: boolean;
  orphan?: boolean;
  duplicate?: boolean;
  broken?: boolean;
  missingPair?: boolean;
  vault?: R2VaultId | "all";
  source?: AssetRef["source"] | "all";
  hasProposedMove?: boolean;
};

const PORTFOLIO_PILLAR_RE = /^portfolio\/(arc|cam|cor)\/(web_full|web_thumb|web_video)\//i;

function cmsRefsFromAssetRefs(refs: AssetRef[]): MirotechCmsMediaRef[] {
  return refs
    .filter((r) => r.source === "mirotech-cms")
    .map((r) => ({
      key: r.key,
      vault: r.vault,
      slug: r.entityId,
      field: r.field,
      context: r.entityType === "MirotechJournal" ? "journal" as const : "work" as const,
      sourceLabel: r.label,
    }));
}

function mapScannedToHealthItem(
  media: {
    key: string;
    name: string;
    size: number;
    sizeLabel: string;
    lastModified: string | null;
    kind: "image" | "video" | "other";
    quality: string;
    qualityLabel: string;
    previewUrl: string;
    sourceLabel: string;
    sourceVault: R2VaultId;
  },
  refs: AssetRef[],
  duplicateGroupId: string | null,
  duplicateGroupSize: number,
  keySet: Set<string>
): AssetHealthItem {
  const cmsRefs = cmsRefsFromAssetRefs(refs);
  const brightlineDbRefs = refs.filter((r) => r.source === "brightline-db");
  const liveInCms = cmsRefs.length > 0;
  const hasBrightlineDbRef = brightlineDbRefs.length > 0;
  const live = refs.length > 0;
  const orphan = !live;

  let proposedMove: MirotechProposedMove | null = null;
  let moveBlocked = false;
  let moveBlockedReason: string | null = null;

  if (PORTFOLIO_PILLAR_RE.test(media.key)) {
    if (hasBrightlineDbRef) {
      moveBlocked = true;
      moveBlockedReason = "Referenced in Brightline database (Work, gallery, or delivery).";
    } else if (liveInCms) {
      proposedMove = proposeMirotechPortfolioMove(media.key);
    } else {
      proposedMove = proposeMirotechReviewMove(media.key);
    }
  }

  const pairKey = pairKeyCandidate(media.key);
  const pairPresent = pairKey ? keySet.has(pairKey) : false;
  const missingPair = pairKey !== null && !pairPresent;

  return {
    key: media.key,
    vault: media.sourceVault,
    name: media.name,
    size: media.size,
    sizeLabel: media.sizeLabel,
    lastModified: media.lastModified,
    kind: media.kind,
    quality: media.quality,
    qualityLabel: media.qualityLabel,
    previewUrl: media.previewUrl,
    sourceLabel: media.sourceLabel,
    cmsRefs,
    liveInCms,
    hasBrightlineDbRef,
    orphan,
    duplicateStem: duplicateStem(fileNameFromKey(media.key)),
    duplicateGroupId,
    duplicateGroupSize,
    proposedMove,
    moveBlocked,
    moveBlockedReason,
    refs,
    live,
    broken: false,
    missingPair,
    pairKey,
    pairPresent,
    inBucket: true,
  };
}

function brokenHealthItem(key: string, vault: R2VaultId, refs: AssetRef[]): AssetHealthItem {
  const cmsRefs = cmsRefsFromAssetRefs(refs);
  const brightlineDbRefs = refs.filter((r) => r.source === "brightline-db");
  const kind = detectR2Kind(key);
  const quality = key.includes("web_thumb") || key.includes("/thumb/") ? "thumb" : "full";
  return {
    key,
    vault,
    name: fileNameFromKey(key),
    size: 0,
    sizeLabel: "—",
    lastModified: null,
    kind,
    quality,
    qualityLabel: qualityLabel(quality as "full" | "thumb" | "low_res" | "derivative" | "other"),
    previewUrl: previewUrlForKey(key, vault),
    sourceLabel: refs[0]?.label ?? "Broken reference",
    cmsRefs,
    liveInCms: cmsRefs.length > 0,
    hasBrightlineDbRef: brightlineDbRefs.length > 0,
    orphan: false,
    duplicateStem: duplicateStem(fileNameFromKey(key)),
    duplicateGroupId: null,
    duplicateGroupSize: 0,
    proposedMove: null,
    moveBlocked: false,
    moveBlockedReason: null,
    refs,
    live: true,
    broken: true,
    missingPair: false,
    pairKey: null,
    pairPresent: false,
    inBucket: false,
  };
}

function matchesFilters(item: AssetHealthItem, filters: AssetHealthFilters): boolean {
  if (filters.kind && filters.kind !== "all" && item.kind !== filters.kind) return false;
  if (filters.live === true && !item.live) return false;
  if (filters.live === false && item.live) return false;
  if (filters.orphan === true && !item.orphan) return false;
  if (filters.orphan === false && item.orphan) return false;
  if (filters.duplicate === true && item.duplicateGroupSize < 2) return false;
  if (filters.broken === true && !item.broken) return false;
  if (filters.missingPair === true && !item.missingPair) return false;
  if (filters.hasProposedMove === true && !item.proposedMove) return false;
  if (filters.vault && filters.vault !== "all" && item.vault !== filters.vault) return false;
  if (filters.source && filters.source !== "all") {
    const hasSource = item.refs.some((r) => r.source === filters.source);
    if (!hasSource) return false;
  }
  const q = filters.search?.trim().toLowerCase();
  if (q) {
    const hay = [
      item.key,
      item.name,
      item.sourceLabel,
      ...item.refs.map((r) => `${r.label} ${r.entityId} ${r.field}`),
    ]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

/** Build full health index (may be large — paginate at API layer). */
export async function buildAssetHealthIndex(options: {
  maxKeys?: number;
  kind?: UnifiedMediaKindFilter;
  checkBroken?: boolean;
}): Promise<AssetHealthResult> {
  const maxKeys = Math.min(options.maxKeys ?? 4000, 8000);
  const kind = options.kind ?? "all";
  const checkBroken = options.checkBroken ?? true;
  const halfBudget = Math.ceil(maxKeys / 2);

  const [mirotechScan, brightlineScan, allRefs] = await Promise.all([
    collectMirotechAllMedia({ maxKeys: halfBudget, kind }),
    collectBrightlineAllMedia({ maxKeys: halfBudget, kind }),
    collectAllAssetRefs(),
  ]);

  const truncated = mirotechScan.truncated || brightlineScan.truncated;
  const refsByKey = groupRefsByKey(allRefs);

  const scannedObjects: Array<{
    key: string;
    name: string;
    size: number;
    sizeLabel: string;
    lastModified: string | null;
    kind: "image" | "video" | "other";
    quality: string;
    qualityLabel: string;
    previewUrl: string;
    sourceLabel: string;
    sourceVault: R2VaultId;
  }> = [];
  const seenKeys = new Set<string>();

  for (const obj of [...mirotechScan.objects, ...brightlineScan.objects]) {
    if (seenKeys.has(obj.key)) continue;
    seenKeys.add(obj.key);
    scannedObjects.push({
      key: obj.key,
      name: obj.name,
      size: obj.size,
      sizeLabel: obj.sizeLabel,
      lastModified: obj.lastModified,
      kind: obj.kind,
      quality: obj.quality,
      qualityLabel: obj.qualityLabel,
      previewUrl: obj.previewUrl,
      sourceLabel: obj.sourceLabel,
      sourceVault: obj.sourceVault,
    });
    if (scannedObjects.length >= maxKeys) break;
  }

  const hygieneObjects = scannedObjects.map((o) => ({ key: o.key, size: o.size }));
  const duplicateGroups = groupDuplicateKeys(hygieneObjects);
  const groupByKey = new Map<string, { id: string; size: number }>();
  for (const g of duplicateGroups) {
    const id = `dup:${g.stem}`;
    for (const k of g.keys) {
      groupByKey.set(k, { id, size: g.keys.length });
    }
  }

  const items: AssetHealthItem[] = scannedObjects.map((media) =>
    mapScannedToHealthItem(
      media,
      refsByKey.get(media.key) ?? [],
      groupByKey.get(media.key)?.id ?? null,
      groupByKey.get(media.key)?.size ?? 0,
      seenKeys
    )
  );

  if (checkBroken) {
    const brokenCandidates = [...refsByKey.keys()].filter((key) => !seenKeys.has(key));
    const brokenBudget = Math.min(brokenCandidates.length, 200);
    for (let i = 0; i < brokenBudget; i++) {
      const key = brokenCandidates[i];
      const refs = refsByKey.get(key) ?? [];
      const vault = refs[0]?.vault ?? "brightline";
      try {
        await headObject(key, vault);
      } catch {
        items.push(brokenHealthItem(key, vault, refs));
      }
    }
  }

  const stats: AssetHealthStats = {
    liveCount: items.filter((i) => i.live && !i.broken).length,
    orphanCount: items.filter((i) => i.orphan).length,
    duplicateGroups: duplicateGroups.length,
    brokenCount: items.filter((i) => i.broken).length,
    missingPairCount: items.filter((i) => i.missingPair).length,
  };

  return {
    items,
    total: items.length,
    truncated,
    scanned: scannedObjects.length,
    stats,
  };
}

export async function queryAssetHealth(options: {
  maxKeys?: number;
  kind?: UnifiedMediaKindFilter;
  filters?: AssetHealthFilters;
  offset?: number;
  limit?: number;
  checkBroken?: boolean;
}): Promise<AssetHealthResult & { offset: number; limit: number; filteredTotal: number }> {
  const full = await buildAssetHealthIndex({
    maxKeys: options.maxKeys,
    kind: options.kind,
    checkBroken: options.checkBroken,
  });
  const filters = options.filters ?? {};
  const filtered = full.items.filter((item) => matchesFilters(item, filters));
  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.min(Math.max(1, options.limit ?? 120), 500);
  const slice = filtered.slice(offset, offset + limit);

  return {
    ...full,
    items: slice,
    filteredTotal: filtered.length,
    offset,
    limit,
  };
}

/** Map health items to legacy Mirotech audit shape for shared reorg / duplicate reports. */
export function toMirotechAuditItems(items: AssetHealthItem[]): MirotechMediaAuditItem[] {
  return items.map((item) => ({
    key: item.key,
    vault: item.vault,
    name: item.name,
    size: item.size,
    sizeLabel: item.sizeLabel,
    lastModified: item.lastModified,
    kind: item.kind,
    quality: item.quality,
    qualityLabel: item.qualityLabel,
    previewUrl: item.previewUrl,
    sourceLabel: item.sourceLabel,
    cmsRefs: item.cmsRefs,
    liveInCms: item.liveInCms,
    hasBrightlineDbRef: item.hasBrightlineDbRef,
    orphan: item.orphan,
    duplicateStem: item.duplicateStem,
    duplicateGroupId: item.duplicateGroupId,
    duplicateGroupSize: item.duplicateGroupSize,
    proposedMove: item.proposedMove,
    moveBlocked: item.moveBlocked,
    moveBlockedReason: item.moveBlockedReason,
  }));
}
