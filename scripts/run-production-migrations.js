#!/usr/bin/env node
/**
 * Runs Prisma migrations in production. Exits with code 1 if DATABASE_URL
 * is missing or if migrations fail. Use before deployment builds.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- Node script, require needed */
const { execSync } = require("child_process");

if (!process.env.DATABASE_URL) {
  console.error("Migration failed. Deployment halted.");
  console.error("DATABASE_URL environment variable is not set.");
  process.exit(1);
}

try {
  console.log("Applying migration...");
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: process.env,
  });
  console.log("Migration applied successfully.");
} catch {
  console.error("Migration failed. Deployment halted.");
  process.exit(1);
}
