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
  // Add session columns for existing DBs
  try {
    database.exec("ALTER TABLE sessions ADD COLUMN last_action TEXT");
  } catch {
    /* column may already exist */
  }
  try {
    database.exec("ALTER TABLE sessions ADD COLUMN last_output TEXT");
  } catch {
    /* column may already exist */
  }
  const projectCols = ["notes", "deliverables", "visual_direction", "checklist", "updated_at"];
  for (const col of projectCols) {
    try {
      database.exec(`ALTER TABLE projects ADD COLUMN ${col} TEXT`);
    } catch {
      /* column may already exist */
    }
  }
  try {
    database.exec("ALTER TABLE events ADD COLUMN project_id TEXT");
  } catch {
    /* column may already exist */
  }
  const archiveCols = ["folder_path", "delivery_state", "content_state"];
  for (const col of archiveCols) {
    try {
      database.exec(`ALTER TABLE projects ADD COLUMN ${col} TEXT`);
    } catch {
      /* column may already exist */
    }
  }
  try {
    database.exec("ALTER TABLE approvals ADD COLUMN project_id TEXT");
  } catch {
    /* column may already exist */
  }
  // Jobs table (safe background summaries/reminders)
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        job_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        scheduled_for TEXT NOT NULL,
        last_run_at TEXT,
        result_summary TEXT,
        project_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch {
    /* table may already exist */
  }
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
