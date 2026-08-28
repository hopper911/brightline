/**
 * Platform migration feature flags — all default false unless noted.
 * Missing env vars MUST preserve legacy behavior (flags off).
 *
 * These are architecture migration toggles (strangler / dual-path), not product feature flags.
 * Do not remove env vars while legacy branches remain — see docs/architecture/legacy-retirement-plan.md.
 */

export type PlatformFeatureKey =
  | "content"
  | "media"
  | "assets"
  | "assetRead"
  | "publishing"
  | "identity"
  | "jobs"
  | "audit";

export type PlatformFeatures = Readonly<Record<PlatformFeatureKey, boolean>>;

export type PlatformFlagCategory = "migration-only" | "emergency-fallback" | "permanent-config";

/** Canonical env var names — single source for docs, tests, and observability. */
export const PLATFORM_FEATURE_ENV_KEYS: Readonly<Record<PlatformFeatureKey, string>> = Object.freeze({
  content: "PLATFORM_CONTENT_ENABLED",
  media: "PLATFORM_MEDIA_ENABLED",
  assets: "PLATFORM_ASSET_REGISTRY_ENABLED",
  assetRead: "PLATFORM_ASSET_READ_ENABLED",
  publishing: "PLATFORM_PUBLISHING_ENABLED",
  identity: "PLATFORM_IDENTITY_ENABLED",
  jobs: "PLATFORM_JOBS_ENABLED",
  audit: "PLATFORM_AUDIT_ENABLED",
});

/** Inventory metadata (Phase 11C) — does not affect runtime resolution. */
export const PLATFORM_FLAG_REGISTRY: Readonly<
  Record<
    PlatformFeatureKey,
    {
      env: string;
      category: PlatformFlagCategory;
      defaultWhenUnset: boolean;
      summary: string;
    }
  >
> = Object.freeze({
  content: {
    env: PLATFORM_FEATURE_ENV_KEYS.content,
    category: "migration-only",
    defaultWhenUnset: false,
    summary: "ContentService reads for Studio content + work preview",
  },
  media: {
    env: PLATFORM_FEATURE_ENV_KEYS.media,
    category: "migration-only",
    defaultWhenUnset: false,
    summary: "MediaService upload/sign strangler on admin routes + gallery delivery",
  },
  assets: {
    env: PLATFORM_FEATURE_ENV_KEYS.assets,
    category: "migration-only",
    defaultWhenUnset: false,
    summary: "Platform asset registry registration + Studio media list",
  },
  assetRead: {
    env: PLATFORM_FEATURE_ENV_KEYS.assetRead,
    category: "migration-only",
    defaultWhenUnset: false,
    summary: "Asset-first portfolio read via resolveDomainMedia",
  },
  publishing: {
    env: PLATFORM_FEATURE_ENV_KEYS.publishing,
    category: "migration-only",
    defaultWhenUnset: false,
    summary: "PublishingService for blog/hub sync + Studio publishing dashboard",
  },
  identity: {
    env: PLATFORM_FEATURE_ENV_KEYS.identity,
    category: "migration-only",
    defaultWhenUnset: false,
    summary: "PlatformUser bridge, SSO exchange, RBAC probes (may stay on in prod)",
  },
  jobs: {
    env: PLATFORM_FEATURE_ENV_KEYS.jobs,
    category: "migration-only",
    defaultWhenUnset: false,
    summary: "Async platform jobs (publish, journal sync) + cron drain",
  },
  audit: {
    env: PLATFORM_FEATURE_ENV_KEYS.audit,
    category: "migration-only",
    defaultWhenUnset: false,
    summary: "Platform audit event writes + Studio activity feed",
  },
});

/** Parallel legacy handoff toggle — not a PLATFORM_* key; defaults ON for rollback. */
export const LEGACY_HANDOFF_FLAG = Object.freeze({
  env: "LEGACY_ADMIN_HANDOFF_ENABLED",
  category: "emergency-fallback" as const,
  defaultWhenUnset: true,
  summary: "Mint ho1 handoff tokens; when false, redirect to SSO start",
});

/**
 * Parse a boolean env flag. True-like: 1, true, yes, on (case-insensitive).
 * Platform migration flags default false; handoff defaults true via explicit defaultWhenUnset.
 */
export function parsePlatformEnvFlag(name: string, defaultWhenUnset = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return defaultWhenUnset;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

/** Resolved platform flags for this process. Defaults false when unset. */
export function getPlatformFeatures(): PlatformFeatures {
  return Object.freeze({
    content: parsePlatformEnvFlag(PLATFORM_FEATURE_ENV_KEYS.content),
    media: parsePlatformEnvFlag(PLATFORM_FEATURE_ENV_KEYS.media),
    assets: parsePlatformEnvFlag(PLATFORM_FEATURE_ENV_KEYS.assets),
    assetRead: parsePlatformEnvFlag(PLATFORM_FEATURE_ENV_KEYS.assetRead),
    publishing: parsePlatformEnvFlag(PLATFORM_FEATURE_ENV_KEYS.publishing),
    identity: parsePlatformEnvFlag(PLATFORM_FEATURE_ENV_KEYS.identity),
    jobs: parsePlatformEnvFlag(PLATFORM_FEATURE_ENV_KEYS.jobs),
    audit: parsePlatformEnvFlag(PLATFORM_FEATURE_ENV_KEYS.audit),
  });
}

export function isPlatformFeatureEnabled(key: PlatformFeatureKey): boolean {
  return getPlatformFeatures()[key];
}
