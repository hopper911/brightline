-- Bright Line Studio OS – local SQLite schema
--
-- Purpose: Defines tables for projects, sessions, events,
-- approvals, drafts, and handoffs. All tables use TEXT primary keys.
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS).

-- SaaS foundations: workspaces + users (local-first)
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  plan_id TEXT NOT NULL DEFAULT 'starter',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Monetization foundations: plans + entitlements (billing-provider-agnostic)
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  limits_json TEXT NOT NULL
);

-- Default plans (idempotent)
INSERT OR IGNORE INTO plans (id, name, price, limits_json) VALUES
  ('starter', 'Starter', 0, '{"automation":false,"advancedAgents":false,"analytics":false}'),
  ('pro', 'Pro', 2900, '{"automation":true,"advancedAgents":true,"analytics":true}');

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_workspace_id ON users(workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_workspace ON users(email, workspace_id);

CREATE TABLE IF NOT EXISTS workspace_profile (
  workspace_id TEXT PRIMARY KEY,
  business_type TEXT,
  services_offered_json TEXT,
  main_location TEXT,
  style_focus_json TEXT,
  goals_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_settings (
  workspace_id TEXT PRIMARY KEY,
  ai_mode TEXT NOT NULL DEFAULT 'local',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plan_limits (
  workspace_id TEXT PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'free',
  max_projects INTEGER NOT NULL DEFAULT 10,
  max_drafts INTEGER NOT NULL DEFAULT 200,
  max_active_automations INTEGER NOT NULL DEFAULT 3,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usage_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  meta_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_events_workspace_id_created_at
ON usage_events(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  client TEXT,
  type TEXT,
  urgency TEXT,
  client_type TEXT,
  stage TEXT,
  project_size TEXT,
  timeline_json TEXT,
  location TEXT,
  shoot_date TEXT,
  status TEXT,
  notes TEXT,
  deliverables TEXT,
  visual_direction TEXT,
  checklist TEXT,
  folder_path TEXT,
  delivery_state TEXT,
  content_state TEXT,
  total_price REAL,
  deposit_amount REAL,
  amount_paid REAL,
  balance_remaining REAL,
  payment_status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_workspace_id_updated_at
ON projects(workspace_id, updated_at);

CREATE TABLE IF NOT EXISTS room_settings (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  room TEXT NOT NULL,
  project_id TEXT,
  assist_mode TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_room_settings_room_project
ON room_settings(room, project_id);

CREATE INDEX IF NOT EXISTS idx_room_settings_workspace_id
ON room_settings(workspace_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  room TEXT NOT NULL,
  project_id TEXT,
  status TEXT,
  last_action TEXT,
  last_output TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_workspace_id_created_at
ON sessions(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  room TEXT NOT NULL,
  project_id TEXT,
  agent_id TEXT,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_workspace_id_created_at
ON events(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  room TEXT NOT NULL,
  project_id TEXT,
  status TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approvals_workspace_id_created_at
ON approvals(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  project_id TEXT,
  room TEXT NOT NULL,
  draft_type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_drafts_workspace_id_created_at
ON drafts(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS handoffs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  from_room TEXT NOT NULL,
  to_room TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_handoffs_workspace_id_created_at
ON handoffs(workspace_id, created_at);

-- Finance (read/track only; no bank connection, no auto-send)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  project_id TEXT,
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  due_date TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoices_workspace_id_created_at
ON invoices(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  project_id TEXT,
  category TEXT,
  amount REAL NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_workspace_id_created_at
ON expenses(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  project_id TEXT,
  amount REAL NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_workspace_id_created_at
ON payments(workspace_id, created_at);

-- Stored strategy summaries (daily/weekly; read-only output)
CREATE TABLE IF NOT EXISTS summaries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_summaries_workspace_id_created_at
ON summaries(workspace_id, created_at);

-- Client reminders (local-only; created via approval-driven automation)
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  project_id TEXT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reminders_workspace_id_due_date
ON reminders(workspace_id, due_date);

-- Safe background jobs (no automation; summaries and reminders only)
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_for TEXT NOT NULL,
  last_run_at TEXT,
  result_summary TEXT,
  project_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_workspace_id_updated_at
ON jobs(workspace_id, updated_at);
