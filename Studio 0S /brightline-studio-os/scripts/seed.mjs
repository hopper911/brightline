#!/usr/bin/env node
/**
 * Seed Bright Line Studio OS SQLite DB with sample data.
 * Run after db:init. Usage: npm run db:seed (or node scripts/seed.mjs)
 */
import { mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dataDir = join(root, "data");
const dbPath = join(dataDir, "studio.db");
const schemaPath = join(root, "lib", "db", "schema.sql");

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
const db = new Database(dbPath);
const schema = readFileSync(schemaPath, "utf-8");
// Drop tables so schema matches current definition (handles old DBs missing columns)
db.exec("DROP TABLE IF EXISTS handoffs; DROP TABLE IF EXISTS drafts; DROP TABLE IF EXISTS approvals; DROP TABLE IF EXISTS events; DROP TABLE IF EXISTS sessions; DROP TABLE IF EXISTS projects;");
db.exec(schema);

const ins = db.transaction(() => {
  const insProj = db.prepare(
    "INSERT OR IGNORE INTO projects (id, name, client, type, location, shoot_date, status, notes, deliverables, visual_direction, checklist, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
  );
  const insEvent = db.prepare(
    "INSERT OR IGNORE INTO events (id, room, project_id, agent_id, event_type, status, summary) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const insSess = db.prepare(
    "INSERT OR IGNORE INTO sessions (id, room, project_id, status) VALUES (?, ?, ?, ?)"
  );
  const insDraft = db.prepare(
    "INSERT OR IGNORE INTO drafts (id, project_id, room, draft_type, content) VALUES (?, ?, ?, ?, ?)"
  );

  insProj.run("proj-1", "Acme Brand Shoot", "Acme Corp", "brand", "Studio A", "2025-04-01", "booked", null, null, null, null);
  insProj.run("proj-2", "Portrait – Jane Doe", "Jane Doe", "portrait", "Outdoor", "2025-04-05", "editing", null, null, null, null);
  insProj.run("proj-3", "Editorial Fall 2025", "Magazine X", "editorial", "Studio B", "2025-04-10", "lead", null, null, null, null);

  insEvent.run("evt-1", "reception", "proj-1", "Concierge Agent", "lead_created", "done", "New lead: Acme Corp enquiry");
  insEvent.run("evt-2", "production", "proj-1", "Producer Agent", "shoot_scheduled", "done", "Acme shoot booked for Apr 1");
  insEvent.run("evt-3", "editing", "proj-2", "Editing Agent", "cull_started", "done", "Culling started for Portrait – Jane");
  insEvent.run("evt-4", "marketing", "proj-3", null, "content_queued", "pending", "Editorial Fall added to content queue");
  insEvent.run("evt-5", "delivery", "proj-1", null, "gallery_sent", "done", "Gallery link sent for Acme Brand Shoot");

  insSess.run("sess-1", "main-studio", "proj-1", "completed");
  insSess.run("sess-2", "editing", "proj-2", "active");

  insDraft.run("draft-1", "proj-1", "delivery", "delivery_email", "Hi, your gallery is ready: [link]. Best, Studio");
  insDraft.run("draft-2", "proj-3", "marketing", "caption", "Behind the scenes – Fall 2025 editorial. Shot in Studio B.");
});

ins();
db.close();
console.log("Seed complete: 3 projects, 5 events, 2 sessions, 2 drafts.");
