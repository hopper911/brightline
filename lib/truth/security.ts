/**
 * Security invariants — permanent hardening baseline.
 * Weaken only with an explicit user request naming this module.
 */

/** API path prefixes that must run rejectCrossSiteMutation for non-GET methods. */
export const CSRF_PROTECTED_API_PREFIXES = Object.freeze([
  "/api/admin",
  "/api/studio",
  "/api/accountant",
] as const);

/** Login endpoints under protected prefixes that skip CSRF (credential POST). */
export const CSRF_LOGIN_EXEMPT_PATH_PREFIXES = Object.freeze([
  "/api/accountant/login",
  "/api/admin/login",
] as const);

/** Never accept these content types on signed upload URLs. */
export const FORBIDDEN_UPLOAD_CONTENT_TYPES = Object.freeze([
  "image/svg+xml",
  "text/html",
  "application/xhtml+xml",
  "text/javascript",
  "application/javascript",
] as const);

/** Canonical allowlist for browser → R2 signed uploads. */
export const ALLOWED_UPLOAD_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "application/pdf",
  "font/woff",
  "font/woff2",
  "application/font-woff",
  "application/font-woff2",
] as const);

/**
 * Libraries agents must use (do not reintroduce bare fetch to user URLs).
 */
export const SECURITY_MUST_USE = Object.freeze({
  rejectCrossSiteMutation: "@/lib/admin-request-origin",
  assertPublicHttpUrlResolved: "@/lib/ssrf-guard",
  fetchTrustedImageBytes: "@/lib/safe-fetch-image",
  trustedImageToDataUrl: "@/lib/safe-fetch-image",
  normalizeUploadContentType: "@/lib/upload-mime",
  sanitizeHtmlForClientPreview: "@/lib/contracts/render",
} as const);

export function pathRequiresCsrf(pathname: string): boolean {
  const underProtected = CSRF_PROTECTED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!underProtected) return false;
  return !CSRF_LOGIN_EXEMPT_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
