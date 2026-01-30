import { getPublicUrl, getSignedUploadUrl } from "@/lib/storage";
import { signGet, signPut } from "@/lib/storage-r2";

export type ImageMode = "marketing" | "client";

export const MARKETING_CACHE_CONTROL = "public, max-age=31536000, immutable";
export const CLIENT_CACHE_CONTROL = "private, max-age=300";
export const CLIENT_URL_TTL = 60 * 5;

export function getMarketingUploadUrl({
  key,
  contentType,
}: {
  key: string;
  contentType?: string;
}) {
  return getSignedUploadUrl({
    key,
    contentType,
    cacheControl: MARKETING_CACHE_CONTROL,
  });
}

export function getMarketingPublicUrl(key: string) {
  return getPublicUrl(key);
}

export function getClientUploadUrl({
  key,
  contentType,
}: {
  key: string;
  contentType?: string;
}) {
  return signPut({
    key,
    contentType,
    cacheControl: CLIENT_CACHE_CONTROL,
    expiresIn: CLIENT_URL_TTL,
  });
}

export function getClientDownloadUrl({
  key,
  expiresIn = CLIENT_URL_TTL,
  disposition,
}: {
  key: string;
  expiresIn?: number;
  disposition?: string;
}) {
  return signGet({
    key,
    expiresIn,
    responseCacheControl: CLIENT_CACHE_CONTROL,
    responseContentDisposition: disposition,
  });
}

export function isClientImage(storageKey?: string | null) {
  return Boolean(storageKey);
}

export function assertClientImage(storageKey?: string | null) {
  if (!storageKey) {
    throw new Error("Private image is missing a storageKey.");
  }
}

export function getImageModeForUrl(url: string): ImageMode {
  if (!url) return "marketing";
  const lowered = url.toLowerCase();
  if (lowered.includes("x-amz-signature") || lowered.includes("x-amz-expires")) {
    return "client";
  }
  return "marketing";
}
