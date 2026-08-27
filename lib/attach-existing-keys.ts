/**
 * Allowlist + storage resolution for Studio CMS "attach existing R2 keys".
 */

import {
  MIROTECH_SITE_ALLOWED_PREFIXES,
  type R2VaultId,
} from "@/lib/r2-vaults-shared";

const BRIGHTLINE_ATTACH_PREFIXES = [
  "portfolio/",
  "mirotech/",
  "work/",
  "studio/",
] as const;

/** Prefixes that exist on both buckets — must store CDN URL when from mirotech-site. */
const AMBIGUOUS_SITE_PREFIXES = ["site/", "journal/"] as const;

export function normalizeAttachKey(key: string): string {
  return key.trim().replace(/^\/+/, "");
}

export function isBrightlineAttachKey(key: string): boolean {
  const k = normalizeAttachKey(key).toLowerCase();
  return BRIGHTLINE_ATTACH_PREFIXES.some((p) => k.startsWith(p));
}

export function isMirotechSiteAttachKey(key: string): boolean {
  const k = normalizeAttachKey(key).toLowerCase();
  return MIROTECH_SITE_ALLOWED_PREFIXES.some((p) => k.startsWith(p));
}

/**
 * Whether a key (optionally tagged with vault) may be attached to a Studio CMS project.
 */
export function isAllowedAttachKey(key: string, vault: R2VaultId = "brightline"): boolean {
  const k = normalizeAttachKey(key);
  if (!k || k.includes("..") || k.includes("\0")) return false;
  if (vault === "mirotech-site") return isMirotechSiteAttachKey(k);
  return isBrightlineAttachKey(k);
}

export function isAmbiguousSitePrefix(key: string): boolean {
  const k = normalizeAttachKey(key).toLowerCase();
  return AMBIGUOUS_SITE_PREFIXES.some((p) => k.startsWith(p));
}

/**
 * Value stored in MediaAsset.keyFull.
 * Mirotech-site picks become absolute CDN URLs (Brightline /api/media/public cannot serve that bucket).
 * Brightline / T9 keys stay as object keys.
 */
export function resolveAttachStorageValue(
  key: string,
  vault: R2VaultId,
  mirotechPublicUrl: string | null | undefined
): string {
  const clean = normalizeAttachKey(key);
  if (vault !== "mirotech-site") return clean;

  const base = (mirotechPublicUrl ?? "").replace(/\/$/, "");
  if (base) return `${base}/${clean}`;

  // No public CDN configured — still store key; admin preview may use signed URL elsewhere.
  return clean;
}
