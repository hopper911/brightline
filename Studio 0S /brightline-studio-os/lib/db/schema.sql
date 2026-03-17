-- Bright Line Studio OS – local SQLite schema
--
-- Purpose: Defines the Phase 1 tables for projects, sessions, events,
-- approvals, and drafts. All tables use TEXT primary keys for simple
-- ID generation (e.g. nanoid or uuid). Safe to run multiple times
-- (CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client TEXT,
  type TEXT,
  location TEXT,
  shoot_date TEXT,
  status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  room TEXT NOT NULL,
  project_id TEXT,
  status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  room TEXT NOT NULL,
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
