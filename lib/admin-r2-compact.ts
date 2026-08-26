import { encodePortfolioWebpPair } from "@/lib/image-port/encode-webp";
import {
  assertR2ManagerKeyAllowed,
  cleanR2Key,
  fileNameFromKey,
  invalidateReferencedR2KeyCache,
  normalizePrefix,
  parentPrefixFromKey,
  rewriteR2KeyReferences,
} from "@/lib/admin-r2-manager";
import { isPublicMediaKey } from "@/lib/media-key-access";
import { deleteObject, getObjectBuffer, putObjectBuffer } from "@/lib/storage-r2";

export function safeStem(fileName: string): string {
  const base = fileNameFromKey(fileName)
    .replace(/\.[^.]+$/, "")
    .replace(/-thumb$/i, "")
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 160);
  return base || `img-${Date.now().toString(36)}`;
}

export function compactDestKeys(
  prefixOrKey: string,
  fileName: string
): { fullKey: string; thumbKey: string } {
  const asKey = cleanR2Key(prefixOrKey);
  const prefix = asKey.endsWith("/") || !asKey.includes(".")
    ? normalizePrefix(asKey)
    : parentPrefixFromKey(asKey);
  const stem = safeStem(fileName);

  if (prefix.includes("web_full/")) {
    return {
      fullKey: `${prefix}${stem}.webp`,
      thumbKey: `${prefix.replace(/web_full/g, "web_thumb")}${stem}.webp`,
    };
  }
  if (prefix.includes("web_thumb/")) {
    return {
      fullKey: `${prefix.replace(/web_thumb/g, "web_full")}${stem}.webp`,
      thumbKey: `${prefix}${stem}.webp`,
    };
  }
  return {
    fullKey: `${prefix}${stem}.webp`,
    thumbKey: `${prefix}${stem}-thumb.webp`,
  };
}

export async function putCompactWebpPair(
  source: Buffer,
  fullKey: string,
  thumbKey: string
): Promise<{ fullKey: string; thumbKey: string; previewUrl: string }> {
  assertR2ManagerKeyAllowed(fullKey);
  assertR2ManagerKeyAllowed(thumbKey);
  const encoded = await encodePortfolioWebpPair(source);
  const fullAccess = isPublicMediaKey(fullKey) ? "public-read" : "private";
  const thumbAccess = isPublicMediaKey(thumbKey) ? "public-read" : "private";
  await putObjectBuffer({
    key: fullKey,
    body: encoded.full,
    contentType: "image/webp",
    access: fullAccess,
  });
  await putObjectBuffer({
    key: thumbKey,
    body: encoded.thumb,
    contentType: "image/webp",
    access: thumbAccess,
  });
  invalidateReferencedR2KeyCache();
  const previewKey = thumbKey;
  return {
    fullKey,
    thumbKey,
    previewUrl: isPublicMediaKey(previewKey)
      ? `/api/media/public?key=${encodeURIComponent(previewKey)}`
      : `/api/admin/media/sign?key=${encodeURIComponent(previewKey)}`,
  };
}

export async function compactExistingKey(key: string): Promise<{
  from: string;
  fullKey: string;
  thumbKey: string;
  previewUrl: string;
  dbUpdates: number;
}> {
  const from = assertR2ManagerKeyAllowed(key);
  const source = await getObjectBuffer(from);
  const dest = compactDestKeys(from, fileNameFromKey(from));
  const stored = await putCompactWebpPair(source, dest.fullKey, dest.thumbKey);
  let dbUpdates = 0;
  if (from !== stored.fullKey) {
    dbUpdates = await rewriteR2KeyReferences(from, stored.fullKey);
    if (from !== stored.thumbKey) {
      try {
        await deleteObject(from);
      } catch {
        /* ignore */
      }
    }
  }
  return { from, ...stored, dbUpdates };
}
