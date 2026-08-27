/**
 * Unified Mirotech media audit — bucket scan + CMS refs + Brightline DB refs + duplicates.
 */

import {
  collectReferencedR2KeysCached,
  detectR2Kind,
  detectR2Quality,
  fileNameFromKey,
  formatBytes,
  previewUrlForKey,
  qualityLabel,
} from "@/lib/admin-r2-manager";
import { duplicateStem, groupDuplicateKeys } from "@/lib/admin-r2-hygiene";
import {
  collectMirotechAllMedia,
  type MirotechAllMediaItem,
} from "@/lib/admin-r2-mirotech-all-media";
import {
  fetchMirotechCmsMediaRefs,
  inferVaultForMediaKey,
  type MirotechCmsMediaRef,
} from "@/lib/admin-r2-mirotech-cms-keys";
import type { UnifiedMediaKindFilter } from "@/lib/admin-r2-unified-media";
import type { R2VaultId } from "@/lib/r2-vaults-shared";

export type MirotechProposedMove = {
  from: string;
  to: string;
  vault: R2VaultId;
  reason: string;
};

export type MirotechMediaAuditItem = {
  key: string;
  vault: R2VaultId;
  name: string;
  size: number;
  sizeLabel: string;
  lastModified: string | null;
  kind: "image" | "video" | "other";
  quality: string;
  qualityLabel: string;
  previewUrl: string;
  sourceLabel: string;
  cmsRefs: MirotechCmsMediaRef[];
  liveInCms: boolean;
  hasBrightlineDbRef: boolean;
  orphan: boolean;
  duplicateStem: string;
  duplicateGroupId: string | null;
  duplicateGroupSize: number;
  proposedMove: MirotechProposedMove | null;
  moveBlocked: boolean;
  moveBlockedReason: string | null;
};

export type MirotechMediaAuditResult = {
  items: MirotechMediaAuditItem[];
  total: number;
  truncated: boolean;
  scanned: number;
  cmsReferenced: number;
  orphanCount: number;
  duplicateGroupCount: number;
  proposedMoveCount: number;
};

const PORTFOLIO_PILLAR_RE = /^portfolio\/(arc|cam|cor)\/(web_full|web_thumb|web_video)\//i;

/** Target path for Mirotech-only portfolio pillar keys (post-reorg). */
export function proposeMirotechPortfolioMove(key: string): MirotechProposedMove | null {
  const clean = key.replace(/^\/+/, "");
  const match = clean.match(/^portfolio\/(arc|cam|cor)\/(web_full|web_thumb|web_video)\/(.*)$/i);
  if (!match) return null;
  const [, pillar, quality, rest] = match;
  const to = `mirotech/portfolio/${pillar}/${quality}/${rest}`;
  if (to === clean) return null;
  return {
    from: clean,
    to,
    vault: "brightline",
    reason: `Mirotech case-study media → mirotech/portfolio/${pillar}/`,
  };
}

/** Orphan portfolio keys with no refs → review queue. */
export function proposeMirotechReviewMove(key: string): MirotechProposedMove | null {
  const clean = key.replace(/^\/+/, "");
  if (!PORTFOLIO_PILLAR_RE.test(clean)) return null;
  const match = clean.match(/^portfolio\/(arc|cam|cor)\/(web_full|web_thumb|web_video)\/(.*)$/i);
  if (!match) return null;
  const [, pillar, quality, rest] = match;
  const to = `mirotech/_review/${quality}/${pillar}-${rest}`;
  return {
    from: clean,
    to,
    vault: "brightline",
    reason: "Unreferenced portfolio key → mirotech/_review/",
  };
}

function mapAuditItem(
  media: MirotechAllMediaItem,
  cmsRefs: MirotechCmsMediaRef[],
  hasBrightlineDbRef: boolean,
  duplicateGroupId: string | null,
  duplicateGroupSize: number
): MirotechMediaAuditItem {
  const liveInCms = cmsRefs.length > 0;
  const orphan = !liveInCms && !hasBrightlineDbRef;

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

  const stem = duplicateStem(fileNameFromKey(media.key));

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
    duplicateStem: stem,
    duplicateGroupId,
    duplicateGroupSize,
    proposedMove,
    moveBlocked,
    moveBlockedReason,
  };
}

export type MirotechAuditFilters = {
  kind?: UnifiedMediaKindFilter;
  search?: string;
  liveInCms?: boolean;
  orphan?: boolean;
  duplicate?: boolean;
  hasProposedMove?: boolean;
  vault?: R2VaultId | "all";
};

