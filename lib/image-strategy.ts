import { getPublicUrl, signDownloadUrl, signUploadUrl } from "@/lib/storage";

type UploadParams = {
  key: string;
  contentType?: string;
};

type DownloadParams = {
  key: string;
  expiresIn?: number;
};

export async function getMarketingUploadUrl({ key, contentType }: UploadParams) {
  return signUploadUrl({ key, contentType, expiresIn: 60 * 10 });
}

export async function getClientUploadUrl({ key, contentType }: UploadParams) {
  return signUploadUrl({ key, contentType, expiresIn: 60 * 10 });
}

export async function getClientDownloadUrl({ key, expiresIn }: DownloadParams) {
  return signDownloadUrl({ key, expiresIn });
}

export function getMarketingPublicUrl(key: string) {
  return getPublicUrl(key);
}

export function assertClientImage(key?: string | null) {
  if (!key) {
    throw new Error("Missing image key.");
  }
}
import { getPublicUrl, getSignedUploadUrl } from "@/lib/storage";
import { signGet, signPut } from "@/lib/storage-r2";

// Re-export client-safe utilities for backward compatibility
export { type ImageMode, getImageModeForUrl } from "@/lib/image-utils";

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
