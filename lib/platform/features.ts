/**
 * Platform migration feature flags — all default false.
 * Missing env vars MUST preserve legacy behavior (flags off).
 */

export type PlatformFeatureKey =
  | "content"
  | "media"
  | "publishing"
  | "identity"
  | "jobs";

export type PlatformFeatures = Readonly<Record<PlatformFeatureKey, boolean>>;

const ENV_KEYS: Readonly<Record<PlatformFeatureKey, string>> = Object.freeze({
  content: "PLATFORM_CONTENT_ENABLED",
  media: "PLATFORM_MEDIA_ENABLED",
  publishing: "PLATFORM_PUBLISHING_ENABLED",
  identity: "PLATFORM_IDENTITY_ENABLED",
  jobs: "PLATFORM_JOBS_ENABLED",
});

function parseEnvFlag(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return false;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

/** Resolved platform flags for this process. Defaults false when unset. */
export function getPlatformFeatures(): PlatformFeatures {
  return Object.freeze({
    content: parseEnvFlag(ENV_KEYS.content),
    media: parseEnvFlag(ENV_KEYS.media),
    publishing: parseEnvFlag(ENV_KEYS.publishing),
    identity: parseEnvFlag(ENV_KEYS.identity),
    jobs: parseEnvFlag(ENV_KEYS.jobs),
  });
}

export function isPlatformFeatureEnabled(key: PlatformFeatureKey): boolean {
  return getPlatformFeatures()[key];
}

/** @deprecated Use getPlatformFeatures — alias for migration program naming. */
export const platformFeatures = {
  get content() {
    return isPlatformFeatureEnabled("content");
  },
  get media() {
    return isPlatformFeatureEnabled("media");
  },
  get publishing() {
    return isPlatformFeatureEnabled("publishing");
  },
  get identity() {
    return isPlatformFeatureEnabled("identity");
  },
  get jobs() {
    return isPlatformFeatureEnabled("jobs");
  },
};
