#!/usr/bin/env node
/**
 * Create minimal sample JPGs in _incoming/full and _incoming/thumb for testing blpublish.
 * Usage: node scripts/create-sample-images.mjs --root /path/to/Exports [--count 2]
 */
import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getArg(name) {
  const args = process.argv.slice(2);
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : null;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function main() {
  const rootRaw = getArg("root");
  if (!rootRaw) {
    console.error("❌ --root path to Exports folder is required.");
    process.exit(1);
  }
  const root = path.resolve(rootRaw);
  const count = Math.max(1, parseInt(getArg("count") || "2", 10));
  const fullDir = path.join(root, "_incoming", "full");
  const thumbDir = path.join(root, "_incoming", "thumb");
  ensureDir(fullDir);
  ensureDir(thumbDir);

  const fullPath = path.join(fullDir, "sample_full.jpg");
  const thumbPath = path.join(thumbDir, "sample_thumb.jpg");

  const fullBuf = await sharp({
    create: { width: 400, height: 300, channels: 3, background: { r: 80, g: 100, b: 120 } },
  })
    .jpeg({ quality: 85 })
    .toBuffer();
  const thumbBuf = await sharp({
    create: { width: 200, height: 150, channels: 3, background: { r: 90, g: 110, b: 130 } },
  })
    .jpeg({ quality: 80 })
    .toBuffer();

  for (let i = 0; i < count; i++) {
    const fullFile = count === 1 ? fullPath : path.join(fullDir, `sample_${String(i + 1).padStart(2, "0")}.jpg`);
    const thumbFile = count === 1 ? thumbPath : path.join(thumbDir, `sample_${String(i + 1).padStart(2, "0")}.jpg`);
    fs.writeFileSync(fullFile, fullBuf);
    fs.writeFileSync(thumbFile, thumbBuf);
  }

  console.log(`✅ Wrote ${count} sample image pair(s) to ${fullDir} and ${thumbDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
