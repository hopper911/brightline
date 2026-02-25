import { signPut } from "@/lib/storage-r2";
import { signDownloadUrl } from "@/lib/storage";

export type GetClientUploadUrlOptions = {
  key: string;
  contentType?: string;
};

export async function getClientUploadUrl(options: GetClientUploadUrlOptions) {
  return signPut({
    key: options.key,
    contentType: options.contentType ?? "image/jpeg",
  });
}

export type GetClientDownloadUrlOptions = {
  key: string;
  expiresIn?: number;
};

export async function getClientDownloadUrl(options: GetClientDownloadUrlOptions) {
  return signDownloadUrl({
    key: options.key,
    expiresIn: options.expiresIn,
  });
}

/** Alias for marketing asset uploads (same as getClientUploadUrl). */
export async function getMarketingUploadUrl(options: GetClientUploadUrlOptions) {
  return getClientUploadUrl(options);
}
