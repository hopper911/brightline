#!/usr/bin/env node
/**
 * Verification script for R2 Browser authorization fix.
 * Calls listObjects with portfolio/cam/web_full (Campaign & Advertising pillar).
 * Pass: returns keys array (or empty). Fail: throws "Invalid character in header content".
 */
import "dotenv/config";
import { config } from "dotenv";
import { resolve } from "path";

// Load env files in same order as Next.js dev
const envFiles = [".env.local", ".env.development.local", ".env"];
for (const f of envFiles) {
  config({ path: resolve(process.cwd(), f) });
}

const { listObjects } = await import("../lib/storage-r2.ts");

const prefix = "portfolio/cam/web_full/";
console.log(`[verify-r2-browser] Calling listObjects with prefix: ${prefix}`);

try {
  const keys = await listObjects({ prefix, maxKeys: 50 });
  console.log(`[verify-r2-browser] SUCCESS: listed ${keys.length} keys`);
  if (keys.length > 0) {
    console.log(`[verify-r2-browser] Sample keys: ${keys.slice(0, 3).join(", ")}`);
  }
  process.exit(0);
} catch (err) {
  console.error(`[verify-r2-browser] FAILED:`, err.message);
  if (err.message?.includes("Invalid character in header")) {
    console.error("[verify-r2-browser] Authorization header error - credential normalization may not be applied.");
  }
  process.exit(1);
}
