import { MediaUploadError } from "@/lib/platform/media/errors";
import { normalizeMediaObjectKey } from "@/lib/platform/media/types";

/** Validate object key using existing traversal rules — does not rewrite key namespaces. */
export function assertValidMediaObjectKey(key: string): string {
  const normalized = normalizeMediaObjectKey(key);
  if (!normalized) {
    throw new MediaUploadError("Object key is required.");
  }
  if (normalized.includes("..") || normalized.includes("\0") || normalized.includes("\\")) {
    throw new MediaUploadError("Invalid object key.");
  }
  if (/^https?:\/\//i.test(normalized)) {
    throw new MediaUploadError("Object key must not be a URL.");
  }
  return normalized;
}
