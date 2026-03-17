/**
 * Bright Line Studio OS – session store (SQLite)
 *
 * Tracks current room state, last action, last output. One session per room.
 */

import { getDb } from "@/lib/db";
import { resolveWorkspaceId } from "@/lib/db/workspace";

export type Session = {
  id: string;
  room: string;
  projectId: string | null;
  status: string;
  lastAction: string | null;
  lastOutput: string | null;
  createdAt: string;
};

function nextId(): string {
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type CreateSessionInput = {
  room: string;
  projectId?: string | null;
  workspaceId?: string;
};

export function createSession(input: CreateSessionInput): Session {
  const id = nextId();
  const createdAt = new Date().toISOString();
  const db = getDb();
  const wsId = resolveWorkspaceId(input.workspaceId);
  const stmt = db.prepare(
    "INSERT INTO sessions (id, workspace_id, room, project_id, status, last_action, last_output) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  stmt.run(id, wsId, input.room, input.projectId ?? null, "active", null, null);
  return {
    id,
    room: input.room,
    projectId: input.projectId ?? null,
    status: "active",
    lastAction: null,
    lastOutput: null,
    createdAt,
  };
}

export function getAllSessions(): Session[] {
  return getAllSessionsForWorkspace(undefined);
}

export function getAllSessionsForWorkspace(workspaceId: string | undefined): Session[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const rows = db
    .prepare(
      "SELECT id, room, project_id AS projectId, status, last_action AS lastAction, last_output AS lastOutput, created_at AS createdAt FROM sessions WHERE workspace_id = ? ORDER BY created_at DESC"
    )
    .all(wsId) as Session[];
  return rows;
}

export function getSession(room: string): Session | null {
  return getSessionForWorkspace(undefined, room);
}

export function getSessionForWorkspace(workspaceId: string | undefined, room: string): Session | null {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const row = db
    .prepare(
      "SELECT id, room, project_id AS projectId, status, last_action AS lastAction, last_output AS lastOutput, created_at AS createdAt FROM sessions WHERE workspace_id = ? AND room = ? ORDER BY created_at DESC LIMIT 1"
    )
    .get(wsId, room) as Session | undefined;
  return row ?? null;
}

export type UpdateSessionInput = Partial<{
  lastAction: string;
  lastOutput: string;
  projectId: string | null;
  status: string;
}>;

export function updateSession(room: string, input: UpdateSessionInput): Session | null {
  return updateSessionForWorkspace(undefined, room, input);
}

export function updateSessionForWorkspace(
  workspaceId: string | undefined,
  room: string,
  input: UpdateSessionInput
): Session | null {
  const session = getSessionForWorkspace(workspaceId, room);
  if (!session) return null;
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const updates: string[] = [];
  const values: (string | null)[] = [];
  if (input.lastAction !== undefined) {
    updates.push("last_action = ?");
    values.push(input.lastAction);
  }
  if (input.lastOutput !== undefined) {
    updates.push("last_output = ?");
    values.push(input.lastOutput);
  }
  if (input.projectId !== undefined) {
    updates.push("project_id = ?");
    values.push(input.projectId);
  }
  if (input.status !== undefined) {
    updates.push("status = ?");
    values.push(input.status);
  }
  if (updates.length === 0) return session;
  values.push(wsId, session.id);
  db.prepare(`UPDATE sessions SET ${updates.join(", ")} WHERE workspace_id = ? AND id = ?`).run(...values);
  return getSessionForWorkspace(wsId, room);
}
