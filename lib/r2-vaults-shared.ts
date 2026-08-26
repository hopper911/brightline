/**
 * Client-safe R2 vault ids and Mirotech site prefix constants.
 * Server credential resolution lives in r2-vaults.ts.
 */

export const R2_VAULT_IDS = ["brightline", "mirotech-site"] as const;
export type R2VaultId = (typeof R2_VAULT_IDS)[number];

export type R2VaultRoot = { id: string; label: string; prefix: string };

/** Mirotech CMS bucket prefixes (mirror mirotech-solutions/lib/storage-mirotech.ts). */
export const MIROTECH_SITE_ALLOWED_PREFIXES = [
  "projects/",
  "journal/",
  "resume/",
  "site/",
] as const;

export const MIROTECH_SITE_ROOTS: readonly R2VaultRoot[] = [
  { id: "projects", label: "Projects", prefix: "projects/" },
  { id: "journal", label: "Journal", prefix: "journal/" },
  { id: "resume", label: "Resume", prefix: "resume/" },
  { id: "site", label: "Site", prefix: "site/" },
] as const;

export function isR2VaultId(value: unknown): value is R2VaultId {
  return typeof value === "string" && (R2_VAULT_IDS as readonly string[]).includes(value);
}

/** Invalid / missing → Brightline (safe default for product routes). */
export function normalizeR2VaultId(value: unknown): R2VaultId {
  return isR2VaultId(value) ? value : "brightline";
}
