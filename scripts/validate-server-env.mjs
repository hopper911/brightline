#!/usr/bin/env node
/**
 * Validate server environment variable presence (names only — never prints values).
 *
 * Usage:
 *   node scripts/validate-server-env.mjs
 *   node scripts/validate-server-env.mjs --ci
 *   node scripts/validate-server-env.mjs --example
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const REQUIRED_RUNTIME = ["DATABASE_URL", "DIRECT_URL"];
const REQUIRED_PRODUCTION = [
  "ADMIN_ACCESS_CODE",
  "ADMIN_SESSION_SECRET",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_ENDPOINT",
  "R2_PUBLIC_URL",
  "NEXT_PUBLIC_R2_PUBLIC_URL",
  "NEXT_PUBLIC_SITE_URL",
];

const OPTIONAL_MIGRATION_FLAGS = [
  "PLATFORM_CONTENT_ENABLED",
  "PLATFORM_MEDIA_ENABLED",
  "PLATFORM_ASSET_REGISTRY_ENABLED",
  "PLATFORM_ASSET_READ_ENABLED",
  "PLATFORM_PUBLISHING_ENABLED",
  "PLATFORM_IDENTITY_ENABLED",
  "PLATFORM_JOBS_ENABLED",
  "PLATFORM_AUDIT_ENABLED",
  "LEGACY_ADMIN_HANDOFF_ENABLED",
  "PLATFORM_SSO_EXCHANGE_SECRET",
  "PLATFORM_SSO_NONCE_STORE",
];

function isSet(name, env = process.env) {
  const v = env[name];
  return typeof v === "string" && v.trim().length > 0;
}

function validateEnv(env, production) {
  const missingRuntime = REQUIRED_RUNTIME.filter((n) => !isSet(n, env));
  const missingProd = production
    ? REQUIRED_PRODUCTION.filter((n) => !isSet(n, env))
    : [];
  return { missingRuntime, missingProd };
}

function checkExampleFile() {
  const examplePath = path.join(root, ".env.example");
  if (!existsSync(examplePath)) {
    console.error("❌ .env.example not found");
    return false;
  }
  const content = readFileSync(examplePath, "utf8");
  const missing = [];
  for (const name of [...REQUIRED_RUNTIME, ...REQUIRED_PRODUCTION]) {
    if (!content.includes(name)) missing.push(name);
  }
  for (const name of OPTIONAL_MIGRATION_FLAGS) {
    if (!content.includes(name)) missing.push(`optional:${name}`);
  }
  if (missing.length) {
    console.error("❌ .env.example missing documented keys:");
    for (const m of missing) console.error(`   - ${m}`);
    return false;
  }
  console.log("✅ .env.example documents required and migration flag keys.");
  return true;
}

const args = new Set(process.argv.slice(2));
let exitCode = 0;

if (args.has("--example")) {
  process.exit(checkExampleFile() ? 0 : 1);
}

if (args.has("--ci")) {
  const dummy = {
    DATABASE_URL: "postgresql://dummy:dummy@localhost:5432/dummy",
    DIRECT_URL: "postgresql://dummy:dummy@localhost:5432/dummy",
    NODE_ENV: "production",
  };
  const { missingRuntime, missingProd } = validateEnv(dummy, true);
  if (missingRuntime.length) {
    console.error("❌ CI dummy env internal error");
    exitCode = 1;
  } else {
    console.log("✅ CI structural env check passed (dummy DATABASE_URL only).");
    console.log(
      `ℹ️  ${missingProd.length} production keys intentionally unset in CI build.`
    );
  }
  if (!checkExampleFile()) exitCode = 1;
  process.exit(exitCode);
}

const production =
  process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
const { missingRuntime, missingProd } = validateEnv(process.env, production);

if (missingRuntime.length) {
  console.error("❌ Missing required runtime variables:");
  for (const n of missingRuntime) console.error(`   - ${n}`);
  exitCode = 1;
} else {
  console.log("✅ Required runtime variables present (values not shown).");
}

if (production && missingProd.length) {
  console.error("❌ Missing required production variables:");
  for (const n of missingProd) console.error(`   - ${n}`);
  exitCode = 1;
} else if (production) {
  console.log("✅ Required production variables present (values not shown).");
} else {
  console.log("ℹ️  Not production mode — skipping production-only keys.");
}

console.log("ℹ️  Optional PLATFORM_* migration flags are never required.");
process.exit(exitCode);
