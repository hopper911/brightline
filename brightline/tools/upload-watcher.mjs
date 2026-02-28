import "dotenv/config";
import chokidar from "chokidar";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { lookup as mimeLookup } from "mime-types";
import sharp from "sharp";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

/**
 * Bright Line T9 Watcher — Optimized Flow
 *
 * 1. Detects new files in /Volumes/T9/05_EXPORTS/WEB_FULL/{architecture,campaign,corporate}
 * 2. Appends row to Google Sheet (Status=NEW)
 * 3. Fetches pending rows, uploads to R2, updates sheet
 *
 * Filename format: bl-{arc,cam,cor}-{yyyymmdd}-{seq}.ext
 */

const DRIVE = "T9";
const WATCH_ROOT = `/Volumes/${DRIVE}/05_EXPORTS/WEB_FULL`;
const R2_PREFIX = "portfolio";

import { PILLARS, T9_FOLDER_TO_PILLAR } from "./pillars.mjs";

const THUMB_LONG_EDGE = 800;
const THUMB_WEBP_QUALITY = 80;
const STABLE_MS = 1500;

const inFlight = new Set();

function requireEnv(name) {
  if (!process.env[name]) throw new Error(`Missing env var: ${name}`);
  return process.env[name];
}

requireEnv("R2_ACCESS_KEY_ID");
requireEnv("R2_SECRET_ACCESS_KEY");
requireEnv("R2_BUCKET");
requireEnv("R2_ENDPOINT");

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const SHEET_WEBHOOK_URL = process.env.SHEET_WEBHOOK_URL || "";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const TOOLS_DIR = __dirname;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fileSize(filePath) {
  const s = await fs.promises.stat(filePath);
  return s.size;
}

async function waitUntilStable(filePath) {
  let last = -1;
  for (let i = 0; i < 10; i++) {
    const now = await fileSize(filePath);
    if (now === last && now > 0) return;
    last = now;
    await sleep(STABLE_MS);
  }
  console.warn(`[WARN] File may still be writing: ${filePath}`);
}

function getNextSequence(pillar, yyyymmdd) {
  const seqFile = path.join(TOOLS_DIR, `.seq-${pillar}-${yyyymmdd}.json`);
  let last = 0;
  try {
    const data = JSON.parse(fs.readFileSync(seqFile, "utf8"));
    last = Number(data.last) || 0;
  } catch {
    /* file missing */
  }
  last += 1;
  fs.writeFileSync(seqFile, JSON.stringify({ last }) + "\n");
  return String(last).padStart(3, "0");
}

function deriveCleanFilename(filePath, pillar) {
  const stat = fs.statSync(filePath);
  const d = new Date(stat.mtime);
  const yyyymmdd = d.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = getNextSequence(pillar, yyyymmdd);
  const ext = path.extname(filePath).toLowerCase();
  return `bl-${pillar}-${yyyymmdd}-${seq}${ext}`;
}

function parsePillar(filePath) {
  const norm = path.normalize(filePath);
  const parts = norm.split(path.sep);
  const idx = parts.indexOf("WEB_FULL");
  if (idx === -1 || !parts[idx + 1]) {
    throw new Error(`Unexpected path structure: ${filePath}`);
  }
  const folder = parts[idx + 1];
  const filename = parts[parts.length - 1];
  const pillar = T9_FOLDER_TO_PILLAR[folder];
  if (!pillar) {
    throw new Error(`Unknown folder "${folder}". Use: arc, cam, cor or architecture, campaign, corporate`);
  }
  return { pillar, filename };
}

async function r2Exists(bucket, key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadToR2({ bucket, key, filePath, contentType: explicitContentType }) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = explicitContentType ?? mimeLookup(ext) ?? "application/octet-stream";
  const cacheControl = "public, max-age=31536000, immutable";

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fs.createReadStream(filePath),
      ContentType: contentType,
      CacheControl: cacheControl,
    })
  );
}

async function makeThumbTemp(fullPath) {
  const tmpName =
    "brightline-thumb-" +
    path.basename(fullPath, path.extname(fullPath)) +
    ".webp";
  const tmpPath = path.join(os.tmpdir(), tmpName);

  await sharp(fullPath)
    .rotate()
    .resize({
      width: THUMB_LONG_EDGE,
      height: THUMB_LONG_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: THUMB_WEBP_QUALITY })
    .toFile(tmpPath);

  return tmpPath;
}

// ——— Sheet API ———

