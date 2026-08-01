/** Shared allowlist for browser → R2 signed uploads (no HTML/SVG). Source: lib/truth/security. */

import {
  ALLOWED_UPLOAD_MIME_TYPES,
  FORBIDDEN_UPLOAD_CONTENT_TYPES,
} from "@/lib/truth/security";

export const ALLOWED_UPLOAD_MIME = new Set<string>(ALLOWED_UPLOAD_MIME_TYPES);

export function normalizeUploadContentType(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const ct = raw.split(";")[0]?.trim().toLowerCase() || "";
  if (!ct || !ALLOWED_UPLOAD_MIME.has(ct)) return null;
  if ((FORBIDDEN_UPLOAD_CONTENT_TYPES as readonly string[]).includes(ct)) return null;
  if (ct.includes("html") || ct.includes("script")) return null;
  if (ct === "image/jpg") return "image/jpeg";
  return ct;
}

export function isAllowedImageOrVideoUpload(raw: unknown): string | null {
  const ct = normalizeUploadContentType(raw);
  if (!ct) return null;
  if (ct.startsWith("image/") || ct.startsWith("video/")) return ct;
  return null;
}