function matchesFilters(item: MirotechMediaAuditItem, filters: MirotechAuditFilters): boolean {
  if (filters.kind && filters.kind !== "all" && item.kind !== filters.kind) return false;
  if (filters.liveInCms === true && !item.liveInCms) return false;
  if (filters.liveInCms === false && item.liveInCms) return false;
  if (filters.orphan === true && !item.orphan) return false;
  if (filters.orphan === false && item.orphan) return false;
  if (filters.duplicate === true && item.duplicateGroupSize < 2) return false;
  if (filters.hasProposedMove === true && !item.proposedMove) return false;
  if (filters.vault && filters.vault !== "all" && item.vault !== filters.vault) return false;
  const q = filters.search?.trim().toLowerCase();
  if (q) {
    const hay = [
      item.key,
      item.name,
      item.sourceLabel,
      ...item.cmsRefs.map((r) => `${r.slug} ${r.field}`),
    ]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

/** Build full audit index (may be large — use pagination at API layer). */
export async function buildMirotechMediaAudit(options: {
  maxKeys?: number;
  kind?: UnifiedMediaKindFilter;
}): Promise<MirotechMediaAuditResult> {
  const maxKeys = Math.min(options.maxKeys ?? 8000, 8000);
  const kind = options.kind ?? "all";

  const [mediaResult, cmsRefs, brightlineRefs] = await Promise.all([
    collectMirotechAllMedia({ maxKeys, kind }),
    fetchMirotechCmsMediaRefs(),
    collectReferencedR2KeysCached(),
  ]);

  const cmsByKey = new Map<string, MirotechCmsMediaRef[]>();
  for (const ref of cmsRefs) {
    const list = cmsByKey.get(ref.key) ?? [];
    list.push(ref);
    cmsByKey.set(ref.key, list);
  }

  const hygieneObjects = mediaResult.objects.map((o) => ({ key: o.key, size: o.size }));
  const duplicateGroups = groupDuplicateKeys(hygieneObjects);
  const groupByKey = new Map<string, { id: string; size: number }>();
  for (const g of duplicateGroups) {
    const id = `dup:${g.stem}`;
    for (const k of g.keys) {
      groupByKey.set(k, { id, size: g.keys.length });
    }
  }

  const items = mediaResult.objects.map((media) =>
    mapAuditItem(
      media,
      cmsByKey.get(media.key) ?? [],
      brightlineRefs.has(media.key),
      groupByKey.get(media.key)?.id ?? null,
      groupByKey.get(media.key)?.size ?? 0
    )
  );

  return {
    items,
    total: items.length,
    truncated: mediaResult.truncated,
    scanned: mediaResult.scanned,
    cmsReferenced: mediaResult.cmsReferenced,
    orphanCount: items.filter((i) => i.orphan).length,
    duplicateGroupCount: duplicateGroups.length,
    proposedMoveCount: items.filter((i) => i.proposedMove && !i.moveBlocked).length,
  };
}

export async function queryMirotechMediaAudit(options: {
  maxKeys?: number;
  kind?: UnifiedMediaKindFilter;
  filters?: MirotechAuditFilters;
  offset?: number;
  limit?: number;
}): Promise<MirotechMediaAuditResult & { offset: number; limit: number; filteredTotal: number }> {
  const full = await buildMirotechMediaAudit({
    maxKeys: options.maxKeys,
    kind: options.kind,
  });
  const filters = options.filters ?? {};
  const filtered = full.items.filter((item) => matchesFilters(item, filters));
  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.min(Math.max(1, options.limit ?? 120), 500);
  const slice = filtered.slice(offset, offset + limit);

  return {
    ...full,
    items: slice,
    total: full.total,
    filteredTotal: filtered.length,
    offset,
    limit,
  };
}

export type MirotechDuplicateReportGroup = {
  stem: string;
  groupId: string;
  keys: string[];
  vaults: R2VaultId[];
  sizes: number[];
  cmsRefCounts: number[];
  orphanKeys: string[];
};

export async function buildMirotechDuplicateReport(): Promise<{
  groups: MirotechDuplicateReportGroup[];
  totalGroups: number;
}> {
  const audit = await buildMirotechMediaAudit({ maxKeys: 8000, kind: "all" });
  const byGroup = new Map<string, MirotechMediaAuditItem[]>();
  for (const item of audit.items) {
    if (!item.duplicateGroupId || item.duplicateGroupSize < 2) continue;
    const list = byGroup.get(item.duplicateGroupId) ?? [];
    list.push(item);
    byGroup.set(item.duplicateGroupId, list);
  }

  const groups: MirotechDuplicateReportGroup[] = [];
  for (const [groupId, members] of byGroup) {
    const stem = members[0]?.duplicateStem ?? groupId;
    groups.push({
      stem,
      groupId,
      keys: members.map((m) => m.key),
      vaults: members.map((m) => m.vault),
      sizes: members.map((m) => m.size),
      cmsRefCounts: members.map((m) => m.cmsRefs.length),
      orphanKeys: members.filter((m) => m.orphan).map((m) => m.key),
    });
  }

  groups.sort((a, b) => b.keys.length - a.keys.length);
  return { groups, totalGroups: groups.length };
}

/** Reorg manifest — proposed moves that are not blocked. */
export async function buildMirotechReorgManifest(): Promise<{
  moves: MirotechProposedMove[];
  blocked: Array<{ key: string; reason: string }>;
}> {
  const audit = await buildMirotechMediaAudit({ maxKeys: 8000, kind: "all" });
  const moves: MirotechProposedMove[] = [];
  const blocked: Array<{ key: string; reason: string }> = [];
  const seen = new Set<string>();

  for (const item of audit.items) {
    if (item.moveBlocked) {
      if (PORTFOLIO_PILLAR_RE.test(item.key)) {
        blocked.push({ key: item.key, reason: item.moveBlockedReason ?? "Blocked" });
      }
      continue;
    }
    if (!item.proposedMove) continue;
    const dedupe = `${item.proposedMove.from}→${item.proposedMove.to}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    moves.push(item.proposedMove);
  }

  return { moves, blocked };
}

/** Lookup CMS refs for a single key (usage panel). */
export async function findMirotechCmsRefsForKey(key: string): Promise<MirotechCmsMediaRef[]> {
  const clean = key.replace(/^\/+/, "");
  const refs = await fetchMirotechCmsMediaRefs();
  return refs.filter((r) => r.key === clean);
}

export function inferVaultForAuditKey(key: string): R2VaultId {
  return inferVaultForMediaKey(key);
}