async function sheetAppend(payload) {
  if (!SHEET_WEBHOOK_URL) return null;
  const body = {
    action: "append",
    filename_base: payload.filename_base,
    section_slug: payload.section_slug,
    file_path: payload.file_path,
    file_size: payload.file_size,
    created_at: new Date().toISOString(),
  };
  if (WEBHOOK_SECRET) body.secret = WEBHOOK_SECRET;

  const res = await fetch(SHEET_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Sheet append failed");
  return json.row;
}

async function sheetGetPending() {
  if (!SHEET_WEBHOOK_URL) return [];
  const sep = SHEET_WEBHOOK_URL.includes("?") ? "&" : "?";
  const getUrl =
    SHEET_WEBHOOK_URL +
    sep +
    "action=pending" +
    (WEBHOOK_SECRET ? `&secret=${encodeURIComponent(WEBHOOK_SECRET)}` : "");

  const res = await fetch(getUrl);
  const json = await res.json();
  if (!json.ok) return [];
  return json.rows || [];
}

async function sheetUpdate(payload) {
  if (!SHEET_WEBHOOK_URL) return;
  const body = {
    action: "update",
    row: payload.row,
    filename_final: payload.filename_final,
    r2_key_full: payload.r2_key_full,
    r2_key_thumb: payload.r2_key_thumb,
    status: payload.status,
    error: payload.error,
  };
  if (WEBHOOK_SECRET) body.secret = WEBHOOK_SECRET;

  const res = await fetch(SHEET_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Sheet update failed");
}

// ——— Upload logic ———

async function processPendingUploads() {
  if (!SHEET_WEBHOOK_URL) return;

  const rows = await sheetGetPending();
  if (rows.length === 0) return;

  const bucket = process.env.R2_BUCKET;
  const r2PublicUrl = process.env.R2_PUBLIC_URL || "";

  for (const r of rows) {
    const { row, filename_base, section_slug, file_path } = r;
    if (!fs.existsSync(file_path)) {
      console.warn(`[WARN] File gone: ${file_path}`);
      await sheetUpdate({ row, status: "Error", error: "File not found" }).catch(() => {});
      continue;
    }

    try {
      const ext = path.extname(file_path).toLowerCase();
      if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) continue;

      const filenameFinal = deriveCleanFilename(file_path, section_slug);
      const baseForThumb = path.basename(filenameFinal, path.extname(filenameFinal));
      const fullKey = `${R2_PREFIX}/${section_slug}/web_full/${filenameFinal}`;
      const thumbKey = `${R2_PREFIX}/${section_slug}/web_thumb/${baseForThumb}.webp`;

      const fullAlready = await r2Exists(bucket, fullKey);
      const thumbAlready = await r2Exists(bucket, thumbKey);

      if (!fullAlready) {
        await uploadToR2({ bucket, key: fullKey, filePath: file_path });
        console.log(`[OK] Uploaded FULL  -> ${fullKey}`);
      }

      if (!thumbAlready) {
        const thumbTempPath = await makeThumbTemp(file_path);
        await uploadToR2({
          bucket,
          key: thumbKey,
          filePath: thumbTempPath,
          contentType: "image/webp",
        });
        try {
          fs.unlinkSync(thumbTempPath);
        } catch {}
        console.log(`[OK] Uploaded THUMB -> ${thumbKey}`);
      }

      if (r2PublicUrl) {
        console.log(`     FULL  URL -> ${r2PublicUrl}/${fullKey}`);
        console.log(`     THUMB URL -> ${r2PublicUrl}/${thumbKey}`);
      }

      await sheetUpdate({
        row,
        filename_final: filenameFinal,
        r2_key_full: fullKey,
        r2_key_thumb: thumbKey,
        status: "Uploaded",
        error: "",
      });
    } catch (err) {
      console.error(`[ERR] Upload failed: ${file_path}`, err);
      await sheetUpdate({
        row,
        status: "Error",
        error: String(err?.message || err),
      }).catch(() => {});
    }
  }
}

// ——— Watcher handler ———

async function onFileAdded(filePath) {
  if (inFlight.has(filePath)) return;
  inFlight.add(filePath);

  try {
    if (!fs.existsSync(filePath)) return;

    const base = path.basename(filePath);
    if (base.startsWith(".") || base.endsWith(".tmp")) return;

    const ext = path.extname(base).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
      console.log(`[SKIP] Not an image: ${filePath}`);
      return;
    }

    const { pillar, filename } = parsePillar(filePath);
    const filenameBase = path.basename(filename, path.extname(filename));
    const fileSizeBytes = await fileSize(filePath);

    await waitUntilStable(filePath);

    if (SHEET_WEBHOOK_URL) {
      await sheetAppend({
        filename_base: filenameBase,
        section_slug: pillar,
        file_path: filePath,
        file_size: fileSizeBytes,
      });
      console.log(`[SHEET] Appended: ${filenameBase} (${pillar})`);
      await processPendingUploads();
    } else {
      // Fallback: direct upload when no sheet
      console.warn("[WARN] SHEET_WEBHOOK_URL not set — using direct upload");
      const bucket = process.env.R2_BUCKET;
      const filenameFinal = deriveCleanFilename(filePath, pillar);
      const baseForThumb = path.basename(filenameFinal, path.extname(filenameFinal));
      const fullKey = `${R2_PREFIX}/${pillar}/web_full/${filenameFinal}`;
      const thumbKey = `${R2_PREFIX}/${pillar}/web_thumb/${baseForThumb}.webp`;

      if (!(await r2Exists(bucket, fullKey))) {
        await uploadToR2({ bucket, key: fullKey, filePath });
        console.log(`[OK] Uploaded FULL  -> ${fullKey}`);
      }
      if (!(await r2Exists(bucket, thumbKey))) {
        const thumbTempPath = await makeThumbTemp(filePath);
        await uploadToR2({ bucket, key: thumbKey, filePath: thumbTempPath, contentType: "image/webp" });
        try {
          fs.unlinkSync(thumbTempPath);
        } catch {}
        console.log(`[OK] Uploaded THUMB -> ${thumbKey}`);
      }
    }
  } catch (err) {
    console.error(`[ERR] Processing failed: ${filePath}`, err);
  } finally {
    inFlight.delete(filePath);
  }
}

// ——— Main ———

console.log(`BrightLine watcher starting…`);
console.log(`Watching: ${WATCH_ROOT}`);
console.log(`Pillars: ${PILLARS.join(", ")}`);
console.log(`Filename format: bl-{arc,cam,cor}-{yyyymmdd}-{seq}.ext`);
if (!SHEET_WEBHOOK_URL) console.warn("[WARN] SHEET_WEBHOOK_URL not set — sheet sync disabled");

const watcher = chokidar.watch(WATCH_ROOT, {
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: STABLE_MS,
    pollInterval: 200,
  },
});

watcher.on("add", onFileAdded);
watcher.on("error", (e) => console.error("[WATCHER ERROR]", e));
