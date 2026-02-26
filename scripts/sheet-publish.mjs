#!/usr/bin/env node
/**
 * Sheet-driven publish: read READY rows from Google Sheet, prep from _incoming/full,
 * write to _published/jpg and _published/webp, upload to R2, write back to sheet, upsert DB.
 * Usage: node scripts/sheet-publish.mjs --root /path/to/Exports [--credentials /path/to/credentials.json]
 */
import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// ——— Sheet column map (0-based indices) ———
// Headers: Thumb_Preview, Uploaded file, Filename_Base, Pillar_Slug, Section_Slug, Client_Slug,
// Location, Year, Project_N, Sequence, Filename_Final, R2_Key, R2_Key_Full, R2_Key_Thumb, R2_WEBP,
// Ready, Alt_Text, Caption, Description, Hero_Image, Orientation, Usage_Type, Year_N, Seq_N, Status, Upload, Error
const COL_PILLAR = 3;
const COL_SECTION = 4;
const COL_READY = 15;
const COL_R2_JPG = 12; // R2_Key_Full
const COL_R2_WEBP = 14;
const COL_STATUS = 24;
const COL_UPLOADED = 25;
const COL_WIDTH = 22;  // Year_N or computed
const COL_HEIGHT = 23; // Seq_N or computed
const COL_ORIENTATION = 20;
const COL_ALT_TEXT = 16;
const COL_CAPTION = 17;
const COL_HERO_IMAGE = 19;
const COL_ORIENTATION = 20;
const COL_USAGE_TYPE = 21;
const COL_TAGS = 27;

const PILLAR_TO_SECTION = { architecture: "rea", campaign: "acd", corporate: "biz" };

const SHEET_ID = "1i1Dv4Mg_T5XB_Ee5MMOfYHm7EsJ8mIZRFcWS2rN7Z5E";
const RANGE = "Sheet1!A2:AE500";

// Load env
try {
  const { config } = await import("dotenv");
  const cwd = process.cwd();
  const envFiles = [".env", ".env.local", ".env.development", ".env.development.local"];
  for (const base of [cwd, projectRoot].filter(Boolean)) {
    for (const f of envFiles) {
      config({ path: path.join(base, f), override: false });
    }
  }
} catch {}

const directDbUrl =
  process.env.DIRECT_URL ||
  process.env.STORAGE_POSTGRES_URL ||
  (process.env.STORAGE_PRISMA_DATABASE_URL?.startsWith("postgres://")
    ? process.env.STORAGE_PRISMA_DATABASE_URL
    : null);
if (directDbUrl) {
  process.env.DATABASE_URL = directDbUrl;
}

const prisma = new PrismaClient();

function getArg(name) {
  const args = process.argv.slice(2);
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : null;
}

function must(v, label) {
  if (!v) {
    console.error(`❌ Missing ${label}`);
    process.exit(1);
  }
  return v;
}

function colToLetter(n) {
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function getOrientation(w, h) {
  if (w > h) return "Horizontal";
  if (h > w) return "Vertical";
  return "Square";
}

/** Parse R2 key like "csp/2-0v8/00.jpg" -> { section, client, seq, ext } */
function parseR2Key(key) {
  const normalized = key.replace(/\\/g, "/").trim();
  const parts = normalized.split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "";
  const dot = last.lastIndexOf(".");
  const ext = dot >= 0 ? last.slice(dot) : "";
  const seq = dot >= 0 ? last.slice(0, dot) : last;
  const section = parts[0] || "";
  const client = parts[1] || "";
  return { section, client, seq, ext };
}

function listIncomingFilesByMtime(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|tif|tiff)$/i.test(f))
    .map((f) => {
      const p = path.join(dir, f);
      const stat = fs.statSync(p);
      return { file: f, path: p, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => a.mtimeMs - b.mtimeMs);
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function getSheetRows(auth) {
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: RANGE,
  });
  return res.data.values || [];
}

