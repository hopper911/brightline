import {
  assertR2ManagerKeyAllowed,
  detectR2Kind,
  detectR2Quality,
  fileNameFromKey,
  formatBytes,
  previewUrlForKey,
  qualityLabel,
} from "@/lib/admin-r2-manager";
import { fetchMirotechCmsMediaRefs, type MirotechCmsMediaRef } from "@/lib/admin-r2-mirotech-cms-keys";
import {
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
import {
  MIROTECH_PORTFOLIO_PILLAR_PREFIXES,
  MIROTECH_SITE_ROOTS,
  type R2VaultId,
} from "@/lib/r2-vaults-shared";
import { headObject, listObjectsWithMeta } from "@/lib/storage-r2";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";

export const MIROTECH_T9_PREFIX = "mirotech/";

export { MIROTECH_PORTFOLIO_PILLAR_PREFIXES };

export type MirotechAllMediaKindFilter = UnifiedMediaKindFilter;
export type MirotechAllMediaItem = UnifiedMediaItem;

/** Human-readable bucket/path label for unified Mirotech browse. */
export function mirotechAllMediaSourceLabel(
  key: string,
  sourceVault: R2VaultId,
  cmsRef?: Pick<MirotechCmsMediaRef, "sourceLabel">
): string {
  if (cmsRef?.sourceLabel) return cmsRef.sourceLabel;

  const clean = key.replace(/^\/+/, "").toLowerCase();
  if (sourceVault === "mirotech-site") {
    if (clean.startsWith("site/backgrounds/full/")) return "CMS backgrounds (master)";
    if (clean.startsWith("site/backgrounds/web/")) return "CMS backgrounds (web)";
    if (clean.startsWith("site/backgrounds/posters/")) return "CMS backgrounds (poster)";
    if (clean.startsWith("site/")) return "CMS site";
    if (clean.startsWith("projects/")) return "CMS projects";
    if (clean.startsWith("journal/")) return "CMS journal";
    if (clean.startsWith("resume/")) return "CMS resume";
    return "CMS bucket";
  }
  const portfolioMatch = clean.match(/^portfolio\/(arc|cam|cor)\/(web_full|web_thumb|web_video)\//);
  if (portfolioMatch) {
    return `Brightline portfolio · ${portfolioMatch[1]} · ${portfolioMatch[2]}`;
  }
  const mirotechPortfolio = clean.match(
    /^mirotech\/portfolio\/(arc|cam|cor)\/(web_full|web_thumb|web_video)\//
  );
  if (mirotechPortfolio) {
    return `Mirotech portfolio · ${mirotechPortfolio[1]} · ${mirotechPortfolio[2]}`;
  }
  const match = clean.match(/^mirotech\/([^/]+)\/(web_full|web_thumb|web_video)\//);
  if (match) return `T9 ${match[1]}/${match[2]}`;
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
  cmsRef?: MirotechCmsMediaRef
): MirotechAllMediaItem | null {
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
    sourceLabel: mirotechAllMediaSourceLabel(o.key, sourceVault, cmsRef),
    dbReferenced: Boolean(cmsRef),
  };
}

async function mapCmsRef(ref: MirotechCmsMediaRef): Promise<MirotechAllMediaItem | null> {
  try {
    let head: { key: string; size: number; lastModified: string | null };
    if (ref.vault === "mirotech-site" && isPlatformFeatureEnabled("media")) {
      const [{ headMirotechCmsObjectViaMediaService }, { defaultMediaService }] = await Promise.all([
        import("@/lib/platform/media/integrations/mirotech-cms-head"),
        import("@/lib/platform/media/server"),
      ]);
      const platformHead = await headMirotechCmsObjectViaMediaService(defaultMediaService, ref);
      if (!platformHead) return null;
      head = {
        key: ref.key,
        size: platformHead.size,
        lastModified: platformHead.lastModified,
      };
    } else {
      head = await headObject(ref.key, ref.vault);
    }
    return mapObject(
      { key: head.key, size: head.size, lastModified: head.lastModified },
      ref.vault,
      ref
    );
  } catch {
    return null;
  }
}

function prefixScans(): Array<{ prefix: string; vault: R2VaultId }> {
  const mirotechPortfolio = ["arc", "cam", "cor"].map((pillar) => ({
    prefix: `mirotech/portfolio/${pillar}/`,
    vault: "brightline" as const,
  }));
  return [
    ...MIROTECH_SITE_ROOTS.map((r) => ({ prefix: r.prefix, vault: "mirotech-site" as const })),
    ...MIROTECH_PORTFOLIO_PILLAR_PREFIXES.map((prefix) => ({
      prefix,
      vault: "brightline" as const,
    })),
    ...mirotechPortfolio,
    { prefix: MIROTECH_T9_PREFIX, vault: "brightline" as const },
  ];
}

/** CMS-referenced keys + bucket prefix scans for all Mirotech site media. */
export async function collectMirotechAllMedia(options: {
  maxKeys: number;
  kind: MirotechAllMediaKindFilter;
  offset?: number;
  limit?: number;
}): Promise<{
  objects: MirotechAllMediaItem[];
  scanned: number;
  truncated: boolean;
  cmsReferenced: number;
  bucketScanAdded: number;
  dbReferenced: number;
  totalSorted: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}> {
  const { maxKeys, kind } = options;
  const cacheKey = `mirotech:${kind}:${maxKeys}`;
  const cached = readScanCache<MirotechAllMediaItem>(cacheKey);

  let sorted: MirotechAllMediaItem[];
  let truncated: boolean;
  let cmsReferenced: number;
  let bucketScanAdded: number;

  if (cached) {
    sorted = cached.sorted;
    truncated = cached.truncated;
    cmsReferenced = cached.dbReferenced;
    bucketScanAdded = cached.bucketScanAdded;
  } else {
    const objects: MirotechAllMediaItem[] = [];
    const seenKeys = new Set<string>();
    truncated = false;
    cmsReferenced = 0;

    const scans = prefixScans();
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

    const cmsRefs = await fetchMirotechCmsMediaRefs();
    const missingCmsRefs = cmsRefs.filter((ref) => !seenKeys.has(ref.key));
    const mappedCmsRefs = await mapWithConcurrency(missingCmsRefs, 24, async (ref) => {
      const mapped = await mapCmsRef(ref);
      if (!mapped) return null;
      if (kind !== "all" && mapped.kind !== kind) return null;
      return mapped;
    });

    for (const mapped of mappedCmsRefs) {
      if (seenKeys.has(mapped.key)) continue;
      seenKeys.add(mapped.key);
      objects.push(mapped);
      cmsReferenced += 1;
      if (objects.length > maxKeys) truncated = true;
    }

    sorted = sortMediaByLastModified(objects);
    writeScanCache(cacheKey, {
      key: cacheKey,
      sorted,
      truncated,
      dbReferenced: cmsReferenced,
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
    cmsReferenced,
    dbReferenced: cmsReferenced,
    bucketScanAdded,
    totalSorted: page.totalSorted,
    offset: page.offset,
    limit: page.limit,
    hasMore: page.hasMore,
  };
}
