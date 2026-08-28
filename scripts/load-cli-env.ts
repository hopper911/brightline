/**
 * Load the same env precedence as Next.js dev: `.env`, then `.env.local`, then
 * `.env.development.local` (each overriding the previous). Prisma CLI/tsx only
 * reads `.env` by default, which breaks scripts when DATABASE_URL lives in `.env.local`.
 *
 * Import this file before `@/lib/prisma` (or any code that reads DATABASE_URL).
 */
import path from "node:path";
import dotenv from "dotenv";

const root = process.cwd();

if (process.env.BRIGHTLINE_ENV === "production") {
  // Match scripts/prisma-with-local-env.mjs (db:migrate) so CLI tools hit the same database.
  dotenv.config({ path: path.join(root, ".env") });
  dotenv.config({ path: path.join(root, ".env.local"), override: true });
  dotenv.config({ path: path.join(root, ".env.production.local"), override: true });
} else {
  dotenv.config({ path: path.join(root, ".env") });
  dotenv.config({ path: path.join(root, ".env.local"), override: true });
  dotenv.config({ path: path.join(root, ".env.development.local"), override: true });
}
