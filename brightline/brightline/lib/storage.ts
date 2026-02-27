import { getPublicR2Url } from "@/lib/r2";
import { signPut as signPutR2, signGet as signGetR2 } from "@/lib/storage-r2";

/** Public URL for a storage key (R2 public URL base + key). */
export function getPublicUrl(key: string): string {
  return getPublicR2Url(key);
}

export type SignUploadOptions = {
  key: string;
  contentType?: string;
  expiresIn?: number;
};

export type SignDownloadOptions = {
  key: string;
  expiresIn?: number;
};

export type SignedUrlResult = { url: string; expiresIn: number };

export async function signUploadUrl(options: SignUploadOptions): Promise<SignedUrlResult> {
  return signPutR2({
    key: options.key,
    contentType: options.contentType,
    expiresIn: options.expiresIn,
  });
}

export async function signDownloadUrl(options: SignDownloadOptions): Promise<SignedUrlResult> {
  return signGetR2({
    key: options.key,
    expiresIn: options.expiresIn,
  });
}
