#!/usr/bin/env node
/**
 * Upload already-prepared files from _published/jpg and _published/webp to R2, then update DB.
 * Run this after tools/upload-from-sheet.mjs has filled _published.
 * Usage: node scripts/upload-published.mjs --root /path/to/Exports
 */
import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

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
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function must(v, label) {
  if (!v) {
    console.error(`❌ Missing ${label}`);
    process.exit(1);
  }
  return v;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const IMAGE_EXT = /\.(jpe?g|png|webp|tif|tiff)$/i;

/** List image files under dir recursively; returns paths relative to dir (with / separators). */
function listFilesRecursive(dir, baseDir = dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      out.push(...listFilesRecursive(full, baseDir));
    } else if (stat.isFile() && IMAGE_EXT.test(name)) {
      const rel = path.relative(baseDir, full).replace(/\\/g, "/");
      out.push({ full, rel });
    }
  }
  return out;
}

/** Parse key "csp/2-0v8/00.webp" -> { section, client, seq } */
function parseKey(key) {
  const parts = key.replace(/\\/g, "/").split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "";
  const dot = last.lastIndexOf(".");
  const seq = dot >= 0 ? last.slice(0, dot) : last;
  return { section: parts[0] || "", client: parts[1] || "", seq };
}

async function main() {
  const rootRaw = getArg("root");
  if (!rootRaw) {
    console.error("❌ --root path to Exports folder is required.");
    process.exit(1);
  }
  const root = path.resolve(rootRaw);
  const publishedJpgDir = path.join(root, "_published", "jpg");
  const publishedWebpDir = path.join(root, "_published", "webp");
  const publishedThumbDir = path.join(root, "_published", "thumb");

  const dbOnly = hasFlag("db-only");
  if (!fs.existsSync(publishedJpgDir) && !fs.existsSync(publishedWebpDir)) {
    console.error("❌ No _published/jpg or _published/webp found. Run the prepare step first (tools/upload-from-sheet.mjs).");
    process.exit(1);
  }

  const PUBLIC_URL = must(process.env.R2_PUBLIC_URL, "R2_PUBLIC_URL").replace(/\/$/, "");
  let s3Client = null;
  let BUCKET = "";
  if (!dbOnly) {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    BUCKET = must(process.env.R2_BUCKET, "R2_BUCKET").replace(/\/$/, "");
    must(process.env.R2_ACCESS_KEY_ID, "R2_ACCESS_KEY_ID");
    must(process.env.R2_SECRET_ACCESS_KEY, "R2_SECRET_ACCESS_KEY");
    must(process.env.R2_ENDPOINT, "R2_ENDPOINT");
    s3Client = { S3Client: new S3Client({
      region: process.env.R2_REGION || "auto",
      endpoint: process.env.R2_ENDPOINT?.replace(/\/$/, ""),
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    }), PutObjectCommand };
  }

  const jpgFiles = listFilesRecursive(publishedJpgDir);
  const webpFiles = listFilesRecursive(publishedWebpDir);
  const thumbFiles = listFilesRecursive(publishedThumbDir);
  const thumbRels = new Set(thumbFiles.map((f) => f.rel));
  const total = jpgFiles.length + webpFiles.length + thumbFiles.length;

  let manifestByKey = new Map();
  const manifestPath = path.join(root, "_published", "manifest.json");
  if (fs.existsSync(manifestPath)) {
    try {
      const manifestData = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const items = manifestData.items || [];
      for (const item of items) {
        if (item.r2Webp) manifestByKey.set(item.r2Webp, item);
      }
    } catch (e) {
      console.warn("  Could not load manifest.json:", e.message);
    }
  }

  if (total === 0) {
    console.log("No files in _published/jpg or _published/webp. Nothing to do.");
    await prisma.$disconnect();
    return;
  }

  if (dbOnly) {
    console.log(`\n📋 DB-only: syncing ${webpFiles.length} image(s) to database (R2 already uploaded from tools).\n`);
  } else {
    console.log(`\n☁️  Uploading ${total} file(s) from _published to R2\n`);
    async function uploadOne(filePath, key, contentType) {
      const body = fs.readFileSync(filePath);
      await s3Client.S3Client.send(
        new s3Client.PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        })
      );
      return `${PUBLIC_URL}/${key}`;
    }
    for (const { full, rel } of jpgFiles) {
      process.stdout.write(`  ${rel} ... `);
      await uploadOne(full, rel, "image/jpeg");
      console.log("OK");
    }
    for (const { full, rel } of webpFiles) {
      process.stdout.write(`  ${rel} ... `);
      await uploadOne(full, rel, "image/webp");
      console.log("OK");
    }
    for (const { full, rel } of thumbFiles) {
      const key = `thumb/${rel}`;
      process.stdout.write(`  ${key} ... `);
      await uploadOne(full, key, "image/webp");
      console.log("OK");
    }
  }

  // Group webp keys by gallery (section-client), then upsert Gallery + GalleryImage
  const byGallery = new Map();
  for (const { rel } of webpFiles) {
    const { section, client } = parseKey(rel);
    if (!section || !client || section.startsWith(".") || client.startsWith(".")) continue;
    const slug = `${section}-${client}`;
    if (!byGallery.has(slug)) byGallery.set(slug, []);
    byGallery.get(slug).push(rel);
  }

  for (const [slug, keys] of byGallery) {
    keys.sort((a, b) => {
      const pa = parseKey(a);
      const pb = parseKey(b);
      return String(pa.seq).localeCompare(String(pb.seq), undefined, { numeric: true });
    });
    const gallery = await prisma.gallery.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        title: slug.replace(/-/g, " / "),
        description: null,
        published: false,
      },
    });
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const fullUrl = `${PUBLIC_URL}/${key}`;
      const thumbUrl = thumbRels.has(key) ? `${PUBLIC_URL}/thumb/${key}` : fullUrl;
      const { seq } = parseKey(key);
      const sortOrder = parseInt(seq, 10) >= 0 ? parseInt(seq, 10) + 1 : i + 1;
      const manifestEntry = manifestByKey.get(key);
      const alt = manifestEntry?.alt?.trim() || `${slug.replace(/-/g, " ")} ${seq}`;
      const isHero = manifestEntry?.isHero ?? i === 0;
      const meta =
        manifestEntry &&
        (manifestEntry.caption ||
          (manifestEntry.tags && manifestEntry.tags.length) ||
          manifestEntry.usageType ||
          manifestEntry.licenseExpiration != null ||
          manifestEntry.licenseFee != null ||
          manifestEntry.resellAllowed != null)
          ? {
              ...(manifestEntry.caption && { caption: manifestEntry.caption }),
              ...(manifestEntry.tags?.length && { keywords: manifestEntry.tags }),
              ...(manifestEntry.usageType && { usageType: manifestEntry.usageType }),
              ...(manifestEntry.licenseExpiration && { licenseExpiration: manifestEntry.licenseExpiration }),
              ...(manifestEntry.licenseFee != null && manifestEntry.licenseFee !== "" && { licenseFee: manifestEntry.licenseFee }),
              ...(manifestEntry.resellAllowed != null && { resellAllowed: manifestEntry.resellAllowed }),
            }
          : undefined;
      const existing = await prisma.galleryImage.findFirst({
        where: { galleryId: gallery.id, storageKey: key },
      });
      if (!existing) {
        await prisma.galleryImage.create({
          data: {
            galleryId: gallery.id,
            url: fullUrl,
            fullUrl,
            thumbUrl,
            alt,
            filename: path.basename(key),
            sortOrder,
            isHero,
            storageKey: key,
            ...(meta && Object.keys(meta).length > 0 && { meta }),
          },
        });
      }
    }
    console.log(`  DB: gallery ${slug} (${keys.length} image(s))`);
  }

  // Move uploaded files to _archive so they are not re-uploaded and _published stays clean
  const archiveDir = path.join(root, "_archive");
  ensureDir(archiveDir);
  const archiveJpgDir = path.join(archiveDir, "jpg");
  const archiveWebpDir = path.join(archiveDir, "webp");
  const archiveThumbDir = path.join(archiveDir, "thumb");
  let archived = 0;
  for (const { full, rel } of jpgFiles) {
    const dest = path.join(archiveJpgDir, rel);
    ensureDir(path.dirname(dest));
    try {
      fs.renameSync(full, dest);
      archived++;
    } catch (e) {
      try {
        fs.copyFileSync(full, dest);
        fs.unlinkSync(full);
        archived++;
      } catch (e2) {
        console.warn(`  Could not archive ${rel}: ${e2.message}`);
      }
    }
  }
  for (const { full, rel } of webpFiles) {
    const dest = path.join(archiveWebpDir, rel);
    ensureDir(path.dirname(dest));
    try {
      fs.renameSync(full, dest);
      archived++;
    } catch (e) {
      try {
        fs.copyFileSync(full, dest);
        fs.unlinkSync(full);
        archived++;
      } catch (e2) {
        console.warn(`  Could not archive ${rel}: ${e2.message}`);
      }
    }
  }
  for (const { full, rel } of thumbFiles) {
    const dest = path.join(archiveThumbDir, rel);
    ensureDir(path.dirname(dest));
    try {
      fs.renameSync(full, dest);
      archived++;
    } catch (e) {
      try {
        fs.copyFileSync(full, dest);
        fs.unlinkSync(full);
        archived++;
      } catch (e2) {
        console.warn(`  Could not archive thumb/${rel}: ${e2.message}`);
      }
    }
  }
  if (archived > 0) {
    console.log(`  Archived ${archived} file(s) to _archive/jpg, _archive/webp, and _archive/thumb.`);
  }

  console.log("\n✅ Done. Files are on R2 and DB is updated. Create an access code for the gallery to view on the site.\n");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
