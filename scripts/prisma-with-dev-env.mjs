#!/usr/bin/env node
/**
 * Runs Prisma CLI against the **development** Neon branch:
 * `.env` → `.env.local` → `.env.development.local` (same order as `scripts/load-cli-env.ts`).
 *
 * Use this instead of `db:migrate` when you need dev schema in sync without touching production.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const brightlineRoot = join(__dirname, "..");

dotenv.config({ path: join(brightlineRoot, ".env") });
dotenv.config({ path: join(brightlineRoot, ".env.local"), override: true });
dotenv.config({ path: join(brightlineRoot, ".env.development.local"), override: true });

const host = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? "").host;
  } catch {
    return "(invalid DATABASE_URL)";
  }
})();
console.log(`[db:migrate:dev] database=${host}`);

const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.error("Usage: node scripts/prisma-with-dev-env.mjs <prisma-args…>");
  process.exit(1);
}

const require = createRequire(import.meta.url);
const prismaPkgDir = dirname(require.resolve("prisma/package.json"));
const prismaMain = join(prismaPkgDir, "build/index.js");

const result = spawnSync(process.execPath, [prismaMain, ...prismaArgs], {
  cwd: brightlineRoot,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
