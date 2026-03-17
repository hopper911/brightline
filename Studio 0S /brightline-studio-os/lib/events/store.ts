/**
 * Bright Line Studio OS – event store (SQLite)
 *
 * Persists events to data/studio.db.
 */

import { getDb } from "@/lib/db";
import { resolveWorkspaceId } from "@/lib/db/workspace";
import { assertNotDemoMode } from "@/lib/runtime/demoGuard";

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

export type AddEventInput = Omit<EventRecord, "id" | "createdAt"> & {
  projectId?: string | null;
  workspaceId?: string;
};

export function addEvent(input: AddEventInput): EventRecord {
  assertNotDemoMode("Recording events");
  const id = nextId();
  const createdAt = new Date().toISOString();
  const db = getDb();
  const wsId = resolveWorkspaceId(input.workspaceId);
  const stmt = db.prepare(
    "INSERT INTO events (id, workspace_id, room, project_id, agent_id, event_type, status, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  stmt.run(id, wsId, input.room, input.projectId ?? null, input.agent, input.type, input.status, input.summary);
  return { id, createdAt, ...input, projectId: input.projectId ?? null };
}

export function getEvents(): EventRecord[] {
  return getEventsForWorkspace(undefined);
}

export function getEventsForWorkspace(workspaceId: string | undefined): EventRecord[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const rows = db
    .prepare(
      "SELECT id, room, project_id AS projectId, agent_id AS agent, event_type AS type, status, summary, created_at AS createdAt FROM events WHERE workspace_id = ? ORDER BY created_at DESC"
    )
    .all(wsId) as { id: string; room: string; projectId: string | null; agent: string; type: string; status: string; summary: string; createdAt: string }[];
  return rows;
}

export function getEventsByProject(projectId: string): EventRecord[] {
  return getEventsByProjectForWorkspace(undefined, projectId);
}

export function getEventsByProjectForWorkspace(workspaceId: string | undefined, projectId: string): EventRecord[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const rows = db
    .prepare(
      "SELECT id, room, project_id AS projectId, agent_id AS agent, event_type AS type, status, summary, created_at AS createdAt FROM events WHERE workspace_id = ? AND project_id = ? ORDER BY created_at DESC"
    )
    .all(wsId, projectId) as { id: string; room: string; projectId: string | null; agent: string; type: string; status: string; summary: string; createdAt: string }[];
  return rows;
}
