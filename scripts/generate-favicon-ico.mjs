#!/usr/bin/env node
/**
 * Generates favicon assets from public/favicon.png (single source of truth).
 *
 * Tab / SERP icons (favicon.ico): uses a top crop of the master so "BL" + gold line
 * stay visible at 16–48px. The full 512px layout shrinks to a plain "BL" blob if we
 * only downscale — that mismatch is why Google showed different icons per URL.
 *
 * Large icons (192, 512, apple): full master, no crop.
 *
 * Run: node scripts/generate-favicon-ico.mjs
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const sharp = require("sharp");
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = join(__dirname, "../public/favicon.png");
const root = join(__dirname, "..");

/** Top portion of the square master: BL + bright line (drops tiny "PHOTOGRAPHY" band). */
const TAB_ICON_CROP_RATIO = 0.55;

/**
 * ICO with multiple embedded PNGs (16, 32, 48) for crisp picks across browsers & Google.
 */
function createIcoFromPngs(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = 6 + 16 * count;
  const parts = [header];

  for (const img of images) {
    const entry = Buffer.alloc(16);
    const w = img.width;
    const h = img.height;
    entry[0] = w >= 256 ? 0 : w;
    entry[1] = h >= 256 ? 0 : h;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    parts.push(entry);
    offset += img.buffer.length;
  }
  for (const img of images) {
    parts.push(img.buffer);
  }
  return Buffer.concat(parts);
}

async function tabIconBase() {
  const meta = await sharp(inputPath).metadata();
  const w = meta.width ?? 512;
  const h = meta.height ?? 512;
  const cropH = Math.max(32, Math.round(h * TAB_ICON_CROP_RATIO));
  return sharp(inputPath).extract({ left: 0, top: 0, width: w, height: cropH });
}

async function main() {
  const tab = await tabIconBase();

  const sizes = [16, 32, 48];
  const pngs = [];
  for (const s of sizes) {
    const buf = await tab.clone().resize(s, s).png().toBuffer();
    pngs.push({ buffer: buf, width: s, height: s });
  }

  const icoPath = join(root, "public/favicon.ico");
  writeFileSync(icoPath, createIcoFromPngs(pngs));
  console.log(`Created ${icoPath} (16+32+48)`);

  const publicSizes = [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["apple-icon.png", 180],
  ];
  for (const [name, size] of publicSizes) {
    const out = join(root, "public", name);
    await sharp(inputPath).resize(size, size).png().toFile(out);
    console.log(`Created ${out}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