async function updateSheetRow(auth, sheetRowIndex, values) {
  const sheets = google.sheets({ version: "v4", auth });
  const startCol = colToLetter(COL_STATUS);
  const endCol = colToLetter(COL_ORIENTATION);
  const range = `Sheet1!${startCol}${sheetRowIndex}:${endCol}${sheetRowIndex}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

async function main() {
  const rootRaw = getArg("root");
  if (!rootRaw) {
    console.error("❌ --root path to Exports folder is required.");
    process.exit(1);
  }
  const root = path.resolve(rootRaw);
  const incomingFullDir = path.join(root, "_incoming", "full");
  const publishedJpgDir = path.join(root, "_published", "jpg");
  const publishedWebpDir = path.join(root, "_published", "webp");
  ensureDir(publishedJpgDir);
  ensureDir(publishedWebpDir);

  const credentialsPath =
    getArg("credentials") ||
    path.resolve(projectRoot, "..", "tools", "credentials.json");
  if (!fs.existsSync(credentialsPath)) {
    console.error(`❌ Credentials not found at ${credentialsPath}. Use --credentials /path/to/credentials.json`);
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const BUCKET = must(process.env.R2_BUCKET, "R2_BUCKET");
  const ENDPOINT = must(process.env.R2_ENDPOINT, "R2_ENDPOINT");
  const PUBLIC_URL = must(process.env.R2_PUBLIC_URL, "R2_PUBLIC_URL").replace(/\/$/, "");

  const s3 = new S3Client({
    region: process.env.R2_REGION || "auto",
    endpoint: ENDPOINT,
    credentials: {
      accessKeyId: must(process.env.R2_ACCESS_KEY_ID, "R2_ACCESS_KEY_ID"),
      secretAccessKey: must(process.env.R2_SECRET_ACCESS_KEY, "R2_SECRET_ACCESS_KEY"),
    },
  });

  async function uploadToR2(localPath, key, contentType) {
    const body = fs.readFileSync(localPath);
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    return `${PUBLIC_URL}/${key}`;
  }

  const allRows = await getSheetRows(auth);
  const readyRows = [];
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    const readyVal = String(row[COL_READY] ?? "").trim().toUpperCase();
    const isReady = readyVal === "TRUE" || readyVal.includes("READY");
    if (!isReady) continue;
    const r2jpg = (row[COL_R2_JPG] || "").trim();
    const r2webp = (row[COL_R2_WEBP] || "").trim();
    if (!r2jpg) continue;
    const pillar = String(row[COL_PILLAR] ?? "").trim().toLowerCase();
    const parsed = parseR2Key(r2jpg);
    const section = pillar && PILLAR_TO_SECTION[pillar]
      ? PILLAR_TO_SECTION[pillar]
      : parsed.section || "biz";
    readyRows.push({
      sheetRowIndex: i + 2,
      row,
      r2jpg,
      r2webp: r2webp || r2jpg.replace(/\.(jpe?g|png)$/i, ".webp"),
      parsed: { ...parsed, section },
    });
  }

  if (readyRows.length === 0) {
    console.log("No rows with Ready=READY and R2_JPG set. Nothing to do.");
    await prisma.$disconnect();
    return;
  }

  const localFiles = listIncomingFilesByMtime(incomingFullDir);
  if (localFiles.length < readyRows.length) {
    console.error(
      `❌ Not enough images in _incoming/full: found ${localFiles.length}, need ${readyRows.length} (one per READY row in order).`
    );
    process.exit(1);
  }

  console.log(`\n📷 Sheet-driven publish: ${readyRows.length} READY row(s), ${localFiles.length} image(s) in _incoming/full\n`);

  const galleriesBySlug = new Map();

  for (let idx = 0; idx < readyRows.length; idx++) {
    const { sheetRowIndex, row, r2jpg, r2webp, parsed } = readyRows[idx];
    const { section, client, seq } = parsed; // section may be derived from pillar
    const localFile = localFiles[idx];
    const localPath = localFile.path;

    process.stdout.write(`  [${idx + 1}/${readyRows.length}] ${r2jpg} ... `);

    const img = sharp(localPath);
    const meta = await img.metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    const orientation = getOrientation(w, h);

    const jpgKey = `${section}/${client}/${seq}.jpg`;
    const webpKey = `${section}/${client}/${seq}.webp`;
    const jpgOutPath = path.join(publishedJpgDir, section, client, `${seq}.jpg`);
    const webpOutPath = path.join(publishedWebpDir, section, client, `${seq}.webp`);
    ensureDir(path.dirname(jpgOutPath));
    ensureDir(path.dirname(webpOutPath));

    await img
      .clone()
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toFile(jpgOutPath);
    await img
      .clone()
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(webpOutPath);

    await uploadToR2(jpgOutPath, jpgKey, "image/jpeg");
    const webpUrl = await uploadToR2(webpOutPath, webpKey, "image/webp");

    await updateSheetRow(auth, sheetRowIndex, [
      "Uploaded",
      "TRUE",
      String(w),
      String(h),
      orientation,
    ]);

    const gallerySlug = `${section}-${client}`;
    if (!galleriesBySlug.has(gallerySlug)) {
      const gallery = await prisma.gallery.upsert({
        where: { slug: gallerySlug },
        update: {},
        create: {
          slug: gallerySlug,
          title: `${section} / ${client}`,
          description: null,
          published: false,
        },
      });
      galleriesBySlug.set(gallerySlug, gallery);
    }
    const gallery = galleriesBySlug.get(gallerySlug);
    const sortOrder = parseInt(seq, 10) >= 0 ? parseInt(seq, 10) + 1 : idx + 1;
    const existingCount = await prisma.galleryImage.count({ where: { galleryId: gallery.id } });
    const isFirst = existingCount === 0;
    const altText = (row[COL_ALT_TEXT] || "").trim();
    const heroVal = String(row[COL_HERO_IMAGE] ?? "").trim().toUpperCase();
    const isHero = /^(TRUE|YES|1|X|✓|✅)$/.test(heroVal) || isFirst;
    const tagsRaw = (row[COL_TAGS] || "").trim();
    const tags = tagsRaw ? tagsRaw.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : [];
    const caption = (row[COL_CAPTION] || "").trim();
    const usageType = (row[COL_USAGE_TYPE] || "").trim() || null;
    const meta =
      caption || tags.length || usageType
        ? { ...(caption && { caption }), ...(tags.length && { keywords: tags }), ...(usageType && { usageType }) }
        : undefined;
    await prisma.galleryImage.create({
      data: {
        galleryId: gallery.id,
        url: webpUrl,
        fullUrl: webpUrl,
        thumbUrl: webpUrl,
        alt: altText || `${section} ${client} ${seq}`,
        filename: `${seq}.webp`,
        sortOrder,
        isHero,
        storageKey: webpKey,
        ...(meta && Object.keys(meta).length > 0 && { meta }),
      },
    });

    console.log(`OK (${w}x${h}, ${orientation})`);
  }

  console.log("\n✅ Done. Sheet updated; R2 and DB updated. Create an access code for the gallery to view on the site.\n");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
