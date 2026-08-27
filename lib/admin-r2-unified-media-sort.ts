import type { UnifiedMediaItem } from "@/lib/admin-r2-unified-media";

/** Newest modified first; keys without dates sort last. */
export function sortMediaByLastModified<T extends Pick<UnifiedMediaItem, "lastModified" | "key">>(
  items: T[]
): T[] {
  return [...items].sort(compareMediaByLastModified);
}

export function compareMediaByLastModified(
  a: Pick<UnifiedMediaItem, "lastModified" | "key">,
  b: Pick<UnifiedMediaItem, "lastModified" | "key">
): number {
  const ta = a.lastModified ? Date.parse(a.lastModified) : 0;
  const tb = b.lastModified ? Date.parse(b.lastModified) : 0;
  if (tb !== ta) return tb - ta;
  return b.key.localeCompare(a.key);
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R | null | undefined>
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = [];
  let index = 0;
  const workers = Math.min(Math.max(1, concurrency), items.length);

  async function worker() {
    while (index < items.length) {
      const i = index++;
      const value = await fn(items[i]);
      if (value != null) results.push(value);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

export type UnifiedMediaPageOptions = {
  offset?: number;
  limit?: number;
};

export function sliceSortedMedia<T extends Pick<UnifiedMediaItem, "lastModified" | "key">>(
  sorted: T[],
  options?: UnifiedMediaPageOptions
): {
  items: T[];
  offset: number;
  limit: number;
  totalSorted: number;
  hasMore: boolean;
} {
  const totalSorted = sorted.length;
  const offset = Math.max(0, options?.offset ?? 0);
  const limit = Math.min(Math.max(1, options?.limit ?? totalSorted), 500);
  const items = sorted.slice(offset, offset + limit);
  return {
    items,
    offset,
    limit,
    totalSorted,
    hasMore: offset + limit < totalSorted,
  };
}

type ScanCache<T> = {
  at: number;
  key: string;
  sorted: T[];
  truncated: boolean;
  dbReferenced: number;
  bucketScanAdded: number;
};

export function readScanCache<T>(cacheKey: string, ttlMs = 60_000): ScanCache<T> | null {
  const entry = scanCaches.get(cacheKey) as ScanCache<T> | undefined;
  if (!entry || Date.now() - entry.at >= ttlMs) return null;
  return entry;
}

export function writeScanCache<T>(
  cacheKey: string,
  data: Omit<ScanCache<T>, "at">
): ScanCache<T> {
  const entry = { at: Date.now(), ...data };
  scanCaches.set(cacheKey, entry as ScanCache<unknown>);
  return entry;
}

const scanCaches = new Map<string, ScanCache<unknown>>();

export function invalidateUnifiedMediaScanCache() {
  scanCaches.clear();
}
