#!/usr/bin/env node
/**
 * Runs Prisma CLI with the same env merge order as `scripts/deploy-prod.sh`: `.env`,
 * then `.env.local`, then `.env.production.local` (later overrides earlier).
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
dotenv.config({ path: join(brightlineRoot, ".env.production.local"), override: true });

const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.error("Usage: node scripts/prisma-with-local-env.mjs <prisma-args…>");
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
