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
import { randomUUID } from "crypto";
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
  // Pre-migrations for older DBs:
  // Some historical installs have tables without `workspace_id`, and `schema.sql`
  // includes indexes on `workspace_id` which would fail to apply. We add columns
  // first, then apply the full schema (tables + indexes) idempotently.

  const workspaceScopedTables = [
    "projects",
    "room_settings",
    "sessions",
    "events",
    "approvals",
    "drafts",
    "handoffs",
    "invoices",
    "expenses",
    "payments",
    "summaries",
    "reminders",
    "jobs",
  ] as const;

  for (const table of workspaceScopedTables) {
    try {
      database.exec(`ALTER TABLE ${table} ADD COLUMN workspace_id TEXT`);
    } catch {
      /* table/column may not exist yet */
    }
  }

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
  const projectCols = [
    "urgency",
    "client_type",
    "stage",
    "project_size",
    "timeline_json",
    "notes",
    "deliverables",
    "visual_direction",
    "checklist",
    "total_price",
    "deposit_amount",
    "amount_paid",
    "balance_remaining",
    "payment_status",
    "updated_at",
  ];
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

  // Apply schema.sql (tables + indexes + seeds) after pre-migrations.
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  database.exec(schema);

  // Monetization foundations (idempotent for existing DBs)
  try {
    database.exec(
      "CREATE TABLE IF NOT EXISTS plans (id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL, limits_json TEXT NOT NULL)"
    );
    database.exec(
      `INSERT OR IGNORE INTO plans (id, name, price, limits_json) VALUES
        ('starter', 'Starter', 0, '{"automation":false,"advancedAgents":false,"analytics":false}'),
        ('pro', 'Pro', 2900, '{"automation":true,"advancedAgents":true,"analytics":true}')`
    );
  } catch {
    /* table/seed may already exist */
  }
  try {
    database.exec("ALTER TABLE workspaces ADD COLUMN plan_id TEXT");
  } catch {
    /* column may already exist */
  }
  try {
    database.exec("UPDATE workspaces SET plan_id = 'starter' WHERE plan_id IS NULL OR plan_id = ''");
  } catch {
    /* ignore */
  }

  // Ensure foundational tables exist for older DBs (schema.sql is source-of-truth)
  try {
    database.exec(
      "CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_id TEXT NOT NULL, plan_id TEXT NOT NULL DEFAULT 'starter', created_at TEXT DEFAULT CURRENT_TIMESTAMP)"
    );
  } catch {
    /* table may already exist */
  }
  try {
    database.exec(
      "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL, role TEXT NOT NULL, workspace_id TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)"
    );
    database.exec("CREATE INDEX IF NOT EXISTS idx_users_workspace_id ON users(workspace_id)");
    database.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_workspace ON users(email, workspace_id)");
  } catch {
    /* table/index may already exist */
  }
  try {
    database.exec(
      "CREATE TABLE IF NOT EXISTS workspace_profile (workspace_id TEXT PRIMARY KEY, business_type TEXT, services_offered_json TEXT, main_location TEXT, style_focus_json TEXT, goals_json TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)"
    );
  } catch {
    /* table may already exist */
  }
  try {
    database.exec(
      "CREATE TABLE IF NOT EXISTS workspace_settings (workspace_id TEXT PRIMARY KEY, ai_mode TEXT NOT NULL DEFAULT 'local', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)"
    );
  } catch {
    /* table may already exist */
  }
  try {
    database.exec(
      "CREATE TABLE IF NOT EXISTS plan_limits (workspace_id TEXT PRIMARY KEY, plan TEXT NOT NULL DEFAULT 'free', max_projects INTEGER NOT NULL DEFAULT 10, max_drafts INTEGER NOT NULL DEFAULT 200, max_active_automations INTEGER NOT NULL DEFAULT 3, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)"
    );
  } catch {
    /* table may already exist */
  }
  try {
    database.exec(
      "CREATE TABLE IF NOT EXISTS usage_events (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, user_id TEXT NOT NULL, event_type TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, meta_json TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)"
    );
    database.exec(
      "CREATE INDEX IF NOT EXISTS idx_usage_events_workspace_id_created_at ON usage_events(workspace_id, created_at)"
    );
  } catch {
    /* table/index may already exist */
  }

  // Bootstrap default workspace/user for existing installs and backfill workspace_id.
  let defaultWorkspaceId: string | null = null;
  let defaultUserId: string | null = null;
  try {
    const row = database.prepare("SELECT id, owner_id AS ownerId FROM workspaces ORDER BY created_at ASC LIMIT 1").get() as
      | { id: string; ownerId: string }
      | undefined;
    if (row?.id) {
      defaultWorkspaceId = row.id;
      defaultUserId = row.ownerId;
    }
  } catch {
    /* ignore */
  }

  if (!defaultWorkspaceId || !defaultUserId) {
    defaultWorkspaceId = `ws-${randomUUID()}`;
    defaultUserId = `usr-${randomUUID()}`;
    const now = new Date().toISOString();
    try {
      database
        .prepare("INSERT INTO workspaces (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)")
        .run(defaultWorkspaceId, "Default Workspace", defaultUserId, now);
    } catch {
      /* may already exist */
    }
    try {
      database
        .prepare("INSERT INTO users (id, email, role, workspace_id, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(defaultUserId, "owner@local", "owner", defaultWorkspaceId, now);
    } catch {
      /* may already exist */
    }
    try {
      database
        .prepare("INSERT OR IGNORE INTO workspace_settings (workspace_id, ai_mode, created_at, updated_at) VALUES (?, ?, ?, ?)")
        .run(defaultWorkspaceId, "local", now, now);
    } catch {
      /* ignore */
    }
    try {
      database
        .prepare(
          "INSERT OR IGNORE INTO plan_limits (workspace_id, plan, max_projects, max_drafts, max_active_automations, created_at, updated_at) VALUES (?, 'free', 10, 200, 3, ?, ?)"
        )
        .run(defaultWorkspaceId, now, now);
    } catch {
      /* ignore */
    }
  }

  // Backfill workspace_id on older rows (track-only; does not change semantics).
  const backfillTables = [
    "projects",
    "room_settings",
    "sessions",
    "events",
    "approvals",
    "drafts",
    "handoffs",
    "invoices",
    "expenses",
    "payments",
    "summaries",
    "reminders",
    "jobs",
  ] as const;
  for (const table of backfillTables) {
    try {
      database.exec(
        `UPDATE ${table} SET workspace_id = '${defaultWorkspaceId}' WHERE workspace_id IS NULL OR workspace_id = ''`
      );
    } catch {
      /* table may not exist in some older DBs */
    }
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
