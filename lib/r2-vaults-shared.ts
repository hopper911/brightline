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

/**
 * Brightline portfolio pillars used by Mirotech case studies (Studio Hub / CMS refs).
 * Client-safe — shared by R2 hub unified browse and Browse R2 modal.
 */
export const MIROTECH_PORTFOLIO_PILLAR_PREFIXES = [
  "portfolio/arc/",
  "portfolio/cam/",
  "portfolio/cor/",
] as const;

export const MIROTECH_SITE_ROOTS: readonly R2VaultRoot[] = [
  { id: "projects", label: "Projects", prefix: "projects/" },
  { id: "journal", label: "Journal", prefix: "journal/" },
  { id: "resume", label: "Resume", prefix: "resume/" },
  { id: "site", label: "Site", prefix: "site/" },
  { id: "bg-full", label: "Backgrounds (master)", prefix: "site/backgrounds/full/" },
  { id: "bg-web", label: "Backgrounds (web)", prefix: "site/backgrounds/web/" },
  { id: "bg-posters", label: "Backgrounds (posters)", prefix: "site/backgrounds/posters/" },
] as const;

export function isR2VaultId(value: unknown): value is R2VaultId {
  return typeof value === "string" && (R2_VAULT_IDS as readonly string[]).includes(value);
}

/** Invalid / missing → Brightline (safe default for product routes). */
export function normalizeR2VaultId(value: unknown): R2VaultId {
  return isR2VaultId(value) ? value : "brightline";
}

/** Infer vault from a folder prefix when deep-linking (client-safe). */
export function inferVaultFromPrefix(prefix: string): R2VaultId | null {
  const clean = prefix.trim().replace(/^\/+/, "").toLowerCase();
  if (!clean) return null;
  if (MIROTECH_SITE_ALLOWED_PREFIXES.some((p) => clean.startsWith(p))) {
    return "mirotech-site";
  }
  const brightlineRoots = [
    "portfolio/",
    "mirotech/",
    "client-galleries/",
    "work/",
    "studio/",
    "site/",
    "delivery/",
    "journal/",
    "accounting/",
    "tmp/",
    "studio-os/",
  ];
  if (brightlineRoots.some((p) => clean.startsWith(p))) {
    return "brightline";
  }
  return null;
}

export function defaultPrefixForVault(vault: R2VaultId): string {
  return vault === "mirotech-site" ? "site/" : "portfolio/";
}

/** When listing a folder prefix, use the bucket that actually owns that prefix. */
export function resolveVaultForListPrefix(prefix: string, requestedVault: R2VaultId): R2VaultId {
  const normalized = prefix.trim().replace(/^\/+/, "");
  if (!normalized) return requestedVault;
  const withSlash = normalized.endsWith("/") ? normalized : `${normalized}/`;
  const inferred = inferVaultFromPrefix(withSlash);
  return inferred ?? requestedVault;
}
