#!/usr/bin/env node
/**
 * Watch source files and auto-push after 30s idle.
 * Usage: npm run watch:deploy
 * Run from brightline/ (the Next.js app root).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEBOUNCE_MS = 30_000;

const WATCH_DIRS = ["app", "components", "lib", "public", "prisma", "scripts", "styles"];

let debounceTimer = null;

function scheduleDeploy() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runDeploy, DEBOUNCE_MS);
  console.log(`[watch-deploy] Changes detected. Pushing in ${DEBOUNCE_MS / 1000}s...`);
}

function runDeploy() {
  debounceTimer = null;
  console.log("[watch-deploy] Running git add...");
  const add = spawnSync("git", ["add", "."], { cwd: ROOT, stdio: "inherit" });
  if (add.status !== 0) {
    console.warn("[watch-deploy] git add failed, skipping.");
    return;
  }

  const status = spawnSync("git", ["status", "--short"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const output = (status.stdout || "").trim();
  if (!output) {
    console.log("[watch-deploy] No changes to commit.");
    return;
  }

  console.log("[watch-deploy] Committing...");
  const commit = spawnSync("git", ["commit", "-m", "chore: auto-deploy"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (commit.status !== 0) {
    console.warn("[watch-deploy] git commit failed.");
    return;
  }

  console.log("[watch-deploy] Pushing to origin main...");
  const push = spawnSync("git", ["push", "origin", "main"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (push.status === 0) {
    console.log("[watch-deploy] Done. Vercel will deploy.");
  } else {
    console.warn("[watch-deploy] git push failed.");
  }
}

function watchDir(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) return;
  fs.watch(full, { recursive: true }, () => scheduleDeploy());
}

console.log(`[watch-deploy] Watching ${ROOT} (push after ${DEBOUNCE_MS / 1000}s idle)`);
console.log("[watch-deploy] Press Ctrl+C to stop.\n");

function watchFile(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return;
  try {
    fs.watch(full, () => scheduleDeploy());
  } catch (_) { /* ignore */ }
}

try {
  for (const dir of WATCH_DIRS) watchDir(dir);
  for (const file of ["next.config.ts", "tailwind.config.ts", "postcss.config.mjs", "package.json"]) {
    watchFile(file);
  }
} catch (err) {
  console.error("[watch-deploy] Failed to start watcher:", err.message);
  process.exit(1);
}
