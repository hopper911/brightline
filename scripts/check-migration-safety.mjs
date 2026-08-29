#!/usr/bin/env node
/**
 * Scan prisma/migrations for obviously destructive SQL.
 * Blocking: DROP TABLE, TRUNCATE. Warnings: DROP COLUMN, ALTER TYPE, etc.
 *
 *   node scripts/check-migration-safety.mjs           # all migrations (audit)
 *   node scripts/check-migration-safety.mjs --diff-only  # PR/changed only (CI)
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migRoot = path.join(__dirname, "..", "prisma", "migrations");

const BLOCKING = [
  { label: "DROP TABLE", pattern: /\bDROP\s+TABLE\b/i },
  { label: "TRUNCATE", pattern: /\bTRUNCATE\s+(?:TABLE\s+)?/i },
];

const WARNINGS = [
  { label: "DROP COLUMN", pattern: /\bDROP\s+COLUMN\b/i },
  { label: "ALTER COLUMN TYPE", pattern: /\bALTER\s+COLUMN\b[\s\S]*?\bTYPE\b/i },
  { label: "DROP INDEX", pattern: /\bDROP\s+INDEX\b/i },
  { label: "DROP CONSTRAINT", pattern: /\bDROP\s+CONSTRAINT\b/i },
];

function listMigrationFiles() {
  if (!existsSync(migRoot)) return [];
  const out = [];
  for (const name of readdirSync(migRoot)) {
    if (name === "migration_lock.toml") continue;
    const dir = path.join(migRoot, name);
    try {
      if (!statSync(dir).isDirectory()) continue;
      const sql = path.join(dir, "migration.sql");
      if (existsSync(sql)) out.push({ folder: name, path: sql });
    } catch {
      // skip
    }
  }
  return out.sort((a, b) => a.folder.localeCompare(b.folder));
}

function listChangedMigrationFiles({ addedOnly = false } = {}) {
  const migRootRel = "prisma/migrations";
  let base = process.env.MIGRATION_DIFF_BASE?.trim();
  if (!base) {
    try {
      execSync("git rev-parse --verify origin/main", { stdio: ["ignore", "ignore", "ignore"] });
      base = "origin/main";
    } catch {
      try {
        base = execSync("git merge-base HEAD main 2>/dev/null || git merge-base HEAD origin/main", {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        }).trim();
      } catch {
        base = "HEAD~1";
      }
    }
  }
  let names = [];
  const diffFilter = addedOnly ? "--diff-filter=A" : "";
  // Two-dot diff (base HEAD): migrations present on HEAD but not on base — correct for merge/PR safety.
  // Three-dot (base...HEAD) would treat main-only migrations as "added" on long-lived branches.
  try {
    const raw = execSync(
      `git diff --name-only ${diffFilter} ${base} HEAD -- ${migRootRel}`,
      {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    );
    names = raw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.endsWith("/migration.sql"));
  } catch {
    return [];
  }
  const out = [];
  for (const rel of names) {
    const filePath = path.join(__dirname, "..", rel);
    const folder = path.basename(path.dirname(rel));
    if (existsSync(filePath)) out.push({ folder, path: filePath });
  }
  return out.sort((a, b) => a.folder.localeCompare(b.folder));
}

function scanFile({ folder, path: filePath }) {
  const sql = readFileSync(filePath, "utf8");
  const blocking = [];
  const warnings = [];
  for (const { label, pattern } of BLOCKING) {
    if (pattern.test(sql)) blocking.push(label);
  }
  for (const { label, pattern } of WARNINGS) {
    if (pattern.test(sql)) warnings.push(label);
  }
  return { folder, blocking, warnings };
}

const diffOnly = process.argv.includes("--diff-only");
const files = diffOnly ? listChangedMigrationFiles({ addedOnly: false }) : listMigrationFiles();
const blockingFiles = diffOnly
  ? listChangedMigrationFiles({ addedOnly: true })
  : listMigrationFiles();
const blockingHits = [];
const warningHits = [];

if (diffOnly && files.length === 0 && blockingFiles.length === 0) {
  console.log("Prisma migration safety scan (diff-only)");
  console.log("✅ No migration.sql changes in this diff.");
  process.exit(0);
}

for (const f of blockingFiles) {
  const result = scanFile(f);
  if (result.blocking.length) blockingHits.push(result);
}

for (const f of files) {
  const result = scanFile(f);
  if (result.warnings.length) warningHits.push(result);
}

console.log(`Prisma migration safety scan${diffOnly ? " (diff-only)" : ""}`);
console.log("────────────────────────────");
console.log(`Migrations scanned: ${files.length} changed, ${blockingFiles.length} newly added`);

if (blockingHits.length) {
  console.error("");
  console.error("❌ BLOCKING — destructive patterns:");
  for (const h of blockingHits) {
    console.error(`   ${h.folder}: ${h.blocking.join(", ")}`);
  }
}

if (warningHits.length) {
  console.warn("");
  console.warn("⚠️  WARNINGS — human review recommended:");
  for (const h of warningHits) {
    console.warn(`   ${h.folder}: ${h.warnings.join(", ")}`);
  }
}

if (!blockingHits.length && !warningHits.length) {
  console.log("✅ No flagged destructive patterns.");
}

process.exit(blockingHits.length > 0 ? 1 : 0);
