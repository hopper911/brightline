#!/usr/bin/env node
/**
 * Prep images: resize + webp + manifest for blupload.
 * Usage: npm run prep -- --root "...Exports" --section acd [--date yyyymmdd]
 * Sections: acd, rea, cul, biz, tri
 */
import fs from "fs";
import path from "path";
import process from "process";
import { execSync } from "child_process";
import sharp from "sharp";

const ALLOWED_SECTIONS = ["acd", "rea", "cul", "biz", "tri"];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function getArg(name) {
  const args = process.argv.slice(2);
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : null;
}

/** Read EXIF metadata: title, caption, keywords (requires exiftool) */
function readExifMeta(filePath) {
  try {
    const out = execSync("exiftool", ["-j", "-n", filePath], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });
    const data = JSON.parse(out)?.[0] ?? {};
    const title =
      data["Title"] || data["ObjectName"] || data["Headline"] || "";
    const caption =
      data["Description"] ||
      data["Caption-Abstract"] ||
      data["ImageDescription"] ||
      "";
    let keywords = data["Keywords"] || [];
    if (typeof keywords === "string") keywords = [keywords];
    if (!Array.isArray(keywords)) keywords = [];
    return {
      title: String(title || "").trim(),
      caption: String(caption || "").trim(),
      keywords: keywords.map((k) => String(k).trim()).filter(Boolean),
    };
  } catch {
    return { title: "", caption: "", keywords: [] };
  }
}

/** Read date from EXIF (DateTimeOriginal, CreateDate). Returns yyyymmdd or null. */
function readExifDate(filePath) {
  try {
    const out = execSync(
      "exiftool",
      ["-DateTimeOriginal", "-CreateDate", "-s3", "-n", filePath],
      { encoding: "utf8", maxBuffer: 1024 * 1024 }
    );
    const s = (out || "").trim().replace(/\s+/g, ":");
    const m = s.match(/^(\d{4}):(\d{2}):(\d{2})/);
    if (m) return `${m[1]}${m[2]}${m[3]}`;
    return null;
  } catch {
    return null;
  }
}

const rootRaw = getArg("root");
if (!rootRaw) {
  console.error("❌ You must provide --root path to your Exports folder.");
  process.exit(1);
}

const root = path.resolve(rootRaw);
const INCOMING_FULL = path.join(root, "_incoming/full");
const INCOMING_THUMB = path.join(root, "_incoming/thumb");
const OUT_FULL = path.join(root, "_out/full");
const OUT_THUMB = path.join(root, "_out/thumb");
const MANIFEST_PATH = path.join(root, "_out/manifest.json");

// Validate section
const sectionRaw = (getArg("section") || "").trim().toLowerCase();
if (!ALLOWED_SECTIONS.includes(sectionRaw)) {
  console.error(
    `❌ --section must be one of: ${ALLOWED_SECTIONS.join(", ")}. Got: ${sectionRaw || "(empty)"}`
  );
  process.exit(1);
}
const section = sectionRaw;
const dateOverride = getArg("date"); // optional yyyymmdd

ensureDir(INCOMING_FULL);
ensureDir(INCOMING_THUMB);
ensureDir(OUT_FULL);
ensureDir(OUT_THUMB);

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

const fullFiles = listImages(INCOMING_FULL);
const thumbFiles = listImages(INCOMING_THUMB);

if (fullFiles.length === 0 || thumbFiles.length === 0) {
  console.error(
    `❌ Missing input images. Ensure these folders exist and contain JPG/PNG:\n` +
      `   ${INCOMING_FULL}\n` +
      `   ${INCOMING_THUMB}\n` +
      `   Run: mkdir -p "${INCOMING_FULL}" "${INCOMING_THUMB}"`
  );
  process.exit(1);
}

if (fullFiles.length !== thumbFiles.length) {
  console.error(
    `❌ Count mismatch: full=${fullFiles.length}, thumb=${thumbFiles.length}.\n` +
      `   Export matching FULL and THUMB sets from Lightroom. Pair by index.`
  );
  process.exit(1);
}

const count = fullFiles.length;
let yyyymmdd = dateOverride;
let usedToday = false;

if (!yyyymmdd && count > 0) {
  yyyymmdd = readExifDate(path.join(INCOMING_FULL, fullFiles[0]));
  if (!yyyymmdd) {
    yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    usedToday = true;
    console.warn(
      "⚠️ No EXIF date and --date not provided. Using today: " + yyyymmdd
    );
  }
}

const yyyyMmDd =
  yyyymmdd && yyyymmdd.length >= 8
    ? `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
    : new Date().toISOString().slice(0, 10);

const manifest = [];

async function run() {
  console.log(`Processing ${count} image(s) for section=${section}, date=${yyyyMmDd}...\n`);

  for (let idx = 0; idx < count; idx++) {
    const seq3 = String(idx + 1).padStart(3, "0");
    const fullName = `${section}-${yyyymmdd}-${seq3}.webp`;
    const thumbName = `${section}-${yyyymmdd}-${seq3}_t.webp`;

    const fullSrc = path.join(INCOMING_FULL, fullFiles[idx]);
    const thumbSrc = path.join(INCOMING_THUMB, thumbFiles[idx]);
    const fullDest = path.join(OUT_FULL, fullName);
    const thumbDest = path.join(OUT_THUMB, thumbName);

    const meta = readExifMeta(fullSrc);
    manifest.push({
      seq_n: idx + 1,
      filename_final: fullName,
      full_path: fullDest,
      thumb_path: thumbDest,
      yyyymmdd,
      "yyyy-mm-dd": yyyyMmDd,
      title: meta.title,
      caption: meta.caption,
      keywords: meta.keywords,
    });

    process.stdout.write(
      `  [${String(idx + 1).padStart(2, "0")}/${String(count).padStart(2, "0")}] Resize + WebP... `
    );

    await sharp(fullSrc)
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(fullDest);

    await sharp(thumbSrc)
      .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 70 })
      .toFile(thumbDest);

    console.log(`✅ ${fullName} + ${thumbName}`);
  }

  const manifestData = {
    section,
    yyyymmdd,
    "yyyy-mm-dd": yyyyMmDd,
    createdAt: new Date().toISOString(),
    items: manifest,
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifestData, null, 2));
  console.log(`\n✅ Manifest: ${MANIFEST_PATH}`);
  console.log("\nDone. Next: npm run blupload -- --root ... --section " + section + " --project ... --location ... --year ...\n");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
