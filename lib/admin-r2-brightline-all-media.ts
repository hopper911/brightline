import {
  assertR2ManagerKeyAllowed,
  detectR2Kind,
  detectR2Quality,
  fileNameFromKey,
  formatBytes,
  previewUrlForKey,
  qualityLabel,
} from "@/lib/admin-r2-manager";
import {
  collectBrightlineMediaRefs,
  type BrightlineMediaRef,
} from "@/lib/admin-r2-brightline-media-refs";
import {
  type UnifiedMediaCollectResult,
  type UnifiedMediaItem,
  type UnifiedMediaKindFilter,
} from "@/lib/admin-r2-unified-media";
import {
  mapWithConcurrency,
  readScanCache,
  sliceSortedMedia,
  sortMediaByLastModified,
  writeScanCache,
} from "@/lib/admin-r2-unified-media-sort";
import { MIROTECH_PORTFOLIO_PILLAR_PREFIXES } from "@/lib/admin-r2-mirotech-all-media";
import { type R2VaultId } from "@/lib/r2-vaults-shared";
import { headObject, listObjectsWithMeta } from "@/lib/storage-r2";

export type BrightlineAllMediaKindFilter = UnifiedMediaKindFilter;

/** Prefix scans for Brightline vault unified browse. */
export const BRIGHTLINE_ALL_MEDIA_PREFIXES = [
  ...MIROTECH_PORTFOLIO_PILLAR_PREFIXES,
  "mirotech/",
  "site/backgrounds/full/",
  "site/backgrounds/web/",
  "site/backgrounds/posters/",
  "client-galleries/",
  "work/",
  "journal/",
  "studio/",
  "portfolio/",
] as const;

