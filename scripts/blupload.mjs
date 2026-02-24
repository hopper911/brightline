/**
 * Upload gallery images to R2 and upsert gallery + GalleryImages in DB.
 * Usage: npm run blupload -- --root "...Exports" --section acd --project ci-siamo --location nyc --year 2026
 * Sections: acd, rea, cul, biz, tri
 */
import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// Load env from app root and cwd (Next-style: .env, .env.local, .env.development.local when NODE_ENV=development)
try {
  const { config } = await import("dotenv");
  const cwd = process.cwd();
  const envFiles = [".env", ".env.local", ".env.development", ".env.development.local"];
  for (const base of [cwd, projectRoot].filter(Boolean)) {
    for (const f of envFiles) {
      config({ path: path.join(base, f), override: false });
    }
  }
} catch {
  // dotenv optional
}

// Use direct Postgres URL in scripts to avoid Accelerate TLS issues in Node
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

function slugify(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

function listWebp(dir, thumb = false) {
  if (!fs.existsSync(dir)) return [];
  const re = thumb ? FILENAME_REGEX_THUMB : FILENAME_REGEX;
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".webp") && re.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function checkR2Env() {
  const required = [
    "R2_BUCKET",
    "R2_ENDPOINT",
    "R2_PUBLIC_URL",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(
      `❌ Missing R2 env vars: ${missing.join(", ")}\n` +
        `   Add to .env.local or export before running.`
    );
    process.exit(1);
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

const FILENAME_REGEX = /^[a-z]{3}-\d{8}-\d{3}\.webp$/;
const FILENAME_REGEX_THUMB = /^[a-z]{3}-\d{8}-\d{3}_t\.webp$/;

const clean = getArg("clean") !== null || process.argv.includes("--clean");

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    return null;
  }
}

const ALLOWED_SECTIONS = ["acd", "rea", "cul", "biz", "tri"];
const SECTION_DISPLAY_NAMES = {
  acd: "Advertising & Campaign Development",
  rea: "Real Estate",
  cul: "Culture",
  biz: "Business Professional",
  tri: "Travel & Leisure",
};

function parseDateFromFilename(filename) {
  // Assume {section}-{yyyymmdd}-{seq3}.webp
  const base = path.basename(filename, ".webp");
  const m = base.match(/^[a-z]{3}-(\d{4})(\d{2})(\d{2})-\d{3}$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

// CLI inputs
const sectionRaw = (getArg("section") || "").trim().toLowerCase();
if (!ALLOWED_SECTIONS.includes(sectionRaw)) {
  console.error(`❌ --section must be one of: ${ALLOWED_SECTIONS.join(", ")}. Got: ${sectionRaw || "(empty)"}`);
  process.exit(1);
}
const section = sectionRaw;
const project = slugify(must(getArg("project"), "--project"));
const location = slugify(must(getArg("location"), "--location"));
const year = slugify(must(getArg("year"), "--year"));

// Gallery slug convention (stable + readable): section-project-location-year
const gallerySlug = `${section}-${project}-${location}-${year}`;

checkR2Env();

// R2 config (R2_PUBLIC_URL = base URL for public objects, e.g. https://pub-xxx.r2.dev)
const BUCKET = process.env.R2_BUCKET;
const ENDPOINT = process.env.R2_ENDPOINT;
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

const client = new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function uploadWebp(localPath, key) {
  const body = fs.readFileSync(localPath);
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return `${PUBLIC_URL}/${key}`;
}

function altFromParts({ section, project, location }) {
  const displayName = SECTION_DISPLAY_NAMES[section] ?? section;
  const proj = project.replace(/-/g, " ");
  const loc = location.toUpperCase();
  return `${displayName} photography — ${proj} in ${loc} by Bright Line Photography.`;
}

function formatTitle(project, location, year) {
  const proj = project.replace(/-/g, " ");
  const loc = location.toUpperCase();
  return `${proj} (${loc}, ${year})`;
}

async function main() {
  const fullFiles = listWebp(OUT_FULL, false);
  const thumbFiles = listWebp(OUT_THUMB, true);

  if (fullFiles.length === 0 || thumbFiles.length === 0) {
    console.error(
      `❌ No .webp files in _out/full or _out/thumb. Run prep-images first.\n` +
        `   Expected full: {section}-{yyyymmdd}-{seq3}.webp (e.g. acd-20260214-001.webp)\n` +
        `   Expected thumb: {section}-{yyyymmdd}-{seq3}_t.webp (e.g. acd-20260214-001_t.webp)`
    );
    process.exit(1);
  }

  const thumbMap = new Map(thumbFiles.map((t) => [t.replace(/_t\.webp$/, ".webp"), t]));

  const paired = [];
  for (const f of fullFiles) {
    const t = thumbMap.get(f);
    if (!t) {
      console.error(
        `❌ No matching thumb for ${f}. Expected: ${f.replace(".webp", "_t.webp")}\n` +
          `   Full and thumb counts must match. Re-run prep-images.`
      );
      process.exit(1);
    }
    paired.push({ full: f, thumb: t });
  }

  if (paired.length !== fullFiles.length || paired.length !== thumbFiles.length) {
    console.error(
      `❌ Count mismatch: full=${fullFiles.length}, thumb=${thumbFiles.length}.\n` +
        `   Export matching FULL and THUMB from Lightroom, then re-run prep-images.`
    );
    process.exit(1);
  }

  let dateFallbackWarned = false;

  const manifest = loadManifest();

  const sectionDisplay = SECTION_DISPLAY_NAMES[section] ?? section;
  const gallery = await prisma.gallery.upsert({
    where: { slug: gallerySlug },
    update: { title: formatTitle(project, location, year), section },
    create: {
      slug: gallerySlug,
      title: formatTitle(project, location, year),
      description: `${sectionDisplay} photography for ${project.replace(/-/g, " ")} in ${location.toUpperCase()}, ${year}.`,
      section,
      published: false,
    },
  });

  const pairCount = paired.length;
  const defaultAlt = altFromParts({ section, project, location });

  console.log(`\nUploading ${pairCount} pairs to R2 + saving to DB...`);
  console.log(`Gallery: ${gallerySlug}\n`);

  for (let i = 0; i < pairCount; i++) {
    const fullName = paired[i].full;
    const thumbName = paired[i].thumb;

    const m = manifest?.items?.[i] ?? {};
    const title = (m.title || "").trim();
    const caption = (m.caption || "").trim();
    const keywords = Array.isArray(m.keywords) ? m.keywords : [];
    const altText = title || caption || (i === 0 ? defaultAlt : `${defaultAlt} — Image ${i + 1}`);
    const meta =
      title || caption || keywords.length > 0
        ? { title: title || null, caption: caption || null, keywords, source: "lightroom" }
        : undefined;

    const fullPath = path.join(OUT_FULL, fullName);
    const thumbPath = path.join(OUT_THUMB, thumbName);

    let dateFolder = parseDateFromFilename(fullName);
    if (!dateFolder) {
      if (!dateFallbackWarned) {
        console.warn("⚠️ Date parsed from filename failed; using today for R2 key.");
        dateFallbackWarned = true;
      }
      dateFolder = new Date().toISOString().slice(0, 10);
    }
    const fullKey = `${section}/${dateFolder}/full/${fullName}`;
    const thumbKey = `${section}/${dateFolder}/thumb/${thumbName}`;

    const [fullUrl, thumbUrl] = await Promise.all([
      uploadWebp(fullPath, fullKey),
      uploadWebp(thumbPath, thumbKey),
    ]);

    await prisma.galleryImage.create({
      data: {
        galleryId: gallery.id,
        url: fullUrl,
        thumbUrl,
        fullUrl,
        alt: altText,
        sortOrder: i + 1,
        isHero: i === 0,
        filename: fullName,
        ...(meta && { meta }),
      },
    });

    console.log(`✅ ${String(i + 1).padStart(2, "0")} saved: ${fullName}`);
  }

  if (clean) {
    for (const dir of [INCOMING_FULL, INCOMING_THUMB, OUT_FULL, OUT_THUMB]) {
      if (fs.existsSync(dir)) {
        for (const f of fs.readdirSync(dir)) {
          fs.unlinkSync(path.join(dir, f));
        }
      }
    }
    if (fs.existsSync(MANIFEST_PATH)) fs.unlinkSync(MANIFEST_PATH);
    console.log("🧹 Cleaned _in, _out folders and manifest.");
  }

  console.log("\n✅ Done. Your gallery should render on the site once you publish it and create an access code.\n");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
