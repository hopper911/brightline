/**
 * Bright Line Studio OS – handoff store (SQLite)
 *
 * Structured handoffs between rooms (e.g. Reception → Production).
 */

import { getDb } from "@/lib/db";
import { resolveWorkspaceId } from "@/lib/db/workspace";

export type Handoff = {
  id: string;
  fromRoom: string;
  toRoom: string;
  payloadJson: string;
  status: "pending" | "accepted" | "dismissed";
  createdAt: string;
};

export type ReceptionHandoffPayload = {
  projectName: string;
  client: string;
  type: string;
  summary: string;
  inquirySnippet: string;
};

function nextId(): string {
  return `handoff-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createHandoff(fromRoom: string, toRoom: string, payload: unknown): Handoff {
  return createHandoffForWorkspace(undefined, fromRoom, toRoom, payload);
}

export function createHandoffForWorkspace(
  workspaceId: string | undefined,
  fromRoom: string,
  toRoom: string,
  payload: unknown
): Handoff {
  const id = nextId();
  const createdAt = new Date().toISOString();
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const stmt = db.prepare(
    "INSERT INTO handoffs (id, workspace_id, from_room, to_room, payload_json, status) VALUES (?, ?, ?, ?, ?, ?)"
  );
  stmt.run(id, wsId, fromRoom, toRoom, JSON.stringify(payload ?? {}), "pending");
  return { id, fromRoom, toRoom, payloadJson: JSON.stringify(payload), status: "pending", createdAt };
}

export function getRecentHandoffs(limit = 20): Handoff[] {
  return getRecentHandoffsForWorkspace(undefined, limit);
}

export function getRecentHandoffsForWorkspace(workspaceId: string | undefined, limit = 20): Handoff[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const rows = db
    .prepare(
      `SELECT id, from_room AS fromRoom, to_room AS toRoom, payload_json AS payloadJson, status, created_at AS createdAt
       FROM handoffs WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(wsId, limit) as { id: string; fromRoom: string; toRoom: string; payloadJson: string; status: string; createdAt: string }[];
  return rows.map((r) => ({ ...r, status: r.status as Handoff["status"] }));
}

export function getPendingHandoffs(toRoom: string): Handoff[] {
  return getPendingHandoffsForWorkspace(undefined, toRoom);
}

export function getPendingHandoffsForWorkspace(workspaceId: string | undefined, toRoom: string): Handoff[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const rows = db
    .prepare(
      `SELECT id, from_room AS fromRoom, to_room AS toRoom, payload_json AS payloadJson, status, created_at AS createdAt
       FROM handoffs WHERE workspace_id = ? AND to_room = ? AND status = 'pending' ORDER BY created_at DESC`
    )
    .all(wsId, toRoom) as { id: string; fromRoom: string; toRoom: string; payloadJson: string; status: string; createdAt: string }[];
  return rows.map((r) => ({ ...r, status: r.status as Handoff["status"] }));
}

export function acceptHandoff(id: string): boolean {
  return acceptHandoffForWorkspace(undefined, id);
}

export function acceptHandoffForWorkspace(workspaceId: string | undefined, id: string): boolean {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const result = db
    .prepare("UPDATE handoffs SET status = 'accepted' WHERE workspace_id = ? AND id = ? AND status = 'pending'")
    .run(wsId, id);
  return result.changes > 0;
}

export function dismissHandoff(id: string): boolean {
  return dismissHandoffForWorkspace(undefined, id);
}

export function dismissHandoffForWorkspace(workspaceId: string | undefined, id: string): boolean {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const result = db
    .prepare("UPDATE handoffs SET status = 'dismissed' WHERE workspace_id = ? AND id = ? AND status = 'pending'")
    .run(wsId, id);
  return result.changes > 0;
}
