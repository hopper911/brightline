#!/usr/bin/env node
/**
 * Delete objects from R2 by key.
 * Uses .env in tools dir (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT).
 *
 * Usage:
 *   node delete-from-r2.mjs [--with-thumb] <key> [key ...]
 *
 * --with-thumb  For each full key (web_full), also delete the derived web_thumb.
 *
 * Examples:
 *   node delete-from-r2.mjs portfolio/cam/web_full/bl-cam-20260227-001.jpg
 *   node delete-from-r2.mjs --with-thumb portfolio/cam/web_full/bl-cam-20260227-001.jpg
 */
import "dotenv/config";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.R2_BUCKET;
const ENDPOINT = process.env.R2_ENDPOINT;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;

if (!BUCKET || !ENDPOINT || !ACCESS_KEY || !SECRET_KEY) {
  console.error("Missing R2 env vars. Set R2_BUCKET, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: ENDPOINT,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

const args = process.argv.slice(2);
const withThumb = args.includes("--with-thumb");
const keys = args.filter((k) => k && k !== "--with-thumb");

if (keys.length === 0) {
  console.error("Usage: node delete-from-r2.mjs [--with-thumb] <key> [key ...]");
  process.exit(1);
}

function deriveThumbKey(fullKey) {
  const k = fullKey.replace(/^\/+/, "");
  const withThumbSegment = k.replace("/web_full/", "/web_thumb/");
  const noExt = withThumbSegment.replace(/\.[^/.]+$/, "");
  return `${noExt}.webp`;
}

const toDelete = new Set(keys);
if (withThumb) {
  for (const k of keys) {
    if (k.includes("/web_full/")) toDelete.add(deriveThumbKey(k));
  }
}

for (const key of toDelete) {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    console.log(`Deleted: ${key}`);
  } catch (err) {
    console.error(`Failed ${key}:`, err.message);
  }
}