/** Human-readable label for Brightline unified browse. */
export function brightlineAllMediaSourceLabel(
  key: string,
  sourceVault: R2VaultId,
  ref?: Pick<BrightlineMediaRef, "sourceLabel">
): string {
  if (ref?.sourceLabel) return ref.sourceLabel;

  const clean = key.replace(/^\/+/, "").toLowerCase();
  const portfolioMatch = clean.match(/^portfolio\/(arc|cam|cor|advertising|commercial)\/(web_full|web_thumb|web_video)\//);
  if (portfolioMatch) {
    return `Portfolio · ${portfolioMatch[1]} · ${portfolioMatch[2]}`;
  }
  if (clean.startsWith("portfolio/")) return "Portfolio";
  const t9Match = clean.match(/^mirotech\/([^/]+)\/(web_full|web_thumb|web_video)\//);
  if (t9Match) return `T9 · ${t9Match[1]} · ${t9Match[2]}`;
  if (clean.startsWith("mirotech/")) return "T9 port";
  if (clean.startsWith("site/backgrounds/full/")) return "Site background (master)";
  if (clean.startsWith("site/backgrounds/web/")) return "Site background (web)";
  if (clean.startsWith("site/backgrounds/posters/")) return "Site background (poster)";
  if (clean.startsWith("site/")) return "Site";
  if (clean.startsWith("client-galleries/")) return "Client gallery";
  if (clean.startsWith("work/")) return "Work CMS";
  if (clean.startsWith("journal/")) return "Journal";
  if (clean.startsWith("studio/")) return "Studio";
  if (clean.startsWith("delivery/")) return "Delivery";
  if (sourceVault === "mirotech-site") return "Mirotech CMS bucket";
  return "Brightline bucket";
}

async function listFlatWithSizes(prefix: string, maxTotal: number, vault: R2VaultId) {
  const objects: Array<{ key: string; size: number; lastModified: string | null }> = [];
  let token: string | undefined;
  let truncated = false;

  do {
    const page = await listObjectsWithMeta({
      prefix,
      maxKeys: 1000,
      continuationToken: token,
      vault,
    });
    for (const o of page.objects) {
      objects.push({
        key: o.key,
        size: o.size,
        lastModified: o.lastModified,
      });
      if (objects.length >= maxTotal) {
        truncated = true;
        break;
      }
    }
    token = page.nextContinuationToken;
    if (objects.length >= maxTotal) break;
  } while (token);

  if (token) truncated = true;
  return { objects, truncated };
}

function mapObject(
  o: { key: string; size: number; lastModified?: string | null },
  sourceVault: R2VaultId,
  ref?: BrightlineMediaRef,
  dbReferenced = false
): UnifiedMediaItem | null {
  try {
    assertR2ManagerKeyAllowed(o.key, sourceVault);
  } catch {
    return null;
  }
  const kind = detectR2Kind(o.key);
  const quality = detectR2Quality(o.key);
  return {
    key: o.key,
    name: fileNameFromKey(o.key),
    size: o.size,
    sizeLabel: formatBytes(o.size),
    lastModified: o.lastModified ?? null,
    quality,
    qualityLabel: qualityLabel(quality),
    kind,
    previewUrl: previewUrlForKey(o.key, sourceVault),
    pairKey: null,
    pairPresent: false,
    sourceVault,
    sourceLabel: brightlineAllMediaSourceLabel(o.key, sourceVault, ref),
    dbReferenced,
  };
}

async function mapDbRef(ref: BrightlineMediaRef): Promise<UnifiedMediaItem | null> {
  try {
    const head = await headObject(ref.key, ref.vault);
    const mapped = mapObject(
      { key: head.key, size: head.size, lastModified: head.lastModified },
      ref.vault,
      ref,
      true
    );
    return mapped;
  } catch {
    return null;
  }
}

/** DB-referenced keys + bucket prefix scans for all Brightline vault media. */
export async function collectBrightlineAllMedia(options: {
  maxKeys: number;
  kind: BrightlineAllMediaKindFilter;
  offset?: number;
  limit?: number;
}): Promise<
  UnifiedMediaCollectResult & {
    totalSorted: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  }
> {
  const { maxKeys, kind } = options;
  const cacheKey = `brightline:${kind}:${maxKeys}`;
  const cached = readScanCache<UnifiedMediaItem>(cacheKey);

  let sorted: UnifiedMediaItem[];
  let truncated: boolean;
  let dbReferenced: number;
  let bucketScanAdded: number;

  if (cached) {
    sorted = cached.sorted;
    truncated = cached.truncated;
    dbReferenced = cached.dbReferenced;
    bucketScanAdded = cached.bucketScanAdded;
  } else {
    const objects: UnifiedMediaItem[] = [];
    const seenKeys = new Set<string>();
    truncated = false;
    dbReferenced = 0;

    const scans = BRIGHTLINE_ALL_MEDIA_PREFIXES.map((prefix) => ({
      prefix,
      vault: "brightline" as const,
    }));
    const perScanBudget = Math.max(200, Math.ceil(maxKeys / Math.max(scans.length, 1)));

    for (const scan of scans) {
      if (objects.length >= maxKeys) {
        truncated = true;
        break;
      }
      const remaining = maxKeys - objects.length;
      const flat = await listFlatWithSizes(
        scan.prefix,
        Math.min(perScanBudget, remaining + 200),
        scan.vault
      );
      if (flat.truncated) truncated = true;

      for (const o of flat.objects) {
        const mapped = mapObject(o, scan.vault);
        if (!mapped) continue;
        if (kind !== "all" && mapped.kind !== kind) continue;
        if (seenKeys.has(mapped.key)) continue;
        seenKeys.add(mapped.key);
        objects.push(mapped);
        if (objects.length >= maxKeys) {
          truncated = true;
          break;
        }
      }
    }

    bucketScanAdded = objects.length;

    const dbRefs = await collectBrightlineMediaRefs();
    const missingDbRefs = dbRefs.filter((ref) => !seenKeys.has(ref.key));
    const mappedDbRefs = await mapWithConcurrency(missingDbRefs, 24, async (ref) => {
      const mapped = await mapDbRef(ref);
      if (!mapped) return null;
      if (kind !== "all" && mapped.kind !== kind) return null;
      return mapped;
    });

    for (const mapped of mappedDbRefs) {
      if (seenKeys.has(mapped.key)) continue;
      seenKeys.add(mapped.key);
      objects.push(mapped);
      dbReferenced += 1;
      if (objects.length > maxKeys) truncated = true;
    }

    sorted = sortMediaByLastModified(objects);
    writeScanCache(cacheKey, {
      key: cacheKey,
      sorted,
      truncated,
      dbReferenced,
      bucketScanAdded,
    });
  }

  const page = sliceSortedMedia(sorted, {
    offset: options.offset,
    limit: options.limit,
  });

  return {
    objects: page.items,
    scanned: page.totalSorted,
    truncated: truncated || page.hasMore,
    dbReferenced,
    bucketScanAdded,
    totalSorted: page.totalSorted,
    offset: page.offset,
    limit: page.limit,
    hasMore: page.hasMore,
  };
}
