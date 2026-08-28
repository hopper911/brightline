/**
 * BRIGHTLINE FROZEN TRUTH
 *
 * These modules encode permanent product/security invariants as of 2026-08-01.
 * Do not change values, remove exports, or weaken enforcement without an
 * explicit user request that names this file.
 *
 * Agents: treat edits here as a breaking change to the studio’s locked baseline.
 */

export { SITE_STATE, TRUTH_FROZEN_AT } from "@/lib/truth/site-state";
export {
  PUBLIC_NAV_BRAND,
  CORE_PUBLIC_NAV,
  PUBLIC_VISUAL_BASELINE,
  assertCorePublicNavPreserved,
} from "@/lib/truth/public-chrome";
export {
  CSRF_PROTECTED_API_PREFIXES,
  CSRF_LOGIN_EXEMPT_PATH_PREFIXES,
  FORBIDDEN_UPLOAD_CONTENT_TYPES,
  ALLOWED_UPLOAD_MIME_TYPES,
  SECURITY_MUST_USE,
} from "@/lib/truth/security";
export { SERVICE_AREA_LOCATIONS, CANONICAL_SITE_ORIGIN, CANONICAL_SITE_DOMAIN, CANONICAL_MEDIA_ORIGIN, CANONICAL_MEDIA_HOST, CANONICAL_IMAGES_HOST, LEGACY_BRIGHTLINE_SITE_DOMAIN, isBrightlineSiteHost, isLegacyBrightlineCoHost } from "@/lib/truth/brand-lock";
export { findLegacyCoDomainViolations, LEGACY_CO_DOMAIN_ALLOWLIST, FORBIDDEN_CO_DOMAIN_PATTERN } from "@/lib/truth/canonical-domain";
