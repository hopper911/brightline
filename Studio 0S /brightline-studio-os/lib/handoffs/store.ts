/**
 * Bright Line Studio OS – handoff store (SQLite)
 *
 * Structured handoffs between rooms (e.g. Reception → Production).
 */

import { getDb } from "@/lib/db";

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
  const id = nextId();
  const createdAt = new Date().toISOString();
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO handoffs (id, from_room, to_room, payload_json, status) VALUES (?, ?, ?, ?, ?)"
  );
  stmt.run(id, fromRoom, toRoom, JSON.stringify(payload ?? {}), "pending");
  return { id, fromRoom, toRoom, payloadJson: JSON.stringify(payload), status: "pending", createdAt };
}

export function getRecentHandoffs(limit = 20): Handoff[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, from_room AS fromRoom, to_room AS toRoom, payload_json AS payloadJson, status, created_at AS createdAt
       FROM handoffs ORDER BY created_at DESC LIMIT ?`
    )
    .all(limit) as { id: string; fromRoom: string; toRoom: string; payloadJson: string; status: string; createdAt: string }[];
  return rows.map((r) => ({ ...r, status: r.status as Handoff["status"] }));
}

export function getPendingHandoffs(toRoom: string): Handoff[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, from_room AS fromRoom, to_room AS toRoom, payload_json AS payloadJson, status, created_at AS createdAt
       FROM handoffs WHERE to_room = ? AND status = 'pending' ORDER BY created_at DESC`
    )
    .all(toRoom) as { id: string; fromRoom: string; toRoom: string; payloadJson: string; status: string; createdAt: string }[];
  return rows.map((r) => ({ ...r, status: r.status as Handoff["status"] }));
}

export function acceptHandoff(id: string): boolean {
  const db = getDb();
  const result = db.prepare("UPDATE handoffs SET status = 'accepted' WHERE id = ? AND status = 'pending'").run(id);
  return result.changes > 0;
}

export function dismissHandoff(id: string): boolean {
  const db = getDb();
  const result = db.prepare("UPDATE handoffs SET status = 'dismissed' WHERE id = ? AND status = 'pending'").run(id);
  return result.changes > 0;
}
