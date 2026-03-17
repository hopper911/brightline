/**
 * Bright Line Studio OS – local SQLite database layer
 *
 * Purpose: Single helper for local-first storage. Opens data/studio.db,
 * applies lib/db/schema.sql on first use (idempotent), and exports
 * a shared db instance. No ORM – use plain SQL via better-sqlite3.
 *
 * Use getDb() from server-side only (e.g. API routes, server actions).
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "studio.db");
const SCHEMA_PATH = path.join(process.cwd(), "lib", "db", "schema.sql");

let db: Database.Database | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function applySchema(database: Database.Database): void {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  database.exec(schema);
}

/**
 * Returns the shared SQLite database instance. Creates data/studio.db
 * and applies schema.sql on first call. Subsequent calls return the
 * same instance.
 */
export function getDb(): Database.Database {
  if (db === null) {
    ensureDataDir();
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    applySchema(db);
  }
  return db;
}
