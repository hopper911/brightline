import { signPut } from "@/lib/storage-r2";
import { signDownloadUrl } from "@/lib/storage";
import { SIGNED_URL_TTL } from "@/lib/signed-url-ttl";

export type GetClientUploadUrlOptions = {
  key: string;
  contentType?: string;
};

export async function getClientUploadUrl(options: GetClientUploadUrlOptions) {
  return signPut({
    key: options.key,
    contentType: options.contentType ?? "image/jpeg",
    access: "private",
  });
}

export type GetClientDownloadUrlOptions = {
  key: string;
  expiresIn?: number;
};

export async function getClientDownloadUrl(options: GetClientDownloadUrlOptions) {
  return signDownloadUrl({
    key: options.key,
    expiresIn: options.expiresIn ?? SIGNED_URL_TTL.clientGalleryViewSec,
  });
}

/** Alias for marketing asset uploads (same as getClientUploadUrl). */
export async function getMarketingUploadUrl(options: GetClientUploadUrlOptions) {
  return getClientUploadUrl(options);
}
