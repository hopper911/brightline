#!/usr/bin/env node
/**
 * Pre-flight checklist for production deploy (read-only; no migrations run).
 * Does not load .env — use explicit exports if you need to verify against a specific database.
 *
 * Usage: npm run deploy:check
 * Optional: REQUIRED_GIT_BRANCH=my-branch (default: main, must match deploy-prod.sh)
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const requiredBranch = process.env.REQUIRED_GIT_BRANCH?.trim() || "main";

function line(symbol, message) {
  console.log(`${symbol} ${message}`);
}

/** @returns {{ ok: boolean, branch: string, dirty: boolean, porcelain: string }} */
function gitState() {
  try {
    execSync("git rev-parse --git-dir", { cwd: root, stdio: "pipe" });
  } catch {
    return { ok: false, branch: "", dirty: true, porcelain: "" };
  }
  let branch = "";
  try {
    branch = execSync("git branch --show-current", {
      cwd: root,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    branch = "(unknown)";
  }
  let porcelain = "";
  try {
    porcelain = execSync("git status --porcelain", {
      cwd: root,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    porcelain = "?";
  }
  const dirty = porcelain.length > 0;
  return { ok: true, branch, dirty, porcelain };
}

function countMigrationFolders() {
  const migRoot = path.join(root, "prisma", "migrations");
  if (!existsSync(migRoot)) return 0;
  let n = 0;
  for (const name of readdirSync(migRoot)) {
    if (name === "migration_lock.toml") continue;
    const p = path.join(migRoot, name);
    try {
      if (!statSync(p).isDirectory()) continue;
      if (existsSync(path.join(p, "migration.sql"))) n += 1;
    } catch {
      // ignore
    }
  }
  return n;
}

function vercelAvailable() {
  try {
    execSync("npx vercel --version", {
      cwd: root,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    try {
      execSync("vercel --version", {
        cwd: root,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Run migrate status without printing Prisma output (may contain hostnames).
 * @returns {'skipped' | 'synced' | 'pending_or_error'}
 */
function prismaMigrateStatusHint() {
  const db = process.env.DATABASE_URL?.trim();
  const direct = process.env.DIRECT_URL?.trim();
  if (!db || !direct) return "skipped";
  try {
    execSync("npx prisma migrate status", {
      cwd: root,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });
    return "synced";
  } catch {
    return "pending_or_error";
  }
}

console.log("");
console.log("Bright Line — production deploy readiness");
console.log("──────────────────────────────────────────");
console.log("");

const blocking = [];
const warnings = [];

const git = gitState();
if (!git.ok) {
  line("❌", "Git: not a repository (run from app root with package.json / prisma/).");
  blocking.push("git");
} else {
  line("✅", `Git: repository OK (branch: ${git.branch || "(detached)"})`);
  if (git.dirty) {
    line("⚠️ ", "Working tree is not clean — `npm run deploy:prod` will refuse until you commit/stash/clean.");
    warnings.push("dirty");
  } else {
    line("✅", "Working tree is clean.");
  }
  if (git.branch !== requiredBranch) {
    line(
      "⚠️ ",
      `Branch is "${git.branch}" but deploy-prod.sh defaults to "${requiredBranch}". Override with REQUIRED_GIT_BRANCH=${git.branch} when running deploy:prod, or merge to ${requiredBranch}.`
    );
    warnings.push("branch");
  } else {
    line("✅", `Branch matches REQUIRED_GIT_BRANCH / default (${requiredBranch}).`);
  }
}

const hasDb = Boolean(process.env.DATABASE_URL?.trim());
const hasDirect = Boolean(process.env.DIRECT_URL?.trim());
if (hasDb) line("✅", "DATABASE_URL is set in this shell (value not shown).");
else {
  line("❌", "DATABASE_URL is not set — cannot verify migration status or run `prisma migrate deploy`.");
  blocking.push("DATABASE_URL");
}
if (hasDirect) line("✅", "DIRECT_URL is set in this shell (value not shown).");
else {
  line("❌", "DIRECT_URL is not set — Prisma schema requires it for migrate (Neon direct URL).");
  blocking.push("DIRECT_URL");
}

const migCount = countMigrationFolders();
if (migCount > 0) {
  line("✅", `prisma/migrations: ${migCount} migration folder(s) with migration.sql.`);
} else {
  line("⚠️ ", "prisma/migrations: none found (unexpected for this project).");
  warnings.push("migrations-folder");
}

const migrateHint = prismaMigrateStatusHint();
if (migrateHint === "skipped") {
  line(
    "⚠️ ",
    "Prisma migrate status: skipped (set DATABASE_URL + DIRECT_URL in this shell to check). This script does not load .env — avoids checking the wrong database by accident."
  );
  warnings.push("migrate-status-skipped");
} else if (migrateHint === "synced") {
  line("✅", "Prisma migrate status: database reports in sync (no pending migrations from this machine).");
} else {
  line(
    "❌",
    "Prisma migrate status: pending migrations, connection error, or drift — run `npx prisma migrate status` yourself with prod env (output may include hostnames; do not paste URLs publicly)."
  );
  blocking.push("migrate-status");
}

if (vercelAvailable()) line("✅", "Vercel CLI available (`npx vercel --version` or `vercel --version`).");
else {
  line("⚠️ ", "Vercel CLI not found — install Vercel CLI or use `npx vercel` for deploy.");
  warnings.push("vercel");
}

console.log("");
console.log("──────────────────────────────────────────");
if (blocking.length === 0 && warnings.length === 0) {
  line("✅", "Checklist: ready for `npm run deploy:prod` (after you type DEPLOY).");
} else if (blocking.length === 0) {
  line("⚠️ ", `Checklist: warnings only (${warnings.join(", ")}). Review before deploy:prod.`);
} else {
  line("❌", `Checklist: fix blocking issues first (${blocking.join(", ")}).`);
}
console.log("");
process.exit(blocking.length > 0 ? 1 : 0);
