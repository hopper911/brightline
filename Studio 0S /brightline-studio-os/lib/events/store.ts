/**
 * Bright Line Studio OS – event store (SQLite)
 *
 * Persists events to data/studio.db.
 */

import { getDb } from "@/lib/db";

export type EventRecord = {
  id: string;
  room: string;
  projectId: string | null;
  agent: string;
  type: string;
  status: string;
  summary: string;
  createdAt: string;
};

function nextId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type AddEventInput = Omit<EventRecord, "id" | "createdAt"> & { projectId?: string | null };

export function addEvent(input: AddEventInput): EventRecord {
  const id = nextId();
  const createdAt = new Date().toISOString();
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO events (id, room, project_id, agent_id, event_type, status, summary) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  stmt.run(id, input.room, input.projectId ?? null, input.agent, input.type, input.status, input.summary);
  return { id, createdAt, ...input, projectId: input.projectId ?? null };
}

export function getEvents(): EventRecord[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, room, project_id AS projectId, agent_id AS agent, event_type AS type, status, summary, created_at AS createdAt FROM events ORDER BY created_at DESC"
    )
    .all() as { id: string; room: string; projectId: string | null; agent: string; type: string; status: string; summary: string; createdAt: string }[];
  return rows;
}

export function getEventsByProject(projectId: string): EventRecord[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, room, project_id AS projectId, agent_id AS agent, event_type AS type, status, summary, created_at AS createdAt FROM events WHERE project_id = ? ORDER BY created_at DESC"
    )
    .all(projectId) as { id: string; room: string; projectId: string | null; agent: string; type: string; status: string; summary: string; createdAt: string }[];
  return rows;
}
