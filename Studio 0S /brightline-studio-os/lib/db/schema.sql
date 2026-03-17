-- Bright Line Studio OS – local SQLite schema
--
-- Purpose: Defines tables for projects, sessions, events,
-- approvals, drafts, and handoffs. All tables use TEXT primary keys.
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client TEXT,
  type TEXT,
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
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  room TEXT NOT NULL,
  project_id TEXT,
  status TEXT,
  last_action TEXT,
  last_output TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  room TEXT NOT NULL,
  project_id TEXT,
  agent_id TEXT,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  room TEXT NOT NULL,
  project_id TEXT,
  status TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  room TEXT NOT NULL,
  draft_type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS handoffs (
  id TEXT PRIMARY KEY,
  from_room TEXT NOT NULL,
  to_room TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Safe background jobs (no automation; summaries and reminders only)
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
);
