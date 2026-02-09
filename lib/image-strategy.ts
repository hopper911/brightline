import { getPublicUrl, signDownloadUrl, signUploadUrl } from "@/lib/storage";

export { type ImageMode, getImageModeForUrl } from "@/lib/image-utils";

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

export function isClientImage(storageKey?: string | null) {
  return Boolean(storageKey);
}

export function assertClientImage(storageKey?: string | null) {
  if (!storageKey) {
    throw new Error("Private image is missing a storageKey.");
  }
}
