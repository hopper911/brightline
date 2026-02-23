#!/usr/bin/env node
/**
 * One-command publish: runs prep-images then blupload --clean.
 * Usage: node scripts/blpublish.mjs --root /path/to/Exports --section acd --project ci-siamo --location nyc --year 2026
 * Or:    npm run blpublish -- --root /path/to/Exports --section acd --project ci-siamo --location nyc --year 2026
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// Load .env so blupload child process gets R2_* etc.
try {
  const { config } = await import("dotenv");
  config({ path: path.join(projectRoot, ".env.local") });
  config({ path: path.join(projectRoot, ".env") });
} catch {}

const args = process.argv.slice(2);
const rootIdx = args.indexOf("--root");
if (rootIdx < 0 || !args[rootIdx + 1]) {
  console.error("❌ --root path to your Exports folder is required.");
  process.exit(1);
}

const useSheet = args.includes("--sheet");
if (useSheet) {
  const sheetArgs = args.filter((a) => a !== "--sheet");
  const sheetPublish = spawnSync("node", [path.join(__dirname, "sheet-publish.mjs"), ...sheetArgs], {
    stdio: "inherit",
    cwd: projectRoot,
    env: { ...process.env },
  });
  process.exit(sheetPublish.status ?? 0);
}

const prepImagesPath =
  process.env.PREP_IMAGES_SCRIPT || path.join(__dirname, "prep-images.mjs");

if (!fs.existsSync(prepImagesPath)) {
  console.error(`❌ prep-images not found at ${prepImagesPath}`);
  console.error("   Set PREP_IMAGES_SCRIPT to the path to prep-images.mjs if needed.");
  process.exit(1);
}

console.log("📷 Step 1: prep-images (resize + webp + manifest)\n");
const prep = spawnSync("node", [prepImagesPath, ...args], {
  stdio: "inherit",
  cwd: projectRoot,
});
if (prep.status !== 0) {
  process.exit(prep.status ?? 1);
}

const uploadArgs = args.includes("--clean") ? [...args] : [...args, "--clean"];
console.log("\n☁️  Step 2: blupload (R2 + DB) + clean\n");
const blupload = spawnSync("node", [path.join(__dirname, "blupload.mjs"), ...uploadArgs], {
  stdio: "inherit",
  cwd: projectRoot,
  env: { ...process.env },
});
process.exit(blupload.status ?? 0);
