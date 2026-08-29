/**
 * Server environment validation — names and categories only; never logs secret values.
 * Used by scripts/validate-server-env.mjs (CI/local) and optional production boot checks.
 */

import { PLATFORM_FEATURE_ENV_KEYS, LEGACY_HANDOFF_FLAG } from "@/lib/platform/features";

export type EnvCategory =
  | "required_runtime"
  | "required_production"
  | "optional_migration_flag"
  | "public_next_public"
  | "optional_integration";

export type EnvVarSpec = {
  name: string;
  category: EnvCategory;
  /** Human-readable purpose (no secrets). */
  description: string;
};

/** Required for any Prisma/DB route at runtime. */
export const REQUIRED_RUNTIME: EnvVarSpec[] = [
  { name: "DATABASE_URL", category: "required_runtime", description: "Neon pooled Postgres URL" },
  { name: "DIRECT_URL", category: "required_runtime", description: "Neon direct URL for migrations" },
];

/** Additional requirements when NODE_ENV or VERCEL_ENV is production. */
export const REQUIRED_PRODUCTION: EnvVarSpec[] = [
  { name: "ADMIN_ACCESS_CODE", category: "required_production", description: "Admin login gate" },
  { name: "ADMIN_SESSION_SECRET", category: "required_production", description: "Admin cookie signing" },
  { name: "R2_ACCESS_KEY_ID", category: "required_production", description: "Brightline R2" },
  { name: "R2_SECRET_ACCESS_KEY", category: "required_production", description: "Brightline R2" },
  { name: "R2_BUCKET", category: "required_production", description: "Brightline R2 bucket" },
  { name: "R2_ENDPOINT", category: "required_production", description: "R2 S3 endpoint" },
  { name: "R2_PUBLIC_URL", category: "required_production", description: "Public media base URL" },
  { name: "NEXT_PUBLIC_R2_PUBLIC_URL", category: "public_next_public", description: "Client-side R2 URL" },
  { name: "NEXT_PUBLIC_SITE_URL", category: "public_next_public", description: "Canonical site URL" },
];

/** Platform strangler flags — optional; unset preserves legacy behavior. */
export function optionalMigrationFlags(): EnvVarSpec[] {
  const flags = Object.values(PLATFORM_FEATURE_ENV_KEYS).map((name) => ({
    name,
    category: "optional_migration_flag" as const,
    description: "Platform migration flag (default off when unset)",
  }));
  flags.push({
    name: LEGACY_HANDOFF_FLAG.env,
    category: "optional_migration_flag",
    description: LEGACY_HANDOFF_FLAG.summary,
  });
  flags.push({
    name: "PLATFORM_SSO_NONCE_STORE",
    category: "optional_migration_flag",
    description: "Local dev SSO nonce store (memory)",
  });
  return flags;
}

export const PUBLIC_NEXT_PUBLIC_EXAMPLES: EnvVarSpec[] = [
  { name: "NEXT_PUBLIC_SITE_URL", category: "public_next_public", description: "Site origin" },
  { name: "NEXT_PUBLIC_R2_PUBLIC_URL", category: "public_next_public", description: "Media CDN" },
  { name: "NEXT_PUBLIC_MEDIA_URL", category: "public_next_public", description: "Legacy media host" },
  { name: "NEXT_PUBLIC_TURNSTILE_SITE_KEY", category: "public_next_public", description: "Turnstile widget" },
  { name: "NEXT_PUBLIC_CALENDLY_URL", category: "public_next_public", description: "Booking modal" },
];

export type EnvValidationResult = {
  ok: boolean;
  missing: string[];
  category: EnvCategory;
};

function isSet(name: string, env: Record<string, string | undefined> = process.env): boolean {
  const v = env[name];
  return typeof v === "string" && v.trim().length > 0;
}

function isProductionEnv(env: Record<string, string | undefined> = process.env): boolean {
  const node = env.NODE_ENV?.trim().toLowerCase();
  const vercel = env.VERCEL_ENV?.trim().toLowerCase();
  return node === "production" || vercel === "production";
}

/** Validate required vars for the given deployment mode. Never logs values. */
export function validateServerEnv(
  options?: {
    env?: Record<string, string | undefined>;
    production?: boolean;
  }
): { ok: boolean; missingByCategory: Record<EnvCategory, string[]> } {
  const env = options?.env ?? process.env;
  const production = options?.production ?? isProductionEnv(env);

  const missingByCategory: Record<EnvCategory, string[]> = {
    required_runtime: [],
    required_production: [],
    optional_migration_flag: [],
    public_next_public: [],
    optional_integration: [],
  };

  for (const spec of REQUIRED_RUNTIME) {
    if (!isSet(spec.name, env)) missingByCategory.required_runtime.push(spec.name);
  }

  if (production) {
    for (const spec of REQUIRED_PRODUCTION) {
      if (!isSet(spec.name, env)) {
        missingByCategory[spec.category].push(spec.name);
      }
    }
  }

  const ok =
    missingByCategory.required_runtime.length === 0 &&
    missingByCategory.required_production.length === 0;

  return { ok, missingByCategory };
}

/** All documented spec names for CI template cross-check (.env.example). */
export function allDocumentedEnvNames(): string[] {
  const names = new Set<string>();
  for (const spec of [
    ...REQUIRED_RUNTIME,
    ...REQUIRED_PRODUCTION,
    ...optionalMigrationFlags(),
    ...PUBLIC_NEXT_PUBLIC_EXAMPLES,
  ]) {
    names.add(spec.name);
  }
  return [...names].sort();
}
